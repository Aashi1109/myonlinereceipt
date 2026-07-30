import { MAX_JSON_INPUT_CHARS } from "@/lib/devtools/format-json";
import type { ToolDefinition } from "@/lib/tool-runtime/types";

export const jsonViewerDefinition = {
  app: "devtools",
  capabilities: {
    copy: true,
    download: true,
  },
  definitionKey: "json-viewer",
  input: {
    kind: "text",
    label: "JSON input",
    maxLength: MAX_JSON_INPUT_CHARS,
  },
  labels: {
    empty: "Paste JSON or load an example to begin.",
    primaryAction: "Repair & clean",
    ready: "Interactive tree ready.",
    running: "Parsing JSON…",
  },
  primaryCommand: "repair",
  primaryCommandVisibleWhen: ["empty", "invalid"],
  settings: [
    {
      choices: [
        { label: "Remove broken properties", value: "remove" },
        { label: "Set broken values to null", value: "null" },
      ],
      helpText: "Used only when Repair & clean is requested.",
      key: "repairMode",
      kind: "select",
      label: "Repair strategy",
    },
  ],
  toolId: "devtools.json-viewer",
  trigger: {
    debounceMs: 120,
    mode: "live",
  },
} as const satisfies ToolDefinition;
