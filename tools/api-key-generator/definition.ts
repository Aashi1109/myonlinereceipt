import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.api-key-generator",
  app: "devtools",
  category: "developer-generators",
  keywords: [
    "api key",
    "secret",
    "token",
    "generator",
    "random",
    "prefix",
    "credentials",
  ],
  name: "API Key Generator",
  description: "Generate prefixed cryptographically secure API keys.",
  input: { kind: "none" },
  settings: {
    fields: {
      prefix: {
        kind: "text",
        label: "Prefix",
        help: "Letters, numbers, underscores and hyphens. Joined to the key with an underscore. Leave empty for no prefix.",
        default: "sk",
        placeholder: "sk",
        maxLength: 32,
      },
      length: {
        kind: "number",
        label: "Length",
        help: "Characters in the random body, not counting the prefix. 32 gives about 190 bits of entropy.",
        default: 32,
        min: 8,
        max: 256,
      },
      count: {
        kind: "number",
        label: "How many",
        default: 3,
        min: 1,
        max: 100,
      },
    },
  },
  trigger: { mode: "manual", actionLabel: "Generate" },
  layout: "generator",
  capabilities: { copy: true, download: true },
  labels: {
    empty: "Choose a prefix and length, then generate.",
    ready: "API keys are ready.",
    running: "Generating keys…",
  },
  content: {
    howToUse: [
      "Pick a short prefix that says what the key is — `sk` for a secret key, `pk` for a publishable one, or something environment-specific such as `sk_live`. A prefix makes a leaked key identifiable in logs and lets secret scanners spot it.",
      "Leave the length at 32 unless you have a reason to change it; that is roughly 190 bits from the URL-safe alphabet, far past any brute-force concern.",
      "Generate, then store the key as a hash on your server and show the plaintext to the user exactly once. Do not paste it into a ticket, a chat message, or a source file.",
    ],
    limitations: [
      "Randomness comes from the Web Crypto API in this browser tab. Nothing is uploaded, but nothing is recorded either — once you close the tab the value is gone.",
      "This generates an opaque random string. It is not a JWT, carries no claims, no expiry, and no signature; revocation and scoping are your server's job.",
      "There is no checksum in the key, so a truncated or mistyped key cannot be detected client-side the way a Stripe- or GitHub-style checksummed key can.",
      "The prefix is joined with an underscore and is not itself random, so it contributes no entropy.",
      "Keys are generated in the browser, so treat any key produced on a machine you do not control as compromised.",
    ],
    faq: [
      {
        q: "How long should a key be?",
        a: "32 characters from this 64-character alphabet is about 190 bits — comfortably beyond brute force. Anything above 20 is fine; the extra length costs nothing.",
      },
      {
        q: "Should I store these in my database?",
        a: "Store a hash, not the key. Hash with SHA-256 on receipt and compare hashes; that way a database leak does not hand over working credentials.",
      },
      {
        q: "Why does the key use `-` and `_`?",
        a: "The alphabet is URL-safe Base64 characters, so a key can go in a URL path, a query string, or a header without escaping.",
      },
      {
        q: "Are these keys unique?",
        a: "Not by construction — they are random, with no registry behind them. At 32 characters a collision is astronomically unlikely, but your server should still enforce uniqueness on insert.",
      },
    ],
  },
} as const satisfies ToolSpec;
