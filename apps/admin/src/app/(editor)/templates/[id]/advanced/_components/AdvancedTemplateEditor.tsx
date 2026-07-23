"use client";

import type {
  Plugins,
  Schema,
  Template,
} from "@pdfme/common";
import type {
  AdvancedDocumentTemplate,
  PdfmeBlankBase,
  PdfmeSchema,
} from "@smarttools/invoice-templates";
import {
  BrandLockup,
  Button,
  Input,
  StatusBadge,
  buttonVariants,
} from "@smarttools/ui";
import { OrderableList } from "@smarttools/ui/components/OrderableList";
import {
  ArrowLeft,
  Barcode,
  Braces,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleDot,
  Clock3,
  Database,
  Eye,
  FilePlus2,
  FileText,
  Focus,
  GripVertical,
  ImageIcon,
  Layers,
  List,
  ListFilter,
  LoaderCircle,
  Maximize2,
  Minus,
  MousePointer2,
  PenLine,
  Plus,
  QrCode,
  Redo2,
  Save,
  Shapes,
  Square,
  SquareCheck,
  Table2,
  Type,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Designer,
  DesignerSelection,
} from "@pdfme/ui";
import {
  updateAndPublishTemplateAction,
  updateTemplateAction,
} from "../../../../../actions";

type ActivePanel = "add" | "layers" | "data" | "pages" | null;
type Region = "header" | "footer";
type LayerItem = {
  id: string;
  index: number;
  schema: Schema;
};
type AddTool = {
  description: string;
  group: "Content" | "Layout" | "Fields" | "Codes";
  icon: LucideIcon;
  label: string;
  pluginKey: string;
};

const HISTORY_LIMIT = 40;
const ADD_TOOL_GROUPS = ["Content", "Layout", "Fields", "Codes"] as const;
const ADD_TOOLS: AddTool[] = [
  {
    description: "Static or bound copy",
    group: "Content",
    icon: Type,
    label: "Text",
    pluginKey: "text",
  },
  {
    description: "Mix copy with variables",
    group: "Content",
    icon: Braces,
    label: "Dynamic text",
    pluginKey: "multiVariableText",
  },
  {
    description: "Bulleted or numbered items",
    group: "Content",
    icon: List,
    label: "List",
    pluginKey: "list",
  },
  {
    description: "Logo, photo, or artwork",
    group: "Content",
    icon: ImageIcon,
    label: "Image",
    pluginKey: "image",
  },
  {
    description: "Uploaded signature image",
    group: "Content",
    icon: PenLine,
    label: "Signature",
    pluginKey: "signature",
  },
  {
    description: "Scalable vector artwork",
    group: "Content",
    icon: Shapes,
    label: "SVG graphic",
    pluginKey: "svg",
  },
  {
    description: "Horizontal or angled rule",
    group: "Layout",
    icon: Minus,
    label: "Line",
    pluginKey: "line",
  },
  {
    description: "Outlined or filled box",
    group: "Layout",
    icon: Square,
    label: "Rectangle",
    pluginKey: "rectangle",
  },
  {
    description: "Outlined or filled circle",
    group: "Layout",
    icon: Circle,
    label: "Ellipse",
    pluginKey: "ellipse",
  },
  {
    description: "Rows that flow across pages",
    group: "Layout",
    icon: Table2,
    label: "Table",
    pluginKey: "table",
  },
  {
    description: "Formatted date and time",
    group: "Fields",
    icon: CalendarClock,
    label: "Date & time",
    pluginKey: "dateTime",
  },
  {
    description: "Formatted calendar date",
    group: "Fields",
    icon: CalendarDays,
    label: "Date",
    pluginKey: "date",
  },
  {
    description: "Formatted time",
    group: "Fields",
    icon: Clock3,
    label: "Time",
    pluginKey: "time",
  },
  {
    description: "Choose from preset options",
    group: "Fields",
    icon: ListFilter,
    label: "Dropdown",
    pluginKey: "select",
  },
  {
    description: "Single-choice field",
    group: "Fields",
    icon: CircleDot,
    label: "Radio button",
    pluginKey: "radioGroup",
  },
  {
    description: "True or false field",
    group: "Fields",
    icon: SquareCheck,
    label: "Checkbox",
    pluginKey: "checkbox",
  },
  {
    description: "Circle a selected value",
    group: "Fields",
    icon: Circle,
    label: "Circle mark",
    pluginKey: "circleMark",
  },
  {
    description: "Scannable URL or text",
    group: "Codes",
    icon: QrCode,
    label: "QR code",
    pluginKey: "qrcode",
  },
  {
    description: "Code 128 product code",
    group: "Codes",
    icon: Barcode,
    label: "Barcode",
    pluginKey: "code128",
  },
];

function cloneTemplate(template: Template): Template {
  return structuredClone(template);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

async function loadPlugins(): Promise<Plugins> {
  const schemas = await import("@pdfme/schemas");
  return {
    text: schemas.text,
    multiVariableText: schemas.multiVariableText,
    list: schemas.list,
    image: schemas.image,
    signature: schemas.signature,
    svg: schemas.svg,
    line: schemas.line,
    rectangle: schemas.rectangle,
    ellipse: schemas.ellipse,
    table: schemas.table,
    dateTime: schemas.dateTime,
    date: schemas.date,
    time: schemas.time,
    select: schemas.select,
    radioGroup: schemas.radioGroup,
    checkbox: schemas.checkbox,
    circleMark: schemas.circleMark,
    ...schemas.barcodes,
  };
}

function blankBase(template: Template): PdfmeBlankBase {
  return template.basePdf as PdfmeBlankBase;
}

function panelButtonClass(active: boolean) {
  return [
    "flex min-h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  ].join(" ");
}

export default function AdvancedTemplateEditor({
  template,
}: {
  template: AdvancedDocumentTemplate;
}) {
  const initialTemplate = useRef(
    cloneTemplate(template.config.template as Template),
  );
  const designerContainerRef = useRef<HTMLDivElement>(null);
  const designerRef = useRef<Designer | null>(null);
  const pluginsRef = useRef<Plugins | null>(null);
  const currentTemplateRef = useRef(initialTemplate.current);
  const historyRef = useRef<Template[]>([cloneTemplate(initialTemplate.current)]);
  const historyIndexRef = useRef(0);
  const restoringHistoryRef = useRef(false);
  const saveFromDesignerRef = useRef<(next: Template) => void>(() => {});

  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [designerReady, setDesignerReady] = useState(false);
  const [documentStripOpen, setDocumentStripOpen] = useState(true);
  const [error, setError] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(template.name);
  const [pageCount, setPageCount] = useState(
    initialTemplate.current.schemas.length,
  );
  const [sampleData, setSampleData] = useState(template.config.sampleData);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [selection, setSelection] = useState<DesignerSelection | null>(null);
  const [templateRevision, setTemplateRevision] = useState(0);
  const [zoom, setZoom] = useState(0.85);

  const selectedSchema = selection?.schemas[0] ?? null;
  const schemas = currentTemplateRef.current.schemas[currentPage] ?? [];
  const staticSchemas = blankBase(currentTemplateRef.current).staticSchema ?? [];
  const repeatingHeaderCount = staticSchemas.filter(
    (schema) => schema.smarttoolsRegion === "header",
  ).length;
  const repeatingFooterCount = staticSchemas.filter(
    (schema) => schema.smarttoolsRegion === "footer",
  ).length;

  const layerItems = useMemo<LayerItem[]>(
    () =>
      schemas.map((schema, index) => ({
        id: `${currentPage}:${index}:${schema.name}`,
        index,
        schema,
      })),
    [currentPage, schemas, templateRevision],
  );

  const rememberTemplate = useCallback((next: Template) => {
    currentTemplateRef.current = cloneTemplate(next);
    setPageCount(next.schemas.length);
    setTemplateRevision((revision) => revision + 1);
    setIsDirty(true);

    if (restoringHistoryRef.current) return;
    const previous =
      historyRef.current[historyIndexRef.current] ?? initialTemplate.current;
    if (JSON.stringify(previous) === JSON.stringify(next)) return;

    const history = historyRef.current.slice(0, historyIndexRef.current + 1);
    history.push(cloneTemplate(next));
    if (history.length > HISTORY_LIMIT) history.shift();
    historyRef.current = history;
    historyIndexRef.current = history.length - 1;
    setHistoryIndex(historyIndexRef.current);
  }, []);

  const applyTemplate = useCallback((next: Template) => {
    designerRef.current?.updateTemplate(next);
  }, []);

  const persistTemplate = useCallback(
    async (publish: boolean, nextTemplate = currentTemplateRef.current) => {
      if (name.trim().length < 2) {
        setError("Template name must be at least 2 characters.");
        return;
      }

      setError("");
      setIsSaving(true);
      const formData = new FormData();
      formData.set("templateId", template.id);
      formData.set(
        "template",
        JSON.stringify({
          name: name.trim(),
          config: {
            ...template.config,
            template: nextTemplate,
            sampleData,
          },
        }),
      );

      try {
        if (publish) {
          await updateAndPublishTemplateAction(formData);
        } else {
          await updateTemplateAction(formData);
          setIsDirty(false);
          setSavedAt(new Date());
        }
      } catch (saveError) {
        setError(errorMessage(saveError));
      } finally {
        setIsSaving(false);
      }
    },
    [name, sampleData, template.config, template.id],
  );

  saveFromDesignerRef.current = (next) => {
    currentTemplateRef.current = cloneTemplate(next);
    void persistTemplate(false, next);
  };

  useEffect(() => {
    let disposed = false;
    const container = designerContainerRef.current;
    if (!container) return;

    void Promise.all([import("@pdfme/ui"), loadPlugins()])
      .then(([{ Designer: PdfmeDesigner }, plugins]) => {
        if (disposed) return;
        pluginsRef.current = plugins;
        const designer = new PdfmeDesigner({
          domContainer: container,
          template: cloneTemplate(initialTemplate.current),
          plugins,
          options: {
            sidebarOpen: false,
            zoomLevel: 0.85,
            theme: {
              token: {
                colorPrimary: "#315fea",
                borderRadius: 8,
                colorBorder: "#dce2eb",
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              },
            },
          },
        });
        designerRef.current = designer;
        designer.onChangeTemplate((next) => rememberTemplate(next));
        designer.onChangeSelection((next) => setSelection(next));
        designer.onPageChange(({ currentPage: page, totalPages }) => {
          setCurrentPage(Math.max(0, page - 1));
          setPageCount(totalPages);
        });
        designer.onSaveTemplate((next) => saveFromDesignerRef.current(next));
        setDesignerReady(true);
      })
      .catch((loadError) => {
        if (!disposed) setError(errorMessage(loadError));
      });

    return () => {
      disposed = true;
      if (designerRef.current) {
        designerRef.current.destroy();
        designerRef.current = null;
      }
    };
  }, [rememberTemplate]);

  function togglePanel(panel: Exclude<ActivePanel, null>) {
    const next = activePanel === panel ? null : panel;
    setActivePanel(next);
    designerRef.current?.updateOptions({ sidebarOpen: false });
  }

  function closePanels() {
    setActivePanel(null);
    designerRef.current?.updateOptions({ sidebarOpen: false });
  }

  function restoreHistory(direction: -1 | 1) {
    const nextIndex = historyIndexRef.current + direction;
    const next = historyRef.current[nextIndex];
    if (!next) return;
    restoringHistoryRef.current = true;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    currentTemplateRef.current = cloneTemplate(next);
    setPageCount(next.schemas.length);
    designerRef.current?.updateTemplate(cloneTemplate(next));
    restoringHistoryRef.current = false;
    setIsDirty(true);
    setTemplateRevision((revision) => revision + 1);
  }

  function updateZoom(next: number) {
    const value = Math.min(1.5, Math.max(0.4, next));
    setZoom(value);
    designerRef.current?.updateOptions({ zoomLevel: value });
  }

  function replacePageSchemas(nextSchemas: Schema[]) {
    const next = cloneTemplate(currentTemplateRef.current);
    next.schemas[currentPage] = nextSchemas;
    applyTemplate(next);
  }

  function addElement(tool: AddTool) {
    const plugin = pluginsRef.current?.[tool.pluginKey];
    if (!plugin) {
      setError(`${tool.label} is not available yet.`);
      return;
    }

    const next = cloneTemplate(currentTemplateRef.current);
    const page = next.schemas[currentPage];
    const schema = structuredClone(plugin.propPanel.defaultSchema);
    const usedNames = new Set(next.schemas.flat().map((item) => item.name));
    const baseName =
      tool.pluginKey === "qrcode"
        ? "qrCode"
        : tool.pluginKey === "code128"
          ? "barcode"
          : tool.pluginKey;
    let uniqueName = baseName;
    let suffix = 2;
    while (usedNames.has(uniqueName)) {
      uniqueName = `${baseName}${suffix}`;
      suffix += 1;
    }

    const basePdf = blankBase(next);
    const margin = Math.min(10, Math.max(3, basePdf.width * 0.05));
    const offset = (page.length % 5) * 3;
    schema.name = uniqueName;
    schema.width = Math.min(schema.width, basePdf.width - margin * 2);
    schema.height = Math.min(schema.height, basePdf.height - margin * 2);
    schema.position = {
      x: Math.min(margin + offset, basePdf.width - margin - schema.width),
      y: Math.min(margin + offset, basePdf.height - margin - schema.height),
    };
    const schemaIndex = page.push(schema);

    applyTemplate(next);
    const defaultContent = schema.content;
    if (typeof defaultContent === "string") {
      setSampleData((values) => ({
        ...values,
        [uniqueName]: defaultContent,
      }));
    }
    window.requestAnimationFrame(() => {
      designerRef.current?.selectSchemas(
        {
          name: uniqueName,
          pageIndex: currentPage,
          schemaIndex: schemaIndex - 1,
        },
        { pageIndex: currentPage, scroll: true },
      );
    });
  }

  function selectLayer(item: LayerItem) {
    designerRef.current?.selectSchemas(
      {
        name: item.schema.name,
        pageIndex: currentPage,
        schemaIndex: item.index,
      },
      { pageIndex: currentPage, scroll: true },
    );
  }

  function addPage() {
    const next = cloneTemplate(currentTemplateRef.current);
    next.schemas.push([]);
    applyTemplate(next);
    setCurrentPage(next.schemas.length - 1);
  }

  function duplicatePage(pageIndex: number) {
    const next = cloneTemplate(currentTemplateRef.current);
    next.schemas.splice(pageIndex + 1, 0, cloneTemplate({
      ...next,
      schemas: [next.schemas[pageIndex] ?? []],
    }).schemas[0]);
    applyTemplate(next);
    setCurrentPage(pageIndex + 1);
  }

  function removePage(pageIndex: number) {
    if (currentTemplateRef.current.schemas.length === 1) return;
    const next = cloneTemplate(currentTemplateRef.current);
    next.schemas.splice(pageIndex, 1);
    applyTemplate(next);
    setCurrentPage(Math.max(0, Math.min(pageIndex, next.schemas.length - 1)));
  }

  function goToPage(pageIndex: number) {
    setCurrentPage(pageIndex);
    const firstSchema = currentTemplateRef.current.schemas[pageIndex]?.[0];
    if (firstSchema) {
      designerRef.current?.selectSchemas(
        { name: firstSchema.name, pageIndex, schemaIndex: 0 },
        { pageIndex, scroll: true },
      );
    }
  }

  function bindSelection(name: string) {
    const selected = selection?.schemas[0];
    if (!selected) return;
    const next = cloneTemplate(currentTemplateRef.current);
    const schema = next.schemas[selected.pageIndex]?.[selected.schemaIndex];
    if (!schema) return;
    schema.name = name;
    schema.content = sampleData[name] ?? "";
    applyTemplate(next);
  }

  function moveSelectionToRegion(region: Region) {
    if (!selection?.schemas.length) {
      setError("Select one or more elements before creating a repeating region.");
      return;
    }
    const pageIndex = selection.pageIndex;
    const next = cloneTemplate(currentTemplateRef.current);
    const indices = selection.schemas
      .filter((selected) => selected.pageIndex === pageIndex)
      .map((selected) => selected.schemaIndex)
      .sort((a, b) => b - a);
    const moved: PdfmeSchema[] = [];
    for (const index of indices) {
      const [schema] = next.schemas[pageIndex].splice(index, 1);
      if (schema) {
        moved.unshift({
          ...(schema as PdfmeSchema),
          smarttoolsRegion: region,
        });
      }
    }
    const basePdf = blankBase(next);
    basePdf.staticSchema = [...(basePdf.staticSchema ?? []), ...moved];
    applyTemplate(next);
    setSelection(null);
  }

  function restoreRepeatingRegion(index: number) {
    const next = cloneTemplate(currentTemplateRef.current);
    const basePdf = blankBase(next);
    const staticSchema = [...(basePdf.staticSchema ?? [])];
    const [schema] = staticSchema.splice(index, 1);
    if (!schema) return;
    const { smarttoolsRegion: _region, ...editableSchema } = schema;
    next.schemas[currentPage].push(editableSchema as Schema);
    basePdf.staticSchema = staticSchema;
    applyTemplate(next);
  }

  async function previewPdf() {
    setError("");
    setIsPreviewing(true);
    const previewWindow = window.open("", "_blank");
    try {
      const [{ generate }, plugins] = await Promise.all([
        import("@pdfme/generator"),
        pluginsRef.current ? Promise.resolve(pluginsRef.current) : loadPlugins(),
      ]);
      const pdf = await generate({
        template: currentTemplateRef.current,
        inputs: [sampleData],
        plugins,
      });
      const bytes = pdf.buffer.slice(
        pdf.byteOffset,
        pdf.byteOffset + pdf.byteLength,
      ) as ArrayBuffer;
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/pdf" }),
      );
      if (previewWindow) {
        previewWindow.location.href = url;
      } else {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${template.slug}-preview.pdf`;
        anchor.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (previewError) {
      previewWindow?.close();
      setError(errorMessage(previewError));
    } finally {
      setIsPreviewing(false);
    }
  }

  function renderPanel() {
    if (!activePanel) return null;

    return (
      <aside className="absolute inset-y-4 left-4 z-30 flex w-80 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <h2 className="text-sm font-extrabold capitalize">
            {activePanel === "add" ? "Add elements" : activePanel}
          </h2>
          <button
            aria-label={`Close ${activePanel} panel`}
            className={buttonVariants({ size: "icon", variant: "ghost" })}
            onClick={closePanels}
            type="button"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>

        {activePanel === "add" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <p className="mb-4 text-xs leading-5 text-muted-foreground">
              Add an element, then position it anywhere on the canvas.
            </p>
            <div className="space-y-5">
              {ADD_TOOL_GROUPS.map((group) => (
                <section key={group}>
                  <h3 className="mb-1.5 px-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    {group}
                  </h3>
                  <div className="grid gap-1">
                    {ADD_TOOLS.filter((tool) => tool.group === group).map(
                      (tool) => {
                        const Icon = tool.icon;
                        return (
                          <button
                            aria-label={`Add ${tool.label}`}
                            className="group flex min-h-12 items-center gap-3 rounded-xl px-2.5 py-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                            disabled={!designerReady}
                            key={tool.pluginKey}
                            onClick={() => addElement(tool)}
                            type="button"
                          >
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-background text-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
                              <Icon aria-hidden="true" size={17} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-extrabold text-foreground">
                                {tool.label}
                              </span>
                              <span className="block truncate text-[10px] text-muted-foreground">
                                {tool.description}
                              </span>
                            </span>
                            <Plus
                              aria-hidden="true"
                              className="text-muted-foreground group-hover:text-primary"
                              size={14}
                            />
                          </button>
                        );
                      },
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : null}

        {activePanel === "layers" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <p className="mb-3 text-xs leading-5 text-muted-foreground">
              Page {currentPage + 1}. Drag by the handle or use the keyboard to
              change stacking order.
            </p>
            {layerItems.length ? (
              <OrderableList
                ariaLabel={`Layers on page ${currentPage + 1}`}
                className="grid gap-1.5"
                getId={(item) => item.id}
                items={layerItems}
                onReorder={(items) =>
                  replacePageSchemas(items.map((item) => item.schema))
                }
                renderItem={(item, state) => (
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                      state.isDragging
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border bg-background"
                    }`}
                  >
                    <button
                      {...state.attributes}
                      {...state.listeners}
                      aria-label={`Reorder ${item.schema.name}`}
                      className="grid size-8 shrink-0 touch-none place-items-center rounded-md text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                      ref={state.setActivatorNodeRef}
                      type="button"
                    >
                      <GripVertical aria-hidden="true" size={15} />
                    </button>
                    <button
                      className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-xs font-bold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => selectLayer(item)}
                      type="button"
                    >
                      {item.schema.name}
                    </button>
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {item.schema.type}
                    </span>
                  </div>
                )}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                This page has no elements yet.
              </p>
            )}
          </div>
        ) : null}

        {activePanel === "data" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <p className="mb-3 text-xs leading-5 text-muted-foreground">
              Edit preview values or bind the selected element to a field.
            </p>
            <div className="grid gap-3">
              {Object.entries(sampleData).map(([key, value]) => (
                <label className="grid gap-1.5" key={key}>
                  <span className="flex items-center justify-between gap-2 text-xs font-bold">
                    <span className="truncate">{key}</span>
                    <button
                      className="rounded-md px-2 py-1 text-[10px] font-extrabold text-primary outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                      disabled={!selectedSchema}
                      onClick={() => bindSelection(key)}
                      type="button"
                    >
                      Bind
                    </button>
                  </span>
                  <textarea
                    className="min-h-16 resize-y rounded-lg border border-input bg-background px-2.5 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(event) => {
                      setSampleData((values) => ({
                        ...values,
                        [key]: event.target.value,
                      }));
                      setIsDirty(true);
                    }}
                    value={value}
                  />
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {activePanel === "pages" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Document pages
              </h3>
              <button
                className={buttonVariants({ size: "sm", variant: "ghost" })}
                onClick={addPage}
                type="button"
              >
                <Plus aria-hidden="true" size={14} />
                Add
              </button>
            </div>
            <div className="mt-2 grid gap-2">
              {currentTemplateRef.current.schemas.map((page, index) => (
                <div
                  className={`flex items-center gap-2 rounded-xl border p-2 ${
                    currentPage === index
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  key={`page-${index}`}
                >
                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => goToPage(index)}
                    type="button"
                  >
                    <span className="grid size-10 place-items-center rounded-lg border bg-background text-xs font-black">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-extrabold">
                        Page {index + 1}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {page.length} elements
                      </span>
                    </span>
                  </button>
                  <button
                    aria-label={`Duplicate page ${index + 1}`}
                    className={buttonVariants({ size: "icon", variant: "ghost" })}
                    onClick={() => duplicatePage(index)}
                    type="button"
                  >
                    <FilePlus2 aria-hidden="true" size={15} />
                  </button>
                  <button
                    aria-label={`Remove page ${index + 1}`}
                    className={buttonVariants({ size: "icon", variant: "ghost" })}
                    disabled={pageCount === 1}
                    onClick={() => removePage(index)}
                    type="button"
                  >
                    <X aria-hidden="true" size={15} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Repeating regions
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Move selected elements into a header or footer repeated by
                pdfme on every generated page.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  disabled={!selection?.schemas.length}
                  onClick={() => moveSelectionToRegion("header")}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Header
                </Button>
                <Button
                  disabled={!selection?.schemas.length}
                  onClick={() => moveSelectionToRegion("footer")}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Footer
                </Button>
              </div>
              {staticSchemas.length ? (
                <div className="mt-3 grid gap-1.5">
                  {staticSchemas.map((schema, index) => (
                    <div
                      className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                      key={`${schema.name}-${index}`}
                    >
                      <span className="min-w-0 truncate text-xs font-bold">
                        {schema.name} ·{" "}
                        {String(schema.smarttoolsRegion ?? "repeat")}
                      </span>
                      <button
                        className="text-[10px] font-extrabold text-primary"
                        onClick={() => restoreRepeatingRegion(index)}
                        type="button"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </aside>
    );
  }

  return (
    <>
      <div className="grid min-h-screen place-items-center bg-muted p-6 lg:hidden">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <Maximize2
            aria-hidden="true"
            className="mx-auto text-primary"
            size={28}
          />
          <h1 className="mt-4 text-xl font-extrabold">
            Open the advanced designer on desktop
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Freeform positioning needs a larger workspace. You can still
            preview and use published templates from smaller devices.
          </p>
          <Link
            className={buttonVariants({ className: "mt-5", variant: "secondary" })}
            href="/templates"
          >
            Back to templates
          </Link>
        </div>
      </div>

      <main className="hidden h-screen min-w-[1024px] flex-col overflow-hidden bg-background lg:flex">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
          <BrandLockup
            className="mr-1 h-8 shrink-0 border-r border-border pr-4"
            href="/templates"
            name="SmartTools"
          />
          <Link
            className={buttonVariants({
              className: "shrink-0",
              size: "sm",
              variant: "ghost",
            })}
            href="/templates"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Templates
          </Link>
          <span aria-hidden="true" className="h-7 w-px bg-border" />
          <Input
            aria-label="Template name"
            className="h-9 min-w-0 max-w-72 border-transparent bg-transparent px-2 text-sm font-extrabold shadow-none hover:border-input focus-visible:border-input"
            onChange={(event) => {
              setName(event.target.value);
              setIsDirty(true);
            }}
            value={name}
          />
          <StatusBadge
            className="shrink-0 capitalize"
            variant={template.status === "published" ? "success" : "warning"}
          >
            {template.status}
          </StatusBadge>
          <span className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-bold">
            <FileText aria-hidden="true" size={14} />
            {template.documentType === "invoice" ? "Invoice" : "Receipt"} ·{" "}
            {template.config.pageFormat.replaceAll("_", " ")}
          </span>

          <div className="ml-auto flex min-w-0 items-center gap-1">
            <button
              aria-label="Undo"
              className={buttonVariants({ size: "icon", variant: "ghost" })}
              disabled={historyIndex === 0}
              onClick={() => restoreHistory(-1)}
              type="button"
            >
              <Undo2 aria-hidden="true" size={17} />
            </button>
            <button
              aria-label="Redo"
              className={buttonVariants({ size: "icon", variant: "ghost" })}
              disabled={historyIndex >= historyRef.current.length - 1}
              onClick={() => restoreHistory(1)}
              type="button"
            >
              <Redo2 aria-hidden="true" size={17} />
            </button>
            <Button
              className="hidden xl:inline-flex"
              onClick={() => togglePanel("data")}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Database aria-hidden="true" size={15} />
              Sample data
            </Button>
            <Button
              disabled={!designerReady || isPreviewing}
              onClick={() => void previewPdf()}
              size="sm"
              type="button"
              variant="secondary"
            >
              {isPreviewing ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin"
                  size={15}
                />
              ) : (
                <Eye aria-hidden="true" size={15} />
              )}
              Preview PDF
            </Button>
            <span className="hidden min-w-24 text-right text-[11px] text-muted-foreground 2xl:inline">
              {isDirty
                ? "Unsaved changes"
                : savedAt
                  ? "Saved just now"
                  : `Version ${template.version}`}
            </span>
            <Button
              disabled={isSaving || name.trim().length < 2}
              onClick={() =>
                startTransition(() => {
                  void persistTemplate(false);
                })
              }
              size="sm"
              type="button"
              variant="secondary"
            >
              <Save aria-hidden="true" size={15} />
              Save draft
            </Button>
            <Button
              disabled={isSaving || name.trim().length < 2}
              onClick={() =>
                startTransition(() => {
                  void persistTemplate(true);
                })
              }
              size="sm"
              type="button"
            >
              Publish
            </Button>
            <button
              aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
              className={buttonVariants({ size: "icon", variant: "ghost" })}
              onClick={() => {
                setFocusMode((value) => !value);
                closePanels();
              }}
              type="button"
            >
              <Focus aria-hidden="true" size={17} />
            </button>
          </div>
        </header>

        {error ? (
          <div
            className="flex min-h-10 shrink-0 items-center justify-between gap-4 border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs font-bold text-destructive"
            role="alert"
          >
            <span>{error}</span>
            <button
              aria-label="Dismiss error"
              className="rounded-md p-1 outline-none hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setError("")}
              type="button"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1">
          {!focusMode ? (
            <nav
              aria-label="Designer tools"
              className="flex w-[72px] shrink-0 flex-col items-center gap-2 border-r border-border bg-card px-2 py-4"
            >
              <button
                className={panelButtonClass(activePanel === null)}
                onClick={closePanels}
                type="button"
              >
                <MousePointer2 aria-hidden="true" size={19} />
                Select
              </button>
              <button
                aria-label="Add elements"
                className={panelButtonClass(activePanel === "add")}
                onClick={() => togglePanel("add")}
                type="button"
              >
                <Plus aria-hidden="true" size={20} />
                Add
              </button>
              <button
                className={panelButtonClass(activePanel === "layers")}
                onClick={() => togglePanel("layers")}
                type="button"
              >
                <Layers aria-hidden="true" size={19} />
                Layers
              </button>
              <button
                className={panelButtonClass(activePanel === "data")}
                onClick={() => togglePanel("data")}
                type="button"
              >
                <Database aria-hidden="true" size={19} />
                Data
              </button>
              <button
                className={panelButtonClass(activePanel === "pages")}
                onClick={() => togglePanel("pages")}
                type="button"
              >
                <FileText aria-hidden="true" size={19} />
                Pages
              </button>
            </nav>
          ) : null}

          <section
            aria-label="Template canvas"
            className="relative min-w-0 flex-1 overflow-hidden bg-[oklch(0.965_0.004_255)]"
          >
            {!designerReady ? (
              <div className="absolute inset-0 z-40 grid place-items-center bg-background/80">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                  <LoaderCircle
                    aria-hidden="true"
                    className="animate-spin text-primary"
                    size={20}
                  />
                  Loading designer…
                </div>
              </div>
            ) : null}
            <div
              className="advanced-pdfme-designer h-full w-full"
              data-field-inspector-open={Boolean(selectedSchema && !focusMode)}
              ref={designerContainerRef}
            />
            {renderPanel()}
          </section>
        </div>

        {!focusMode ? (
          <footer
            className={`shrink-0 border-t border-border bg-card transition-[height] ${
              documentStripOpen ? "h-24" : "h-10"
            }`}
          >
            <div className="flex h-full items-center gap-4 px-5">
              <button
                className="flex h-full w-32 shrink-0 items-center justify-between border-r border-border pr-4 text-xs font-extrabold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={() => setDocumentStripOpen((value) => !value)}
                type="button"
              >
                Document
                {documentStripOpen ? (
                  <ChevronDown aria-hidden="true" size={15} />
                ) : (
                  <ChevronUp aria-hidden="true" size={15} />
                )}
              </button>

              {documentStripOpen ? (
                <>
                  <div className="flex items-center gap-2">
                    {currentTemplateRef.current.schemas.map((_page, index) => (
                      <button
                        aria-label={`Go to page ${index + 1}`}
                        className={`relative grid h-16 w-12 place-items-center rounded-md border bg-background text-xs font-black outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          currentPage === index
                            ? "border-primary ring-1 ring-primary"
                            : "border-border"
                        }`}
                        key={`strip-page-${index}`}
                        onClick={() => goToPage(index)}
                        type="button"
                      >
                        <FileText
                          aria-hidden="true"
                          className="text-muted-foreground"
                          size={23}
                        />
                        <span className="absolute bottom-1 left-1 grid size-4 place-items-center rounded bg-card text-[9px] shadow-sm">
                          {index + 1}
                        </span>
                      </button>
                    ))}
                    <button
                      aria-label="Add page"
                      className="grid h-16 w-12 place-items-center rounded-md border border-dashed border-border text-muted-foreground outline-none hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={addPage}
                      type="button"
                    >
                      <Plus aria-hidden="true" size={18} />
                    </button>
                  </div>

                  <div className="hidden items-center gap-2 xl:flex">
                    <button
                      className="rounded-lg border border-border px-3 py-2 text-[11px] font-bold text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => togglePanel("pages")}
                      type="button"
                    >
                      Header · {repeatingHeaderCount || "not set"}
                    </button>
                    <button
                      className="rounded-lg border border-border px-3 py-2 text-[11px] font-bold text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => togglePanel("pages")}
                      type="button"
                    >
                      Footer · {repeatingFooterCount || "not set"}
                    </button>
                  </div>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Page {currentPage + 1} of {pageCount}
                </span>
              )}

              <div className="ml-auto flex items-center gap-4 text-[11px] font-bold text-muted-foreground">
                <span className="hidden items-center gap-2 xl:flex">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  No overflow errors
                </span>
                <span className="hidden 2xl:inline">
                  {Object.keys(sampleData).length} sample fields
                </span>
                <div className="flex items-center rounded-lg border border-border bg-background">
                  <button
                    aria-label="Zoom out"
                    className="grid size-8 place-items-center rounded-l-lg outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => updateZoom(zoom - 0.1)}
                    type="button"
                  >
                    −
                  </button>
                  <span className="min-w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    aria-label="Zoom in"
                    className="grid size-8 place-items-center rounded-r-lg outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => updateZoom(zoom + 0.1)}
                    type="button"
                  >
                    +
                  </button>
                </div>
                <span className="hidden items-center gap-1.5 2xl:flex">
                  <Check aria-hidden="true" className="text-emerald-600" size={14} />
                  pdfme ready
                </span>
              </div>
            </div>
          </footer>
        ) : null}
      </main>
      <style jsx global>{`
        .advanced-pdfme-designer .pdfme-designer-left-sidebar {
          display: none !important;
        }

        .advanced-pdfme-designer .pdfme-designer-left-sidebar + div {
          margin-left: 0 !important;
          width: 100% !important;
        }

        .advanced-pdfme-designer
          .pdfme-designer-left-sidebar
          + div
          > :first-child,
        .advanced-pdfme-designer .pdfme-designer-canvas {
          width: 100% !important;
        }

        .advanced-pdfme-designer .pdfme-designer-canvas {
          margin-right: 0 !important;
        }

        .advanced-pdfme-designer .pdfme-designer-sidebar-toggle {
          display: none !important;
        }

        .advanced-pdfme-designer .pdfme-designer-right-sidebar {
          pointer-events: none;
        }

        .advanced-pdfme-designer[data-field-inspector-open="true"]
          .pdfme-designer-right-sidebar {
          top: 16px !important;
          right: 16px !important;
          z-index: 20 !important;
          width: 400px !important;
          height: calc(100% - 32px) !important;
          pointer-events: auto;
        }

        .advanced-pdfme-designer[data-field-inspector-open="true"]
          .pdfme-designer-right-sidebar
          > div {
          position: absolute !important;
          inset: 0 !important;
          display: flex !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden;
          box-sizing: border-box;
          border: 1px solid var(--border) !important;
          border-radius: 16px;
          background: var(--card) !important;
          box-shadow:
            0 20px 25px -5px rgb(15 23 42 / 0.12),
            0 8px 10px -6px rgb(15 23 42 / 0.08);
        }

        .advanced-pdfme-designer[data-field-inspector-open="true"]
          .pdfme-designer-detail-view {
          height: 100% !important;
        }
      `}</style>
    </>
  );
}
