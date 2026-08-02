import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.xml-to-json",
  app: "devtools",
  category: "json-tools",
  keywords: [
    "xml",
    "json",
    "convert",
    "parse",
    "attributes",
    "soap",
    "rss",
  ],
  name: "XML to JSON",
  description: "Convert XML elements and attributes to JSON.",
  input: {
    kind: "text",
    label: "XML input",
    placeholder: "Enter or paste xml input…",
  },
  settings: {
    fields: {},
  },
  trigger: {
    mode: "manual",
    actionLabel: "Convert to JSON",
  },
  layout: "source-result",
  capabilities: {
    copy: true,
    download: true,
  },
  labels: {
    empty: "Paste XML to convert it to JSON.",
    ready: "JSON is ready.",
    running: "Converting XML…",
  },
  content: {
    howToUse: [
      "Paste a single well-formed XML document with exactly one root element.",
      "Convert. Attributes become keys prefixed with @, element text becomes #text when the element also has children or attributes, and repeated sibling names become arrays.",
      "Copy the formatted JSON, or fix the reported error if the tags do not balance.",
    ],
    limitations: [
      "This is a deliberately small parser, not a full XML processor. Namespaces are kept as literal prefixes, DTDs and entity declarations are skipped, and CDATA is not unwrapped.",
      "Whitespace-only text is trimmed away, so mixed content (text interleaved with child elements) loses its ordering.",
      "An element that appears once becomes an object; the same element appearing twice becomes an array. Consumers must handle both shapes.",
      "Numbers and booleans stay strings — XML has no types to infer them from.",
    ],
    faq: [
      {
        q: "Why is my attribute prefixed with @?",
        a: "So an attribute named id cannot collide with a child element named id. The convention matches most XML-to-JSON mappings.",
      },
      {
        q: "Why did a single-element list become an object?",
        a: "There is no way to tell a one-item list from a single value in XML without a schema. Normalise with Array.isArray on the consuming side.",
      },
    ],
    examples: [
      {
        label: "Element with an attribute",
        text: "<user id=\"1\"><name>Ada</name><active>true</active></user>",
      },
    ],
  },
} as const satisfies ToolSpec;
