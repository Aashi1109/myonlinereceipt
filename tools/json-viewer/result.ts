import type { JsonTransformResult } from "../../lib/devtools/shared/json.ts";

export type JsonViewerExecutionResult =
  | {
      formattedValue: string;
      ok: true;
      value: unknown;
    }
  | Extract<JsonTransformResult, { ok: false }>;
