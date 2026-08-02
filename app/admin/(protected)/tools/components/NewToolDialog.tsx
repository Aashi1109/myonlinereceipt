"use client";

import {
  AlertBanner,
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@smarttools/ui";
import {
  slugFromName,
  TOOL_SLUG_PATTERN,
} from "@smarttools/tool-catalog";
import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
import {
  categoriesForApp,
  TOOL_CATEGORIES,
  type ToolApp,
} from "../../../../../lib/tool-framework/categories";
import { createToolAction, type ToolContentActionState } from "../actions";

const IDLE: ToolContentActionState = { status: "idle", message: "" };

const APPS: readonly { readonly app: ToolApp; readonly label: string }[] = [
  { app: "devtools", label: "Developer tools" },
  { app: "media", label: "Media tools" },
];

/** Mirrors the server default without letting an unslugifiable name throw. */
function previewSlug(name: string): string {
  try {
    return slugFromName(name);
  } catch {
    return "";
  }
}

function scaffoldCommand(app: ToolApp, key: string, category: string): string {
  return `pnpm tool:new ${key || "<key>"} --app ${app} --category ${
    category || "<category>"
  }`;
}

export function NewToolDialog() {
  const [open, setOpen] = useState(false);
  const [app, setApp] = useState<ToolApp>("devtools");
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  // Until the admin edits the slug it tracks the name, exactly as the server
  // would default it.
  const [slugOverride, setSlugOverride] = useState<string | null>(null);
  const [state, submit, isSubmitting] = useActionState(createToolAction, IDLE);

  const slug = slugOverride ?? previewSlug(name);
  const keyLooksValid = key === "" || TOOL_SLUG_PATTERN.test(key);

  function chooseApp(nextApp: ToolApp): void {
    setApp(nextApp);
    // Categories are per app, so the old choice cannot survive the switch.
    setCategory("");
  }

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger asChild>
        <Button>
          <Plus aria-hidden="true" />
          New tool
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Create a tool&apos;s configuration</AlertDialogTitle>
          <AlertDialogDescription>
            A tool is two halves. Its <strong>code</strong> —{" "}
            <code>tools/&lt;key&gt;/definition.ts</code> and one run file — is
            scaffolded on a developer machine and shipped by a deploy; a
            deployed app cannot write files, so this form cannot create it. What
            this form creates is the other half: the{" "}
            <strong>database configuration</strong> — the{" "}
            <code>managed_tools</code> row and its empty{" "}
            <code>tool_content</code> row.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertBanner title="Configuring first is safe" variant="info">
          The deploy seed inserts with <code>onConflictDoNothing</code>, so the
          name, description, slug and order you set here survive every later
          deploy untouched. Until <code>tools/&lt;key&gt;/</code> exists the
          catalog resolves the tool to nothing and drops it, so a
          configured-but-codeless tool never 404s a visitor — it simply does not
          appear publicly.
        </AlertBanner>

        {state.status === "error" ? (
          <AlertBanner variant="error">{state.message}</AlertBanner>
        ) : null}

        <form action={submit} className="grid gap-6">
          <input name="app" type="hidden" value={app} />

          <Field
            description="Paperwork is a separate product surface and is not created here."
            htmlFor="new-tool-app"
            label="App"
          >
            <Select
              id="new-tool-app"
              onChange={(event) => chooseApp(event.target.value as ToolApp)}
              value={app}
            >
              {APPS.map((option) => (
                <option key={option.app} value={option.app}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            description="The tool's identity and its module path. It must equal the folder name a developer will create under tools/ — lowercase words joined by single hyphens."
            error={
              keyLooksValid
                ? undefined
                : "Use lowercase letters, digits and single hyphens."
            }
            htmlFor="new-tool-key"
            label="Folder key"
          >
            <Input
              autoComplete="off"
              className="font-mono"
              id="new-tool-key"
              name="key"
              onChange={(event) => setKey(event.target.value)}
              placeholder="folder-name"
              required
              value={key}
            />
          </Field>

          <p className="-mt-3 text-xs text-muted-foreground">
            Tool id, derived and never typed:{" "}
            <code>
              {app}.{key || "<key>"}
            </code>
            . The catalog splits it on the dot to find the folder, which is what
            makes the code resolvable once it ships.
          </p>

          <Field htmlFor="new-tool-name" label="Name">
            <Input
              autoComplete="off"
              id="new-tool-name"
              name="name"
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </Field>

          <Field htmlFor="new-tool-description" label="Description">
            <Textarea
              id="new-tool-description"
              name="description"
              required
              rows={2}
            />
          </Field>

          <Field
            description="Defaults to the name. Override it only if you must."
            htmlFor="new-tool-slug"
            label="Slug"
          >
            <Input
              autoComplete="off"
              className="font-mono"
              id="new-tool-slug"
              name="slug"
              onChange={(event) => setSlugOverride(event.target.value)}
              value={slug}
            />
          </Field>

          <AlertBanner title="The slug is permanent" variant="warning">
            A saved slug can never be changed — a database trigger, the write
            path and <code>unique(app, slug)</code> all refuse it. It must also
            match whatever <code>slug:</code> the shipped{" "}
            <code>definition.ts</code> declares (or, if it declares none, the
            slug generated from the name in code). If the two ever disagree, the
            seed stops and fails the whole deploy loudly rather than silently
            moving a live URL.
          </AlertBanner>

          <Field
            description="Must be a category registered for the chosen app."
            htmlFor="new-tool-category"
            label="Category"
          >
            <Select
              id="new-tool-category"
              name="category"
              onChange={(event) => setCategory(event.target.value)}
              required
              value={category}
            >
              <option value="">Choose a category</option>
              {categoriesForApp(app).map((categoryKey) => (
                <option key={categoryKey} value={categoryKey}>
                  {TOOL_CATEGORIES[categoryKey].label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="rounded-md border border-border bg-muted/40 p-4">
            <p className="font-caption text-[13px] font-semibold text-foreground">
              Hand this to a developer
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This scaffolds the missing half. The tool stays disabled and
              invisible until that folder ships and you enable it.
            </p>
            <code className="mt-2 block overflow-x-auto whitespace-pre rounded bg-background p-2 font-mono text-xs">
              {scaffoldCommand(app, key, category)}
            </code>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button disabled={isSubmitting} type="submit">
              Create configuration
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
