import {
  CircleCheck,
  Lightbulb,
  LoaderCircle,
  Sparkles,
  TrendingUp,
  Upload,
  X,
} from "lucide-react"
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  HTMLAttributes,
  ReactNode,
} from "react"

import { Button } from "#components/button"
import { cn } from "#lib/utils"

function IconTile({
  children,
  className,
  size = "default",
  tone = "accent",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  size?: "sm" | "default" | "lg"
  tone?: "accent" | "contrast" | "success" | "muted"
}) {
  const tones = {
    accent: "bg-accent text-primary",
    contrast: "bg-foreground text-background",
    success: "bg-success-soft text-success",
    muted: "bg-muted text-muted-foreground",
  }

  return (
    <span
      data-slot="icon-tile"
      data-size={size}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-lg [&_svg]:size-[22px]",
        "data-[size=sm]:size-10 data-[size=sm]:[&_svg]:size-5",
        "data-[size=lg]:size-14 data-[size=lg]:rounded-xl data-[size=lg]:[&_svg]:size-[26px]",
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

function MetricCard({
  className,
  delta,
  label,
  value,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  delta?: ReactNode
  label: ReactNode
  value: ReactNode
}) {
  return (
    <div
      data-slot="metric-card"
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border border-border bg-card p-5",
        className
      )}
      {...props}
    >
      <span className="font-caption text-[13px] text-muted-foreground">{label}</span>
      <strong className="font-heading text-[30px] leading-tight font-bold tracking-[-0.03125rem] text-foreground">
        {value}
      </strong>
      {delta ? (
        <span className="inline-flex items-center gap-1 font-caption text-xs font-semibold text-success [&_svg]:size-3.5">
          <TrendingUp aria-hidden="true" />
          {delta}
        </span>
      ) : null}
    </div>
  )
}

function SidebarNavItem({
  active = false,
  children,
  className,
  icon,
  ...props
}: ComponentProps<"a"> & {
  active?: boolean
  icon?: ReactNode
}) {
  return (
    <a
      aria-current={active ? "page" : undefined}
      data-active={active || undefined}
      data-slot="sidebar-nav-item"
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-lg px-3 py-[11px] font-sans text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[active]:bg-accent data-[active]:font-semibold data-[active]:text-primary [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-muted-foreground data-[active]:[&_svg]:text-primary",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </a>
  )
}

function ToolPageIntro({
  badge,
  category,
  className,
  description,
  title,
  ...props
}: HTMLAttributes<HTMLElement> & {
  badge?: ReactNode
  category: ReactNode
  description: ReactNode
  title: ReactNode
}) {
  return (
    <header
      data-slot="tool-page-intro"
      className={cn(
        "flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 max-w-[880px] flex-1 flex-col gap-1.5">
        <span className="font-caption text-xs font-semibold tracking-[0.0375rem] text-primary uppercase">
          {category}
        </span>
        <h1 className="font-heading text-[26px] leading-tight font-semibold tracking-[-0.01875rem] text-foreground">
          {title}
        </h1>
        <p className="font-sans text-sm leading-[1.45] text-muted-foreground">
          {description}
        </p>
      </div>
      {badge}
    </header>
  )
}

function FileUploadZone({
  children,
  className,
  description,
  icon,
  title,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  description: ReactNode
  icon?: ReactNode
  title: ReactNode
}) {
  return (
    <button
      data-slot="file-upload-zone"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2.5 rounded-xl border border-primary bg-accent p-6 text-center outline-none transition-[background-color,box-shadow] hover:bg-[#DCE9FF] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-70",
        className
      )}
      type="button"
      {...props}
    >
      <span className="text-primary [&_svg]:size-7">{icon ?? <Upload aria-hidden="true" />}</span>
      <strong className="font-heading text-base font-semibold text-foreground">{title}</strong>
      <span className="font-sans text-xs text-muted-foreground">{description}</span>
      {children}
    </button>
  )
}

function FileQueueItem({
  action,
  className,
  icon,
  metadata,
  name,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode
  icon?: ReactNode
  metadata: ReactNode
  name: ReactNode
}) {
  return (
    <div
      data-slot="file-queue-item"
      className={cn(
        "flex items-center gap-3 border-b border-border bg-card py-3",
        className
      )}
      {...props}
    >
      <IconTile size="sm">{icon}</IconTile>
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-[13px] font-semibold text-foreground">{name}</p>
        <p className="mt-0.5 truncate font-caption text-[11px] text-muted-foreground">{metadata}</p>
      </div>
      {action}
    </div>
  )
}

function ProcessingStatus({
  action,
  className,
  detail,
  progress,
  title,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode
  detail: ReactNode
  progress?: number
  title: ReactNode
}) {
  return (
    <div
      aria-live="polite"
      data-slot="processing-status"
      className={cn(
        "flex items-center gap-4 rounded-xl bg-surface-ink px-[18px] py-4 text-on-ink",
        className
      )}
      {...props}
    >
      <LoaderCircle aria-hidden="true" className="size-5 shrink-0 animate-spin" />
      <div className="min-w-0 flex-1">
        <p className="font-heading text-[13px] font-semibold">{title}</p>
        <p className="mt-1 font-sans text-[11px] text-on-ink-muted">{detail}</p>
        {progress !== undefined ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#2C313A]">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        ) : null}
      </div>
      {action}
    </div>
  )
}

function DownloadResult({
  action,
  className,
  metadata,
  title,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode
  metadata: ReactNode
  title: ReactNode
}) {
  return (
    <div
      data-slot="download-result"
      className={cn(
        "flex items-center gap-3.5 rounded-xl border border-border bg-card p-[18px]",
        className
      )}
      {...props}
    >
      <IconTile tone="success"><CircleCheck aria-hidden="true" /></IconTile>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-[3px] font-sans text-xs text-muted-foreground">{metadata}</p>
      </div>
      {action}
    </div>
  )
}

function ToolOptionsPanel({
  action,
  children,
  className,
  title = "Tool options",
  variant = "card",
  ...props
}: HTMLAttributes<HTMLElement> & {
  action?: ReactNode
  title?: ReactNode
  variant?: "card" | "plain"
}) {
  return (
    <section
      data-slot="tool-options-panel"
      data-variant={variant}
      className={cn(
        "flex w-full flex-col gap-4",
        variant === "card" && "rounded-xl border border-border bg-card p-[22px]",
        className
      )}
      {...props}
    >
      <h2 className="font-heading text-[17px] font-semibold text-foreground">{title}</h2>
      {children}
      {action ? (
        <>
          <div className="h-px bg-border" />
          <span className="font-caption text-[11px] font-semibold tracking-[0.025rem] text-muted-foreground">
            ACTION AREA
          </span>
          {action}
        </>
      ) : null}
    </section>
  )
}

function HowItWorks({
  className,
  steps,
  ...props
}: HTMLAttributes<HTMLOListElement> & {
  steps: readonly { description: ReactNode; title: ReactNode }[]
}) {
  return (
    <ol
      data-slot="how-it-works"
      className={cn(
        "grid overflow-hidden rounded-xl border border-border bg-card md:grid-cols-3",
        className
      )}
      {...props}
    >
      {steps.map((step, index) => (
        <li
          className="flex items-center gap-3 px-[22px] py-5 md:border-l md:border-border md:first:border-l-0"
          key={index}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent font-heading text-[13px] font-bold text-primary">
            {index + 1}
          </span>
          <span className="min-w-0">
            <strong className="block font-heading text-sm font-semibold text-foreground">{step.title}</strong>
            <span className="mt-0.5 block font-sans text-xs leading-[1.45] text-muted-foreground">{step.description}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function ToolSupportSections({
  action,
  className,
  result,
  source,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  action: string
  result: string
  source: string
}) {
  return (
    <div
      data-slot="tool-support-sections"
      className={cn("mt-6 grid gap-6", className)}
      {...props}
    >
      <div className="flex items-start gap-3 rounded-xl bg-success-soft p-4 text-foreground" role="status">
        <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
        <div>
          <strong className="font-heading text-sm font-semibold">Your data stays on this device</strong>
          <p className="mt-1 font-sans text-sm leading-5 text-muted-foreground">
            Nothing is uploaded. Review the result before copying or downloading it.
          </p>
        </div>
      </div>
      <HowItWorks
        steps={[
          { title: `Add ${source}`, description: `Paste or load the ${source.toLowerCase()} you want to process.` },
          { title: action, description: "Review the available options, then run the tool once." },
          { title: `Use ${result}`, description: `Check the ${result.toLowerCase()}, then copy or download it.` },
        ]}
      />
    </div>
  )
}

function CompactAction({
  children,
  className,
  icon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode }) {
  return (
    <Button
      className={cn("h-8 gap-1.5 rounded-lg px-2.5 text-[11px] [&_svg]:size-3.5 [&_svg]:text-muted-foreground", className)}
      size="sm"
      variant="outline"
      {...props}
    >
      {icon}
      {children}
    </Button>
  )
}

function InlineGuidance({
  children,
  className,
  icon,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { icon?: ReactNode }) {
  return (
    <span
      data-slot="inline-guidance"
      className={cn(
        "inline-flex items-center gap-[7px] font-sans text-xs text-muted-foreground [&_svg]:size-[15px] [&_svg]:text-primary",
        className
      )}
      {...props}
    >
      {icon ?? <Lightbulb aria-hidden="true" />}
      {children}
    </span>
  )
}

function RightPanelProcessing({
  cancel,
  className,
  detail,
  progress,
  title,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  cancel?: ReactNode
  detail: ReactNode
  progress: number
  title: ReactNode
}) {
  return (
    <div className={cn("flex w-full flex-col gap-2.5", className)} {...props}>
      <ProcessingStatus
        className="flex-col items-stretch gap-[11px] rounded-lg p-4"
        detail={detail}
        progress={progress}
        title={title}
      />
      {cancel}
    </div>
  )
}

function RightPanelResult({
  action,
  className,
  metadata,
  title,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode
  metadata: ReactNode
  title: ReactNode
}) {
  return (
    <div className={cn("flex w-full flex-col gap-3", className)} {...props}>
      <div className="flex items-center gap-3">
        <IconTile className="size-[34px] [&_svg]:size-[18px]" tone="success">
          <CircleCheck aria-hidden="true" />
        </IconTile>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 font-sans text-xs text-muted-foreground">{metadata}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

function UniversalProductHeader({
  actions,
  category,
  className,
  description,
  icon,
  navigation,
  title,
  ...props
}: HTMLAttributes<HTMLElement> & {
  actions?: ReactNode
  category: ReactNode
  description: ReactNode
  icon: ReactNode
  navigation?: ReactNode
  title: ReactNode
}) {
  return (
    <header
      data-slot="universal-product-header"
      className={cn("flex items-center justify-between gap-7", className)}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <IconTile className="size-12 rounded-xl">{icon}</IconTile>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-xl font-semibold text-foreground">{title}</h1>
            <span className="rounded-full bg-muted px-[9px] py-[5px] font-caption text-[10px] font-semibold text-muted-foreground">
              {category}
            </span>
          </div>
          <p className="mt-1 font-sans text-[13px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">{navigation}{actions}</div>
      <div className="w-[270px]">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
            <Sparkles aria-hidden="true" className="size-[13px]" />
          </span>
          <strong className="font-heading text-[15px] font-semibold text-foreground">by SmartTools</strong>
        </div>
        <p className="mt-1.5 font-sans text-[11px] leading-[1.35] text-muted-foreground">
          Free, focused tools for everyday work — private by default.
        </p>
      </div>
    </header>
  )
}

function InlineProductHeader({
  className,
  description,
  icon,
  title,
  ...props
}: HTMLAttributes<HTMLElement> & {
  description: ReactNode
  icon: ReactNode
  title: ReactNode
}) {
  return (
    <header
      data-slot="inline-product-header"
      className={cn(
        "flex h-[104px] items-center justify-between rounded-xl border border-border bg-card px-[22px] py-4 shadow-sm",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3.5">
        <IconTile className="size-[54px] rounded-xl [&_svg]:size-[25px]">{icon}</IconTile>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-[9px] py-[3px] font-caption text-[10px] font-semibold tracking-[0.03125rem] text-muted-foreground">
            <i className="size-1.5 rounded-full bg-primary" /> CURRENT TOOL
          </span>
          <h1 className="mt-1 font-heading text-[22px] font-bold tracking-[-0.01875rem] text-foreground">{title}</h1>
          <p className="mt-1 font-sans text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-[18px]">
        <div className="h-12 w-px bg-border" />
        <div className="text-right">
          <div className="flex items-center justify-end gap-[7px]">
            <Sparkles aria-hidden="true" className="size-4 text-primary" />
            <span className="font-script -rotate-3 text-xl font-semibold text-muted-foreground">by</span>
            <strong className="font-heading text-lg font-bold text-foreground">SmartTools</strong>
          </div>
          <p className="mt-1.5 font-sans text-xs text-muted-foreground">Friendly tools for getting small jobs done.</p>
        </div>
      </div>
    </header>
  )
}

function ProductFooter({
  brand,
  brandMark,
  className,
  columns,
  copyright,
  description,
  ...props
}: HTMLAttributes<HTMLElement> & {
  brand: ReactNode
  brandMark?: ReactNode
  columns: readonly {
    links: readonly { href: string; label: ReactNode }[]
    title: ReactNode
  }[]
  copyright: ReactNode
  description: ReactNode
}) {
  return (
    <footer
      data-slot="product-footer"
      className={cn("bg-surface-ink text-on-ink", className)}
      {...props}
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-6 pt-14 pb-8 lg:px-[150px]">
        <div className="grid gap-10 md:grid-cols-[300px_1fr] md:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-[30px] place-items-center rounded-lg bg-on-ink text-surface-ink [&_svg]:size-[17px]">
                {brandMark}
              </span>
              <strong className="font-heading text-[17px] font-semibold">{brand}</strong>
            </div>
            <p className="font-sans text-sm leading-[1.55] text-on-ink-muted">{description}</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column, index) => (
              <div className="flex flex-col gap-3" key={index}>
                <h2 className="font-caption text-[13px] font-semibold text-on-ink">{column.title}</h2>
                {column.links.map((link) => (
                  <a
                    className="font-sans text-sm text-on-ink-muted outline-none hover:text-on-ink focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
                    href={link.href}
                    key={link.href}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </nav>
        </div>
        <div className="h-px bg-white/10" />
        <p className="font-caption text-[13px] text-on-ink-muted">{copyright}</p>
      </div>
    </footer>
  )
}

function RemoveFileAction(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button aria-label="Remove file" size="icon-sm" variant="outline" {...props}>
      <X aria-hidden="true" className="text-muted-foreground" />
    </Button>
  )
}

export {
  CompactAction,
  DownloadResult,
  FileQueueItem,
  FileUploadZone,
  HowItWorks,
  IconTile,
  InlineGuidance,
  InlineProductHeader,
  MetricCard,
  ProcessingStatus,
  ProductFooter,
  RemoveFileAction,
  RightPanelProcessing,
  RightPanelResult,
  SidebarNavItem,
  ToolOptionsPanel,
  ToolPageIntro,
  ToolSupportSections,
  UniversalProductHeader,
}
