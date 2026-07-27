"use client";

import { OrderableList } from "@smarttools/ui/components/OrderableList";
import {
  AccountNavigation,
  Alert,
  AlertBanner,
  AlertDescription,
  AlertTitle,
  AppContainer,
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
  Badge,
  BrandLockup,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CatalogCard,
  Checkbox,
  CompactAction,
  DownloadResult,
  FileQueueItem,
  FileUploadZone,
  CheckboxControl,
  DangerZone,
  DESIGN_SYSTEM_COMPONENTS,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyState,
  EmptyTitle,
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldRoot,
  FieldSeparator,
  FieldSet,
  FieldTitle,
  HowItWorks,
  IconTile,
  InlineGuidance,
  Input,
  Label,
  MetricCard,
  PageHero,
  ProcessingStatus,
  ProductHeader,
  RightPanelResult,
  SidebarNavItem,
  RadioGroup,
  RadioGroupItem,
  SectionCard,
  SectionHeading,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Separator,
  StatusBadge,
  Switch,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
  Toaster,
  ToolNav,
  ToolOptionsPanel,
  ToolPageIntro,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  ToolPageHeader,
} from "@smarttools/ui";
import {
  AlertTriangle,
  Bell,
  Check,
  Copy,
  FilePlus2,
  FileText,
  GripVertical,
  Info,
  MoreHorizontal,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

const sections = [
  ["#foundations", "Foundations"],
  ["#actions", "Actions"],
  ["#forms", "Forms"],
  ["#navigation", "Navigation"],
  ["#feedback", "Feedback"],
  ["#data", "Data"],
  ["#coverage", "Coverage"],
  ["#compositions", "Compositions"],
] as const;

const swatches = [
  { className: "bg-primary", label: "Accent", value: "#0066FF" },
  { className: "bg-accent", label: "Accent soft", value: "#E8F0FF" },
  { className: "bg-foreground", label: "Ink", value: "#1A1A1A" },
  { className: "bg-muted", label: "Muted", value: "#F6F7F9" },
  { className: "bg-success", label: "Success", value: "#12A150" },
  { className: "bg-warning", label: "Warning", value: "#B45309" },
  { className: "bg-destructive", label: "Danger", value: "#DC2626" },
] as const;

const initialDocuments = [
  { id: "receipt", label: "Receipt summary" },
  { id: "invoice", label: "Invoice details" },
  { id: "notes", label: "Internal notes" },
];

function Specimen({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={className}>
      <p className="mb-3 font-caption text-caption font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

export default function DesignSystemPage() {
  const [documents, setDocuments] = useState(initialDocuments);

  return (
    <>
      <ToolPageHeader
        actions={<StatusBadge variant="success">Live components</StatusBadge>}
        description="Every component below is rendered from @smarttools/ui with the tokens and visual language defined in design.pen."
        eyebrow="Design system"
        title="Component showcase"
      />

      <ToolNav
        ariaLabel="Component showcase sections"
        className="sticky top-0 z-20 -mx-4 border-y border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        items={sections.map(([href, label]) => ({ href, label }))}
      />

      <div className="mt-12 space-y-16">
        <section className="scroll-mt-24" id="foundations">
          <SectionHeading
            description="The shared palette, typography, radius, spacing, and elevation from design.pen."
            eyebrow="01"
            title="Foundations"
          />
          <SectionCard>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {swatches.map((swatch) => (
                <div
                  className="overflow-hidden rounded-xl border border-border bg-card"
                  key={swatch.label}
                >
                  <div className={`h-20 ${swatch.className}`} />
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm font-semibold">{swatch.label}</span>
                    <code className="font-mono text-caption text-muted-foreground">
                      {swatch.value}
                    </code>
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="grid gap-8 lg:grid-cols-3">
              <Specimen label="Heading · Inter">
                <p className="font-heading text-3xl font-semibold tracking-tight">
                  Make work feel lighter.
                </p>
              </Specimen>
              <Specimen label="Body · Geist">
                <p className="max-w-sm font-sans text-sm leading-6 text-muted-foreground">
                  Calm, readable interface copy for tools people need to trust.
                </p>
              </Specimen>
              <Specimen label="Caption · Funnel Sans">
                <p className="font-caption text-caption font-semibold uppercase tracking-[0.05em] text-primary">
                  Privacy first
                </p>
              </Specimen>
            </div>
            <Separator />
            <Specimen label="App container">
              <div className="rounded-xl bg-muted py-4">
                <AppContainer className="max-w-none">
                  <div className="rounded-lg border border-dashed border-primary/40 bg-card px-4 py-3 text-center font-caption text-xs text-muted-foreground">
                    Responsive content boundary
                  </div>
                </AppContainer>
              </div>
            </Specimen>
          </SectionCard>
        </section>

        <section className="scroll-mt-24" id="actions">
          <SectionHeading
            description="Action hierarchy stays clear while every state uses the same focus and spacing rules."
            eyebrow="02"
            title="Actions and badges"
          />
          <SectionCard>
            <Specimen label="Button variants">
              <div className="flex flex-wrap items-center gap-3">
                <Button>
                  <Plus />
                  Primary
                </Button>
                <Button variant="strong">Strong</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">
                  <Trash2 />
                  Destructive
                </Button>
                <Button variant="danger-subtle">Danger subtle</Button>
                <Button variant="link">Link action</Button>
                <Button disabled>Disabled</Button>
              </div>
            </Specimen>
            <Separator />
            <div className="grid gap-8 lg:grid-cols-2">
              <Specimen label="Button sizes">
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="xs">Extra small</Button>
                  <Button size="sm">Small</Button>
                  <Button>Default</Button>
                  <Button size="lg">Large</Button>
                </div>
              </Specimen>
              <Specimen label="Icon actions">
                <div className="flex flex-wrap items-center gap-3">
                  <Button aria-label="Add item" size="icon-xs" variant="outline">
                    <Plus />
                  </Button>
                  <Button aria-label="Copy value" size="icon-sm" variant="outline">
                    <Copy />
                  </Button>
                  <Button aria-label="Notifications" size="icon" variant="outline">
                    <Bell />
                  </Button>
                  <Button aria-label="Upload file" size="icon-lg">
                    <Upload />
                  </Button>
                </div>
              </Specimen>
            </div>
            <Separator />
            <div className="grid gap-8 lg:grid-cols-2">
              <Specimen label="Badge variants">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="ghost">Ghost</Badge>
                  <Badge variant="link">Link</Badge>
                </div>
              </Specimen>
              <Specimen label="Status badges">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge>Disabled</StatusBadge>
                  <StatusBadge variant="info">In review</StatusBadge>
                  <StatusBadge variant="success">Available</StatusBadge>
                  <StatusBadge variant="warning">Setup required</StatusBadge>
                  <StatusBadge variant="danger">Failed</StatusBadge>
                  <StatusBadge variant="archived">Archived</StatusBadge>
                </div>
              </Specimen>
            </div>
          </SectionCard>
        </section>

        <section className="scroll-mt-24" id="forms">
          <SectionHeading
            description="Native inputs and Radix controls share one accessible field language."
            eyebrow="03"
            title="Form controls"
          />
          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard>
              <SectionHeading
                className="mb-0"
                description="Compatibility field composition used across the product."
                title="Common fields"
              />
              <Field
                description="We will only use this for document updates."
                htmlFor="showcase-email"
                label="Email"
                required
              >
                <Input
                  defaultValue="jane@company.com"
                  id="showcase-email"
                  type="email"
                />
              </Field>
              <Field
                error="Enter a valid invoice reference."
                htmlFor="showcase-reference"
                label="Invoice reference"
              >
                <Input
                  aria-invalid
                  defaultValue="INV /"
                  id="showcase-reference"
                />
              </Field>
              <Field htmlFor="showcase-message" label="Message">
                <Textarea
                  defaultValue="Thanks for your business."
                  id="showcase-message"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field htmlFor="showcase-document-type" label="Document type">
                  <Select defaultValue="receipt">
                    <SelectTrigger id="showcase-document-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receipt">Receipt</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field htmlFor="showcase-template" label="Template">
                  <Select defaultValue="classic">
                    <SelectTrigger id="showcase-template">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Simple</SelectLabel>
                        <SelectItem value="classic">Classic</SelectItem>
                        <SelectItem value="compact">Compact</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Expressive</SelectLabel>
                        <SelectItem value="bold">Bold</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeading
                className="mb-0"
                description="Composable shadcn field primitives."
                title="Primitive field group"
              />
              <FieldSet>
                <FieldLegend>Delivery preferences</FieldLegend>
                <FieldGroup>
                  <FieldRoot orientation="horizontal">
                    <Switch defaultChecked id="showcase-auto-save" />
                    <FieldContent>
                      <FieldLabel htmlFor="showcase-auto-save">Auto-save drafts</FieldLabel>
                      <FieldDescription>
                        Keep local changes while you work.
                      </FieldDescription>
                    </FieldContent>
                  </FieldRoot>
                  <FieldSeparator>Or choose manually</FieldSeparator>
                  <FieldRoot orientation="horizontal">
                    <CheckboxControl defaultChecked id="showcase-confirmation" />
                    <FieldContent>
                      <FieldTitle>Email confirmation</FieldTitle>
                      <FieldLabel
                        className="sr-only"
                        htmlFor="showcase-confirmation"
                      >
                        Enable email confirmation
                      </FieldLabel>
                      <FieldDescription>
                        Send a copy after each successful export.
                      </FieldDescription>
                    </FieldContent>
                  </FieldRoot>
                  <FieldRoot data-invalid>
                    <FieldLabel htmlFor="showcase-required-code">Reference code</FieldLabel>
                    <Input
                      aria-invalid
                      id="showcase-required-code"
                      placeholder="Required"
                    />
                    <FieldError>This field is required.</FieldError>
                  </FieldRoot>
                </FieldGroup>
              </FieldSet>
            </SectionCard>

            <SectionCard>
              <SectionHeading className="mb-0" title="Selection controls" />
              <Checkbox
                defaultChecked
                description="Process the next file as soon as it is added."
                label="Automatic processing"
              />
              <Checkbox
                description="This option is unavailable for local-only sessions."
                disabled
                label="Share with team"
              />
              <div>
                <Label className="mb-3 block">Export format</Label>
                <RadioGroup defaultValue="pdf">
                  {[
                    ["pdf", "PDF document"],
                    ["png", "PNG images"],
                    ["json", "Structured JSON"],
                  ].map(([value, label]) => (
                    <div className="flex items-center gap-3" key={value}>
                      <RadioGroupItem id={`showcase-${value}`} value={value} />
                      <Label htmlFor={`showcase-${value}`}>{label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeading className="mb-0" title="Switch scale and state" />
              <div className="flex flex-wrap items-center gap-8">
                <div className="flex items-center gap-3">
                  <Switch defaultChecked id="switch-small" size="sm" />
                  <Label htmlFor="switch-small">Small</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch defaultChecked id="switch-default" />
                  <Label htmlFor="switch-default">Default</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch id="switch-large" size="lg" />
                  <Label htmlFor="switch-large">Large</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch disabled id="switch-disabled" />
                  <Label htmlFor="switch-disabled">Disabled</Label>
                </div>
              </div>
            </SectionCard>
          </div>
        </section>

        <section className="scroll-mt-24" id="navigation">
          <SectionHeading
            description="Low-profile navigation keeps attention on the working surface."
            eyebrow="04"
            title="Navigation"
          />
          <SectionCard>
            <Specimen label="Tabs">
              <Tabs defaultValue="edit">
                <TabsList>
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                  <TabsTrigger value="items">Line items</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent
                  className="rounded-lg bg-muted p-5 text-sm text-muted-foreground"
                  value="edit"
                >
                  Edit fields and document settings here.
                </TabsContent>
                <TabsContent
                  className="rounded-lg bg-muted p-5 text-sm text-muted-foreground"
                  value="items"
                >
                  Manage line items and totals here.
                </TabsContent>
                <TabsContent
                  className="rounded-lg bg-muted p-5 text-sm text-muted-foreground"
                  value="preview"
                >
                  Review the final document here.
                </TabsContent>
              </Tabs>
            </Specimen>
            <Separator />
            <div className="grid gap-8 lg:grid-cols-2">
              <Specimen label="Segmented control">
                <Tabs defaultValue="input">
                  <TabsList variant="segmented">
                    <TabsTrigger value="input">Input</TabsTrigger>
                    <TabsTrigger value="result">Result</TabsTrigger>
                  </TabsList>
                </Tabs>
              </Specimen>
              <Specimen label="Tooltip">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button aria-label="Copy value" size="icon" variant="outline">
                        <Copy />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy value</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Specimen>
            </div>
            <Separator />
            <div className="grid gap-8 lg:grid-cols-[1fr_auto_1fr]">
              <Specimen label="Tool navigation">
                <ToolNav
                  ariaLabel="Example product sections"
                  items={[
                    { current: true, href: "#navigation", label: "Documents" },
                    { href: "#navigation", label: "Templates" },
                    { href: "#navigation", label: "Settings" },
                  ]}
                />
              </Specimen>
              <Separator
                className="hidden min-h-20 lg:block"
                orientation="vertical"
              />
              <Specimen label="Brand lockup">
                <BrandLockup href="/admin/design-system" name="Paperwork" />
              </Specimen>
            </div>
          </SectionCard>
        </section>

        <section className="scroll-mt-24" id="feedback">
          <SectionHeading
            description="Messages use tone, iconography, and color without relying on color alone."
            eyebrow="05"
            title="Feedback and empty states"
          />
          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard>
              <SectionHeading className="mb-0" title="Alerts" />
              <Alert className="bg-accent">
                <Info />
                <AlertTitle>No account needed</AlertTitle>
                <AlertDescription>
                  Your data stays in your browser unless you choose to save it.
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertTitle>Export failed</AlertTitle>
                <AlertDescription>
                  Check the source file and try again.
                </AlertDescription>
              </Alert>
              <AlertBanner title="Ready to export" variant="success">
                All validation checks passed.
              </AlertBanner>
              <AlertBanner title="Review required" variant="warning">
                One line item is missing a description.
              </AlertBanner>
              <AlertBanner title="Could not save" variant="error">
                Your changes remain available in this browser.
              </AlertBanner>
            </SectionCard>

            <SectionCard>
              <SectionHeading
                action={
                  <Button
                    onClick={() => toast.success("Receipt saved")}
                    size="sm"
                    variant="secondary"
                  >
                    <Bell />
                    Show toast
                  </Button>
                }
                className="mb-0"
                description="Use the button to inspect the live toast."
                title="Toast"
              />
              <div className="flex w-fit items-center gap-2.5 rounded-lg bg-surface-ink px-4 py-[13px] text-sm font-medium text-white shadow-[0_8px_24px_#00000026]">
                <span className="grid size-5 place-items-center rounded-full bg-success text-white">
                  <Check className="size-3" />
                </span>
                Receipt saved
              </div>
              <AlertBanner
                action={
                  <Button size="sm" variant="outline">
                    Review
                  </Button>
                }
                title="Information"
              >
                This banner also supports a contextual action.
              </AlertBanner>
            </SectionCard>

            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FilePlus2 />
                </EmptyMedia>
                <EmptyTitle>No documents yet</EmptyTitle>
                <EmptyDescription>
                  Create your first receipt or invoice. It takes about a minute.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm">
                  <Plus />
                  New document
                </Button>
              </EmptyContent>
            </Empty>

            <EmptyState
              action={<Button size="sm">Upload file</Button>}
              description="Drop a supported file here or browse your device."
              icon={<Upload />}
              title="Nothing in the queue"
            />
          </div>
        </section>

        <section className="scroll-mt-24" id="data">
          <SectionHeading
            description="Structured surfaces keep dense information readable and actionable."
            eyebrow="06"
            title="Cards, people, tables, and ordering"
          />
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly documents</CardTitle>
                <CardDescription>Usage across all paperwork tools.</CardDescription>
                <CardAction>
                  <Button aria-label="More options" size="icon-sm" variant="ghost">
                    <MoreHorizontal />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-4xl font-semibold tracking-tight">1,284</p>
                <p className="mt-1 font-caption text-xs font-semibold text-success">
                  +12% this month
                </p>
              </CardContent>
              <CardFooter className="border-t">
                <Button size="sm" variant="secondary">
                  View usage
                </Button>
              </CardFooter>
            </Card>

            <SectionCard>
              <SectionHeading className="mb-0" title="Avatars" />
              <AvatarGroup>
                <Avatar size="lg">
                  <AvatarImage
                    alt="Google account"
                    src="/auth/google-g-logo.png"
                  />
                  <AvatarFallback>JC</AvatarFallback>
                  <AvatarBadge />
                </Avatar>
                <Avatar size="lg">
                  <AvatarFallback>AP</AvatarFallback>
                </Avatar>
                <Avatar size="lg">
                  <AvatarFallback>NK</AvatarFallback>
                </Avatar>
                <AvatarGroupCount>+8</AvatarGroupCount>
              </AvatarGroup>
              <div className="flex items-center gap-4">
                <Avatar size="sm">
                  <AvatarFallback>S</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>M</AvatarFallback>
                </Avatar>
                <Avatar size="lg">
                  <AvatarFallback>L</AvatarFallback>
                </Avatar>
              </div>
            </SectionCard>

            <SectionCard className="xl:col-span-2">
              <SectionHeading className="mb-0" title="Table" />
              <div className="overflow-hidden rounded-xl border border-border">
                <Table>
                  <TableCaption>Current admin access.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Documents</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Jordan Chen</TableCell>
                      <TableCell>Administrator</TableCell>
                      <TableCell>
                        <StatusBadge variant="success">Active</StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">184</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Avery Patel</TableCell>
                      <TableCell>Editor</TableCell>
                      <TableCell>
                        <StatusBadge variant="warning">Invited</StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">72</TableCell>
                    </TableRow>
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right">256</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </SectionCard>

            <SectionCard className="xl:col-span-2">
              <SectionHeading
                className="mb-0"
                description="Drag with the handle, or focus it and use the keyboard."
                title="Orderable list"
              />
              <OrderableList
                ariaLabel="Document section order"
                className="grid gap-2"
                getId={(item) => item.id}
                getLabel={(item) => item.label}
                items={documents}
                onReorder={setDocuments}
                renderItem={(item, state) => (
                  <div
                    className={`flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 ${
                      state.isDragging ? "shadow-lg" : ""
                    }`}
                  >
                    <Button
                      {...state.attributes}
                      {...state.listeners}
                      aria-label={`Reorder ${item.label}`}
                      ref={state.setActivatorNodeRef}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <GripVertical />
                    </Button>
                    <FileText className="size-4 text-primary" />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </div>
                )}
              />
            </SectionCard>
          </div>
        </section>

        <section className="scroll-mt-24" id="coverage">
          <SectionHeading
            description="Every reusable design.pen node is mapped to a public @smarttools/ui implementation."
            eyebrow="07"
            title={`${DESIGN_SYSTEM_COMPONENTS.length} component implementations`}
          />
          <SectionCard>
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Design component</TableHead>
                    <TableHead>Code implementation</TableHead>
                    <TableHead className="text-right">Design ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DESIGN_SYSTEM_COMPONENTS.map((component) => (
                    <TableRow key={component.designId}>
                      <TableCell className="font-medium">
                        {component.designName}
                      </TableCell>
                      <TableCell>
                        <code className="font-mono text-xs text-primary">
                          {component.implementation}
                        </code>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {component.designId}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </section>

        <section className="scroll-mt-24" id="compositions">
          <SectionHeading
            description="Shared product patterns assembled from the primitives above."
            eyebrow="08"
            title="Product compositions"
          />
          <div className="space-y-6">
            <SectionCard>
              <ToolPageIntro
                badge={<StatusBadge variant="success">Private · local</StatusBadge>}
                category="Media tools"
                description="Upload, remove, and reorder the same source files used on desktop."
                title="Complete one clear task"
              />
              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="space-y-4">
                  <FileUploadZone
                    description="PNG, JPG or WebP · 20 MB · processed on this device"
                    title="Add or upload images"
                  />
                  <FileQueueItem
                    action={<CompactAction icon={<Trash2 />}>Remove</CompactAction>}
                    icon={<FileText />}
                    metadata="2400 × 1600 px · 3.8 MB"
                    name="source-file.png"
                  />
                  <ProcessingStatus
                    action={<Button size="sm" variant="secondary">Cancel</Button>}
                    detail="Working on item 2 of 3 · about 4 seconds left"
                    progress={68}
                    title="Processing · 68%"
                  />
                  <DownloadResult
                    action={<Button>Download file</Button>}
                    metadata="output-file.png · 1.2 MB"
                    title="Your file is ready"
                  />
                </div>
                <ToolOptionsPanel action={<Button className="w-full">Run tool</Button>}>
                  <Field htmlFor="pattern-format" label="Output format">
                    <Select defaultValue="auto">
                      <SelectTrigger id="pattern-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <InlineGuidance>Use the example to get started</InlineGuidance>
                </ToolOptionsPanel>
              </div>
              <HowItWorks
                steps={[
                  { title: "Add files", description: "Choose local source files." },
                  { title: "Set options", description: "Adjust only what you need." },
                  { title: "Download", description: "Save the finished result." },
                ]}
              />
            </SectionCard>

            <div className="grid gap-6 lg:grid-cols-3">
              <MetricCard delta="+12% this month" label="Documents created" value="1,284" />
              <div className="rounded-xl bg-muted p-3">
                <SidebarNavItem active href="#compositions" icon={<FileText />}>
                  Documents
                </SidebarNavItem>
              </div>
              <div className="flex items-center gap-3">
                <IconTile><ReceiptText /></IconTile>
                <RightPanelResult
                  action={<Button className="w-full">Download file</Button>}
                  metadata="output-file · ready to save"
                  title="Your file is ready"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <ProductHeader
                actions={
                  <AccountNavigation
                    returnTo="/admin/design-system"
                    user={{ name: "Jordan Chen" }}
                  />
                }
                href="/admin/design-system"
                name="Paperwork"
              />
              <PageHero
                actions={
                  <>
                    <Button>Create receipt</Button>
                    <Button variant="secondary">View sample</Button>
                  </>
                }
                compact
                description="A focused page hero composed from the same type, spacing, and actions."
                eyebrow={
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="size-4" />
                    Fast and private
                  </span>
                }
                title="Create polished documents in minutes."
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <CatalogCard
                action="Open tool"
                description="Build a clean receipt from any device."
                href="#compositions"
                icon={<ReceiptText />}
                status={<StatusBadge variant="success">Available</StatusBadge>}
                title="Receipt maker"
              />
              <CatalogCard
                action="View details"
                description="Convert source files without uploading them."
                href="#compositions"
                icon={<ShieldCheck />}
                status={<StatusBadge variant="info">Private</StatusBadge>}
                title="Local converter"
              />
              <CatalogCard
                action="Configure"
                description="Keep recurring document settings consistent."
                href="#compositions"
                icon={<Sparkles />}
                status={<StatusBadge variant="warning">Setup</StatusBadge>}
                title="Smart templates"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard>
                <SectionHeading
                  className="mb-0"
                  description="The standard elevated content surface."
                  title="Section card"
                />
                <p className="text-sm leading-6 text-muted-foreground">
                  Use this for related settings, forms, and supporting information.
                </p>
                <Button className="w-fit" size="sm">
                  Save changes
                </Button>
              </SectionCard>
              <DangerZone>
                <SectionHeading
                  className="mb-4"
                  description="Destructive actions stay visually isolated."
                  title="Danger zone"
                />
                <Button variant="destructive">
                  <Trash2 />
                  Delete workspace
                </Button>
              </DangerZone>
            </div>
          </div>
        </section>
      </div>
      <Toaster position="bottom-right" />
    </>
  );
}
