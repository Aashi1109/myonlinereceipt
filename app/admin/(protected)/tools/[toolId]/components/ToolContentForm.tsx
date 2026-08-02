"use client";

import {
  AlertBanner,
  Button,
  Field,
  Input,
  SectionCard,
  SectionHeading,
  Select,
  StatusBadge,
  Textarea,
} from "@smarttools/ui";
import { useActionState, useState, type ReactElement, type ReactNode } from "react";
import {
  TOOL_CATEGORIES,
  type CategoryKey,
} from "../../../../../../lib/tool-framework/categories";
import {
  publishToolContentAction,
  saveToolContentAction,
  type ToolContentActionState,
} from "../../actions";

const IDLE: ToolContentActionState = { status: "idle", message: "" };

const CATEGORY_OPTIONS: readonly { key: CategoryKey; label: string }[] =
  Object.entries(TOOL_CATEGORIES).map(([key, category]) => ({
    key: key as CategoryKey,
    label: `${category.label} · ${category.app}`,
  }));

export interface InheritedContentView {
  readonly category: string;
  readonly keywords: readonly string[];
  readonly seoTitle: string;
  readonly seoDescription: string;
  /** The shipped content document, or null when the folder ships none. */
  readonly contentDoc: unknown;
}

export interface StoredContentView {
  readonly category: string | null;
  readonly keywords: readonly string[] | null;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly contentDoc: unknown;
  readonly published: boolean;
  readonly publishedAtLabel: string | null;
  readonly hasRow: boolean;
}

export interface ToolContentFormProps {
  readonly inherited: InheritedContentView;
  readonly stored: StoredContentView;
  readonly toolId: string;
}

type DocFields = {
  readonly howToUse: string;
  readonly limitations: string;
  readonly faq: string;
  readonly examples: string;
  readonly relatedToolIds: string;
};

const EMPTY_DOC: DocFields = {
  howToUse: "",
  limitations: "",
  faq: "",
  examples: "",
  relatedToolIds: "",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function textLines(value: unknown): string {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string").join("\n")
    : "";
}

function jsonText(value: unknown): string {
  return Array.isArray(value) && value.length > 0
    ? JSON.stringify(value, null, 2)
    : "";
}

function docFields(doc: unknown): DocFields {
  const record = asRecord(doc);
  if (!record) return EMPTY_DOC;
  return {
    howToUse: textLines(record.howToUse),
    limitations: textLines(record.limitations),
    faq: jsonText(record.faq),
    examples: jsonText(record.examples),
    relatedToolIds: textLines(record.relatedToolIds),
  };
}

function isEmptyDoc(fields: DocFields): boolean {
  return Object.values(fields).every((value) => !value.trim());
}

interface OverrideNoteProps {
  readonly inherited: ReactNode;
  readonly onClear: () => void;
  readonly overridden: boolean;
}

/**
 * Every field is either stored in the database or inherited from
 * `definition.ts`; this line says which, shows the inherited value, and offers
 * the way back to it.
 */
function OverrideNote({
  inherited,
  onClear,
  overridden,
}: OverrideNoteProps): ReactElement {
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
      <StatusBadge variant={overridden ? "info" : "neutral"}>
        {overridden ? "Overridden in database" : "Inherited from code"}
      </StatusBadge>
      <span className="min-w-0 flex-1 truncate">From code: {inherited}</span>
      {overridden ? (
        <Button onClick={onClear} size="sm" type="button" variant="ghost">
          Clear override
        </Button>
      ) : null}
    </span>
  );
}

export function ToolContentForm({
  inherited,
  stored,
  toolId,
}: ToolContentFormProps): ReactElement {
  const [saveState, saveAction, isSaving] = useActionState(
    saveToolContentAction,
    IDLE,
  );
  const [publishState, publishAction, isPublishing] = useActionState(
    publishToolContentAction,
    IDLE,
  );

  const [category, setCategory] = useState(stored.category ?? "");
  const [keywords, setKeywords] = useState((stored.keywords ?? []).join(", "));
  const [seoTitle, setSeoTitle] = useState(stored.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    stored.seoDescription ?? "",
  );
  const [overrideDoc, setOverrideDoc] = useState(
    asRecord(stored.contentDoc) !== null,
  );
  // Overriding starts from the shipped document: the resolver replaces the
  // whole document or none of it, so a half-filled override loses the rest.
  const [doc, setDoc] = useState<DocFields>(() =>
    asRecord(stored.contentDoc)
      ? docFields(stored.contentDoc)
      : docFields(inherited.contentDoc),
  );

  function updateDoc(field: keyof DocFields, value: string): void {
    setDoc((current) => ({ ...current, [field]: value }));
  }

  const state = saveState.status === "idle" ? publishState : saveState;

  return (
    <div className="grid gap-6">
      <SectionCard>
        <SectionHeading
          description="While this is a draft the public pages use the values from code, whatever is stored here."
          title="Draft and publish"
        />
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge variant={stored.published ? "success" : "warning"}>
            {stored.published ? "Published — database content is live" : "Draft — code content is live"}
          </StatusBadge>
          <span className="text-xs text-muted-foreground">
            {stored.published && stored.publishedAtLabel
              ? `Published ${stored.publishedAtLabel}`
              : stored.hasRow
                ? "Saved but never published."
                : "Nothing stored yet."}
          </span>
          <form action={publishAction} className="ml-auto flex items-center gap-2">
            <input name="toolId" type="hidden" value={toolId} />
            {stored.published ? (
              <Button
                disabled={isPublishing}
                name="published"
                type="submit"
                value="false"
                variant="secondary"
              >
                Unpublish
              </Button>
            ) : (
              <Button
                disabled={isPublishing || !stored.hasRow}
                name="published"
                type="submit"
                value="true"
              >
                Publish saved content
              </Button>
            )}
          </form>
        </div>
      </SectionCard>

      {state.status !== "idle" ? (
        <AlertBanner variant={state.status === "success" ? "success" : "error"}>
          {state.message}
        </AlertBanner>
      ) : null}

      <form action={saveAction} className="grid gap-6">
        <input name="toolId" type="hidden" value={toolId} />
        <input
          name="contentDocMode"
          type="hidden"
          value={overrideDoc ? "override" : "inherit"}
        />

        <SectionCard>
          <SectionHeading
            description="Leave a field empty to inherit it from the tool's definition.ts. An empty value never overrides with blank."
            title="Catalog and search"
          />

          {/* The picker is a Radix select, so the submitted value is this
              hidden input — an empty one clears the override. */}
          <input name="category" type="hidden" value={category} />
          <Field
            htmlFor="tool-content-category"
            label="Category"
          >
            <Select
              id="tool-content-category"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              <option value="">Inherit from code</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <OverrideNote
            inherited={inherited.category || "none"}
            onClear={() => setCategory("")}
            overridden={Boolean(category)}
          />

          <Field
            description="One per line, or comma separated."
            htmlFor="tool-content-keywords"
            label="Keywords"
          >
            <Textarea
              id="tool-content-keywords"
              name="keywords"
              onChange={(event) => setKeywords(event.target.value)}
              rows={3}
              value={keywords}
            />
          </Field>
          <OverrideNote
            inherited={inherited.keywords.join(", ") || "none"}
            onClear={() => setKeywords("")}
            overridden={Boolean(keywords.trim())}
          />

          <Field htmlFor="tool-content-seo-title" label="SEO title">
            <Input
              id="tool-content-seo-title"
              maxLength={160}
              name="seoTitle"
              onChange={(event) => setSeoTitle(event.target.value)}
              value={seoTitle}
            />
          </Field>
          <OverrideNote
            inherited={inherited.seoTitle || "none"}
            onClear={() => setSeoTitle("")}
            overridden={Boolean(seoTitle.trim())}
          />

          <Field htmlFor="tool-content-seo-description" label="SEO description">
            <Textarea
              id="tool-content-seo-description"
              maxLength={320}
              name="seoDescription"
              onChange={(event) => setSeoDescription(event.target.value)}
              rows={3}
              value={seoDescription}
            />
          </Field>
          <OverrideNote
            inherited={inherited.seoDescription || "none"}
            onClear={() => setSeoDescription("")}
            overridden={Boolean(seoDescription.trim())}
          />
        </SectionCard>

        <SectionCard>
          <SectionHeading
            description="The page body. It replaces the shipped document as a whole, so an override has to carry every section it needs."
            title="Content document"
          />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={overrideDoc && !isEmptyDoc(doc) ? "info" : "neutral"}>
              {overrideDoc && !isEmptyDoc(doc)
                ? "Overridden in database"
                : "Inherited from code"}
            </StatusBadge>
            <Button
              onClick={() => {
                setOverrideDoc(!overrideDoc);
                if (!overrideDoc && isEmptyDoc(doc)) {
                  setDoc(docFields(inherited.contentDoc));
                }
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              {overrideDoc ? "Clear override" : "Override in database"}
            </Button>
          </div>

          {overrideDoc ? (
            <div className="grid gap-6">
              <Field
                description="One step per line. Required for an override."
                htmlFor="tool-content-how-to-use"
                label="How to use"
              >
                <Textarea
                  id="tool-content-how-to-use"
                  name="howToUse"
                  onChange={(event) => updateDoc("howToUse", event.target.value)}
                  rows={5}
                  value={doc.howToUse}
                />
              </Field>
              <Field
                description="One per line."
                htmlFor="tool-content-limitations"
                label="Limitations"
              >
                <Textarea
                  id="tool-content-limitations"
                  name="limitations"
                  onChange={(event) => updateDoc("limitations", event.target.value)}
                  rows={4}
                  value={doc.limitations}
                />
              </Field>
              <Field
                description={'JSON array of {"q": "…", "a": "…"}.'}
                htmlFor="tool-content-faq"
                label="FAQ"
              >
                <Textarea
                  className="font-mono text-xs"
                  id="tool-content-faq"
                  name="faq"
                  onChange={(event) => updateDoc("faq", event.target.value)}
                  rows={6}
                  value={doc.faq}
                />
              </Field>
              <Field
                description={'JSON array of {"label": "…", "text": "…", "secondary": "…"}.'}
                htmlFor="tool-content-examples"
                label="Examples"
              >
                <Textarea
                  className="font-mono text-xs"
                  id="tool-content-examples"
                  name="examples"
                  onChange={(event) => updateDoc("examples", event.target.value)}
                  rows={6}
                  value={doc.examples}
                />
              </Field>
              <Field
                description="One tool id per line — the stable id such as <app>.<folder>, never a slug."
                htmlFor="tool-content-related"
                label="Related tools"
              >
                <Textarea
                  className="font-mono text-xs"
                  id="tool-content-related"
                  name="relatedToolIds"
                  onChange={(event) => updateDoc("relatedToolIds", event.target.value)}
                  rows={3}
                  value={doc.relatedToolIds}
                />
              </Field>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              The shipped document in <code>definition.ts</code> is used.
            </p>
          )}
        </SectionCard>

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={isSaving} type="submit">
            Save content
          </Button>
          <span className="text-xs text-muted-foreground">
            Saving keeps the current draft or published state.
          </span>
        </div>
      </form>
    </div>
  );
}
