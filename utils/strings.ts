/** Turn camelCase, PascalCase, and separated words into readable labels. */
export function startCase(value: string): string {
  return value
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2")
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => word.replace(/^./u, (letter) => letter.toUpperCase()))
    .join(" ");
}
