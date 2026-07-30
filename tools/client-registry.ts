import type { ComponentType } from "react";

import type { ToolPageComponentProps } from "@/lib/tool-runtime/types";

import JsonViewerTool from "./json-viewer/JsonViewerTool";

const universalToolWorkbenches: Readonly<
  Record<string, ComponentType<ToolPageComponentProps>>
> = {
  "json-viewer": JsonViewerTool,
};

export function getUniversalToolWorkbench(
  definitionKey: string,
): ComponentType<ToolPageComponentProps> | undefined {
  return universalToolWorkbenches[definitionKey];
}
