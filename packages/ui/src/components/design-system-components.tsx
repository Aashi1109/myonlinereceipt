import type { ComponentProps, HTMLAttributes, ReactNode } from "react"

import { Badge } from "#components/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "#components/card"
import { Toaster } from "#components/sonner"
import { Tabs, TabsList, TabsTrigger } from "#components/tabs"
import { cn } from "#lib/utils"

function Tag({ className, ...props }: Omit<ComponentProps<typeof Badge>, "variant">) {
  return (
    <Badge
      data-slot="tag"
      className={cn("border-transparent bg-muted text-muted-foreground", className)}
      variant="secondary"
      {...props}
    />
  )
}

type SegmentedControlItem = {
  disabled?: boolean
  label: ReactNode
  value: string
}

function SegmentedControl({
  className,
  items,
  ...props
}: Omit<ComponentProps<typeof Tabs>, "children"> & {
  items: readonly SegmentedControlItem[]
}) {
  return (
    <Tabs data-slot="segmented-control" className={className} {...props}>
      <TabsList variant="segmented">
        {items.map((item) => (
          <TabsTrigger disabled={item.disabled} key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

function Toast(props: ComponentProps<typeof Toaster>) {
  return <Toaster data-slot="toast" {...props} />
}

type WorkbenchShellProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  options?: ReactNode
  status?: ReactNode
  toolbar: ReactNode
  variant?: "json" | "conversion" | "media" | "utility"
}

function WorkbenchShell({
  children,
  className,
  options,
  status,
  toolbar,
  variant = "utility",
  ...props
}: WorkbenchShellProps) {
  return (
    <section
      data-slot="workbench-shell"
      data-variant={variant}
      className={cn(
        "flex h-[680px] max-h-[calc(100dvh-2rem)] min-h-[32rem] w-full flex-col overflow-hidden rounded-xl border border-input bg-card",
        variant === "media" ? "shadow-sm" : variant === "conversion" ? "shadow-md" : "shadow-lg",
        "max-[54rem]:h-auto max-[54rem]:max-h-none max-[54rem]:min-h-0 max-[54rem]:overflow-visible",
        className
      )}
      {...props}
    >
      <div
        data-slot="workbench-toolbar"
        className={cn(
          "flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-2",
          variant === "conversion" && "h-[76px] min-h-[76px] py-0",
          variant === "utility" && "h-[68px] min-h-[68px] py-0"
        )}
      >
        {toolbar}
      </div>
      {options ? (
        <div
          data-slot="workbench-options"
          className="flex h-12 shrink-0 items-center gap-6 border-b border-border bg-muted px-5"
        >
          {options}
        </div>
      ) : null}
      <div data-slot="workbench-content" className="min-h-0 flex-1">
        {children}
      </div>
      {status ? (
        <div
          data-slot="workbench-status"
          className="flex h-[42px] shrink-0 items-center justify-between border-t border-border px-4"
        >
          {status}
        </div>
      ) : null}
    </section>
  )
}

function JsonFormatterWorkbench(props: Omit<WorkbenchShellProps, "variant">) {
  return <WorkbenchShell data-slot="json-formatter-workbench" variant="json" {...props} />
}

function DataConversionWorkbench(props: Omit<WorkbenchShellProps, "variant">) {
  return <WorkbenchShell data-slot="data-conversion-workbench" variant="conversion" {...props} />
}

function UtilityWorkbench(props: Omit<WorkbenchShellProps, "variant">) {
  return <WorkbenchShell data-slot="utility-workbench" variant="utility" {...props} />
}

function ToolPageSystemControls({
  actions,
  children,
  className,
  description = "Shared inputs, preferences, status, and actions for this browser-local tool.",
  preferences,
  title = "Tool session controls",
  ...props
}: HTMLAttributes<HTMLElement> & {
  actions?: ReactNode
  description?: ReactNode
  preferences?: ReactNode
  title?: ReactNode
}) {
  return (
    <section
      data-slot="tool-page-system-controls"
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
    >
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
      <div
        data-slot="tool-system-inputs"
        className="grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)]"
      >
        {children}
      </div>
      {preferences ? (
        <div
          data-slot="tool-system-preferences"
          className="flex w-full flex-wrap items-center gap-x-5 gap-y-3"
        >
          {preferences}
        </div>
      ) : null}
      {actions ? (
        <div
          data-slot="tool-system-actions"
          className="flex w-full flex-wrap items-center justify-end gap-2.5"
        >
          {actions}
        </div>
      ) : null}
    </section>
  )
}

export {
  DataConversionWorkbench,
  JsonFormatterWorkbench,
  SegmentedControl,
  Tag,
  Toast,
  ToolPageSystemControls,
  UtilityWorkbench,
  WorkbenchShell,
}
export type { SegmentedControlItem, WorkbenchShellProps }
