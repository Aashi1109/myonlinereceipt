# 100 MiB Browser File Processing Plan

## Summary and fixed decisions

- Establish `100 MiB = 104,857,600 bytes` as the hard platform ceiling for an individual file, combined job input, and combined generated output.
- Lower safety limits remain authoritative:
  - Images: 25 MiB each, 100 MiB combined, 50 files, 100 megapixels.
  - PDF viewing and inspection: 100 MiB.
  - `pdf-lib` transformations: 50 MiB combined until a disk-backed PDF engine replaces `pdf-lib`.
  - Editable pasted/text content: retain the existing 2,000,000-character guard.
- Files above the editable threshold enter large-file mode: manual processing, bounded read-only preview, and no full editor/tree/form.
- Target current Chrome/Edge, Firefox, and Safari through workers, streams, and OPFS.
- Add large-file import first to JSON and streamable CSV tools. Other text tools retain current behaviour.
- Use existing dependencies and native browser APIs. Do not add DuckDB, SQLite, ffmpeg, service-worker download machinery, `SharedArrayBuffer`, or new worker pools.

## Contract and data-flow changes

- Replace the `ArrayBuffer` input boundary:
  - `ToolRunFile` becomes `{ id, source: File, name, mime, size }`.
  - Worker messages carry `ToolRunFile[]` directly; request transferables become empty.
  - Remove `WorkerInputFile`, its duplicate metadata wrapper, `toRunFile`, and input-buffer transfer logic.
  - Worker validation trusts `source.size`, reads only a bounded prefix with `source.slice()` for signature detection, and enforces individual plus aggregate limits before processing.
  - Hooks receive File-backed metadata synchronously; remove `useRunFiles` and every main-thread `file.arrayBuffer()` used to prepare hooks or workers.
- Extend `ToolInputSpec`:
  - File inputs gain `maxTotalBytes`.
  - Text `acceptFiles` gains `maxEditableBytes`.
  - Missing limits default to the platform ceiling; declared limits are clamped to it.
  - Files at or below `maxEditableBytes` may be decoded into the editor. Larger accepted files stay as `File` objects.
- Replace buffer-based outputs with artifacts:
  - `ToolArtifact` becomes a discriminated union for small text, bounded Blob fallback, or OPFS metadata.
  - Remove `WorkerOutputFile.buffer` and result transferables.
  - `ToolRunContext` gains `writeArtifact({ name, mime, source })`, accepting a `Blob`, `Uint8Array`, or `ReadableStream<Uint8Array>`.
  - The writer sanitizes names, validates MIME, writes incrementally to `smarttools/jobs/<jobId>/<artifactId>`, checks partial writes, and rejects the job before aggregate output exceeds 100 MiB.
  - If OPFS is unavailable, allow a Blob fallback only while the entire job output remains at or below 16 MiB; otherwise return a recoverable storage error.
- Artifact lifecycle:
  - Successful artifacts remain until result reset, replacement, or workspace unmount.
  - Failed and canceled jobs delete their directory.
  - Revoke every object URL before deleting its artifact.
  - Sweep job directories older than 24 hours on application startup.
  - Treat `navigator.storage.estimate()` as an early warning only; actual write failures remain authoritative.
- Cancellation:
  - Post the cancel message and abort streams first.
  - Worker cleanup closes handles and deletes partial artifacts in `finally`.
  - Force-terminate after a one-second watchdog if no cancellation acknowledgement arrives, then retry cleanup from the main thread.
  - Throttle progress messages to at most one every 100 ms.

## Implementation changes

### Shared workspaces and rendering

- File selection stores the original `File` without reading it.
- Large-file mode is always manual, even for tools normally configured as live.
- Show filename, byte size, large-file status, Replace, Remove, Run, and Cancel.
- Load at most the first 256 KiB for a read-only text/code preview; never mount CodeMirror with the complete large file.
- Editing a small imported file clears its File source and continues as ordinary text input so the edited text is unambiguous.
- `ResultView` resolves OPFS artifacts asynchronously to File-backed object URLs and keeps current copy/download behaviour for small inline results.
- Generated large text uses a bounded preview plus an OPFS download artifact; Copy applies only to the displayed preview.
- Keep DOM output bounded:
  - CSV/table preview: header plus first 1,000 rows.
  - PDF thumbnail cache: at most 24 object URLs.
  - JSON large-file view: first 256 KiB only.

### JSON and CSV large-file processing

- Move selected processors to `run.worker.ts`; do not add tool-ID dispatch or compatibility re-exports.
- Build one strict incremental JSON tokenizer/formatter in the existing JSON shared domain:
  - Consume `File.stream()` through `TextDecoderStream`.
  - Validate strings, escapes, numbers, literals, nesting, commas, and delimiters across chunk boundaries.
  - Preserve number lexemes exactly; formatting/minifying must not round large numbers.
  - Stream encoded output to `writeArtifact`.
  - Use the same tokenizer for small and large formatter/minifier/validator runs.
- Enable file import up to 100 MiB for `json-viewer`, `json-formatter`, `json-minifier`, and `json-validator`.
- In JSON Viewer large-file mode, allow validate, format, minify, preview, and download; disable repair plus Tree/Form/full Code editing.
- Refactor the existing CSV parser into a stateful incremental parser:
  - Preserve quoted fields, escaped quotes, embedded newlines, BOM handling, and CRLF split across chunks.
  - Emit rows without accumulating the document.
  - Enforce consistent column width and output limits while streaming.
- Enable large-file mode for `csv-viewer`, `csv-validator`, `csv-delimiter-converter`, `csv-formatter`, `csv-to-tsv`, `tsv-to-csv`, `csv-column-extractor`, `csv-filter`, `csv-to-json`, `csv-to-table`, and `csv-to-markdown-table`.
- CSV Viewer retains only the first 1,000 rows while counting and validating the complete stream.
- `csv-sorter` and `csv-duplicate-remover` remain editor-limited because safe 100 MiB support requires external sorting or a disk-backed index.
- Other JSON operations requiring a complete object graph retain their current limits.

### Existing media tools

- Migrate all 30 current worker file tools to the File-backed input and artifact-output contracts.
- Change shared media aggregate limits from 250 MiB to 100 MiB.
- Images:
  - Preserve 25 MiB/file, 50 files, and 100-megapixel limits.
  - Decode from `File`/`Blob` inside the worker.
  - Process files sequentially and retain only the active decoded bitmap/canvas.
  - Close `ImageBitmap` resources and release canvases immediately after encoding.
- PDFs:
  - Replace inspection-time full buffers with a `PDFDataRangeTransport` backed by `File.slice()`.
  - Introduce a separate inspection worker session: open once, return page count/geometry, render requested thumbnail pages, and close when the selection changes.
  - Request thumbnails only for visible/near-visible pages and enforce the 24-thumbnail cache.
  - Keep structural and raster page limits at 500 and 200.
  - `pdf-lib` transforms may deliberately call `source.arrayBuffer()` only inside the worker after the 50 MiB aggregate guard.
  - Merge, watermark, and other multi-input `pdf-lib` jobs share the same 50 MiB combined cap.
  - All raster or multi-file outputs stop when combined output reaches 100 MiB.
- Update visible limitation copy so UI documentation matches the new PDF and aggregate limits.

## Test and acceptance plan

- Unit tests cover exact byte boundaries, aggregate limits, lower tool overrides, File-backed worker validation, streaming JSON/CSV chunk boundaries, artifact partial writes, quota failures, cleanup, cancellation watchdogs, and progress throttling.
- Browser tests prove main-thread `File.text()`/`arrayBuffer()` are not used for large runs, full editors are not mounted in large-file mode, previews stay bounded, downloads are byte-correct, and cancellation/reset/unmount clean resources.
- Generate 25, 50, 100, and 100 MiB-plus-one fixtures in `/tmp`; commit no large fixtures.
- Run the 100 MiB suite in Chromium, Firefox, and WebKit before release.
- Required checks: targeted Node tests, `pnpm test`, `pnpm lint`, `pnpm build`, affected Playwright suites, fresh screenshots, `ui_validator`, `end_user_validator`, `git diff --check`, and `git status --short`.

## Assumptions and exclusions

- All processing remains local; no server uploads or persistence are introduced.
- The 100 MiB number is an admission ceiling, not a promise that every operation supports that size.
- Direct paste remains capped at 2,000,000 characters because the browser has already materialized pasted text.
- Full large-file Tree/Form/code editing, external CSV sorting/deduplication, and disk-backed arbitrary JSON queries are later capabilities.
- `showSaveFilePicker`, service-worker streaming downloads, multithreaded Wasm, and cross-tab job coordination are excluded until profiling demonstrates a need.
- No long-lived `ArrayBuffer` compatibility layer remains after migration; the only intentional full-buffer paths are processor-local libraries protected by stricter limits.
