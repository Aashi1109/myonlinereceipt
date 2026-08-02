import type { ReactElement } from "react";
import {
  resolveIcon,
  type ToolIconRow,
} from "@/lib/tool-framework/icons";

export type ToolIconProps = {
  toolId: string;
  name: string;
  row: ToolIconRow | null;
  size?: number;
};

export function ToolIcon({
  toolId,
  name,
  row,
  size = 24,
}: ToolIconProps): ReactElement {
  const icon = resolveIcon(toolId, name, row);

  if (icon.kind === "url") {
    return (
      <img
        alt=""
        // CORS mode keeps Cloudinary icons visible under /media's COEP without weakening worker isolation.
        crossOrigin="anonymous"
        height={size}
        src={icon.url}
        width={size}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: icon.svg }}
      style={{ display: "inline-block", height: size, lineHeight: 0, width: size }}
    />
  );
}
