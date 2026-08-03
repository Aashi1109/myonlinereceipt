import type { ToolInputSpec } from "@/lib/tool-framework/spec";

const FILE_IDS = new WeakMap<File, string>();

export function workspaceFileId(file: File): string {
  const existing = FILE_IDS.get(file);
  if (existing) return existing;
  const id = crypto.randomUUID();
  FILE_IDS.set(file, id);
  return id;
}

export interface FileSelectionResult {
  files: readonly File[];
  issue: string;
}

function acceptsFile(file: File, accept: string): boolean {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  return accept.split(",").some((rawPattern) => {
    const pattern = rawPattern.trim().toLowerCase();
    if (!pattern) return false;
    if (pattern === "*/*") return true;
    if (pattern.startsWith(".")) return name.endsWith(pattern);
    if (pattern.endsWith("/*")) return mime.startsWith(pattern.slice(0, -1));
    return mime === pattern;
  });
}

export function validateFileSelection(
  current: readonly File[],
  incoming: readonly File[],
  inputSpec: Extract<ToolInputSpec, { kind: "files" }>,
): FileSelectionResult {
  const accepted: File[] = [];
  const issues: string[] = [];
  for (const file of incoming) {
    if (!acceptsFile(file, inputSpec.accept)) {
      issues.push(`${file.name} is not an accepted file type.`);
    } else if (inputSpec.maxBytes !== undefined && file.size > inputSpec.maxBytes) {
      issues.push(`${file.name} exceeds the ${inputSpec.maxBytes.toLocaleString()} byte limit.`);
    } else {
      accepted.push(file);
    }
  }
  const combined = inputSpec.multiple ? [...current, ...accepted] : accepted.slice(0, 1);
  const limit = inputSpec.maxFiles ?? combined.length;
  if (combined.length > limit) {
    issues.push(`Only ${limit} ${limit === 1 ? "file" : "files"} can be added.`);
  }
  return { files: combined.slice(0, limit), issue: issues.join(" ") };
}
