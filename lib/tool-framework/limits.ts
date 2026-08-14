export const MIB = 1024 * 1024;

/** Hard admission ceiling for one input file and one job's total I/O. */
export const PLATFORM_MAX_BYTES = 100 * MIB;

/** Maximum aggregate output retained in memory when OPFS is unavailable. */
export const BLOB_FALLBACK_MAX_BYTES = 16 * MIB;

/** Complete text stays editable only up to the existing character ceiling. */
export const MAX_EDITABLE_TEXT_CHARS = 2_000_000;

/** A large text file is represented by a bounded, read-only preview. */
export const LARGE_TEXT_PREVIEW_BYTES = 256 * 1024;

export const CSV_PREVIEW_ROWS = 1_000;
/** Keeps a 1,000-row CSV preview useful while bounding retained DOM text. */
export const CSV_PREVIEW_BYTES = 2 * MIB;
/** One pathological field or row must not consume the whole browser heap. */
export const CSV_MAX_FIELD_BYTES = 8 * MIB;
export const CSV_MAX_ROW_BYTES = 16 * MIB;
export const PDF_THUMBNAIL_CACHE_SIZE = 24;
export const PROGRESS_INTERVAL_MS = 100;
export const CANCEL_WATCHDOG_MS = 1_000;
