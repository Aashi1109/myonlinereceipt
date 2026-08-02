"use client";

import { SplitStack } from "@/components/Stacks";
import {
  ResultSurface,
  SettingsSurface,
  type WorkspaceProps,
  WorkspaceInputSurface,
} from "@/components/workspaces/SourceResultWorkspace";

export function GeneratorWorkspace(props: WorkspaceProps) {
  const settingsSurface = (
    <SettingsSurface
      disabled={props.disabled}
      onSettingChange={props.onSettingChange}
      settings={props.settings}
      spec={props.spec}
      title={props.spec.input.kind === "fields" ? props.spec.input.label : "Generator settings"}
    />
  );
  const resultSurface = (
    <ResultSurface
      error={props.error}
      result={props.result}
      running={props.running}
      spec={props.spec}
      title="Generated result"
    />
  );
  return (
    <SplitStack className="h-full" defaultSize={62} minSize={45}>
      <SplitStack className="h-full" defaultSize={48} minSize={28} orientation="vertical">
          <WorkspaceInputSurface
            disabled={props.disabled}
            input={props.input}
            inputSpec={props.spec.input}
            onInputChange={props.onInputChange}
          />
          {resultSurface}
      </SplitStack>
      {settingsSurface}
    </SplitStack>
  );
}
