import { cloneElement } from "react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import smartToolsIcon from "./assets/smarttools-icon.png";
import { cn } from "./lib/utils.ts";

export function AppContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}

export type AccountNavigationProps = {
  className?: string;
  returnTo: string;
  user: { name: string } | null;
};

export function AccountNavigation({
  className,
  returnTo,
  user,
}: AccountNavigationProps) {
  const target = `${user ? "/auth/profile" : "/auth"}?${new URLSearchParams({ returnTo })}`;
  const accountName = user?.name.trim() || "Account";

  return (
    <nav aria-label="Account" className={cn("flex items-center gap-3 text-sm", className)}>
      {user ? (
        <a
          aria-label={`Open profile for ${accountName}`}
          className="group inline-flex min-h-11 max-w-48 items-center gap-2 rounded-xl border border-border bg-background p-1.5 pr-3 text-foreground no-underline outline-none transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href={target}
          title={accountName}
        >
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-black text-primary"
          >
            {accountName.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-xs font-extrabold">{accountName}</span>
            <span className="block text-[0.6875rem] font-semibold text-muted-foreground">
              Profile
            </span>
          </span>
        </a>
      ) : (
        <a
          className="font-bold text-inherit underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href={target}
        >
          Sign in
        </a>
      )}
    </nav>
  );
}

export function BrandLockup({
  className,
  href,
  name,
}: {
  className?: string;
  href: string;
  name: string;
}) {
  return (
    <a
      className={cn(
        "inline-flex h-8 items-stretch gap-2.5 rounded-lg text-primary no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      href={href}
    >
      <img
        alt=""
        className="aspect-square h-full w-auto shrink-0"
        height={32}
        src={smartToolsIcon.src}
        width={32}
      />
      <span className="flex h-full flex-col justify-center gap-1 leading-none">
        <span className="block text-lg font-extrabold leading-none tracking-tight">{name}</span>
        {name !== "SmartTools" ? (
          <span className="text-caption block font-semibold tracking-wide text-muted-foreground">
            by SmartTools
          </span>
        ) : null}
      </span>
    </a>
  );
}

export function ProductHeader({
  actions,
  className,
  href,
  name,
}: {
  actions?: ReactNode;
  className?: string;
  href: string;
  name: string;
}) {
  return (
    <header className={cn("border-b border-border bg-card print:hidden", className)}>
      <AppContainer className="flex min-h-16 flex-wrap items-center justify-between gap-4 py-3">
        <BrandLockup href={href} name={name} />
        {actions}
      </AppContainer>
    </header>
  );
}

export function ToolNav({
  ariaLabel = "Tools",
  className,
  items,
}: {
  ariaLabel?: string;
  className?: string;
  items: readonly { current?: boolean; href: string; label: string }[];
}) {
  return (
    <nav aria-label={ariaLabel} className={cn("overflow-x-auto", className)}>
      <div className="flex min-w-max gap-2">
        {items.map((item) => (
          <a
            aria-current={item.current ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center whitespace-nowrap rounded-lg px-3 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-9",
              item.current
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function PageHero({
  align = "left",
  actions,
  className,
  compact = false,
  description,
  eyebrow,
  title,
}: {
  align?: "left" | "center";
  actions?: ReactNode;
  className?: string;
  compact?: boolean;
  description: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
}) {
  return (
    <section className={cn(compact ? "py-10 lg:py-12" : "py-16 lg:py-20", className)}>
      <AppContainer>
        {eyebrow ? <p className={cn(compact ? "mb-3" : "mb-4", "text-xs font-extrabold uppercase tracking-[0.16em] text-primary", align === "center" && "text-center")}>{eyebrow}</p> : null}
        <h1 className={cn("max-w-3xl font-black tracking-tight text-foreground", compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl", align === "center" && "mx-auto text-center")}>{title}</h1>
        <p className={cn("max-w-2xl text-muted-foreground", compact ? "mt-3 text-sm leading-6 sm:text-base" : "mt-5 text-base leading-7 sm:text-lg", align === "center" && "mx-auto text-center")}>{description}</p>
        {actions ? <div className={cn(compact ? "mt-5" : "mt-8", "flex flex-wrap gap-3", align === "center" && "justify-center")}>{actions}</div> : null}
      </AppContainer>
    </section>
  );
}

export function ToolPageHeader({
  actions,
  className,
  description,
  eyebrow,
  inlineEyebrow = false,
  title,
}: {
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  inlineEyebrow?: boolean;
  title: ReactNode;
}) {
  const titleNode = (
    <h1
      className={cn(
        "text-3xl font-black tracking-tight text-foreground",
        inlineEyebrow && "min-w-0 break-words",
      )}
    >
      {title}
    </h1>
  );
  const eyebrowNode = eyebrow ? (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-primary",
        inlineEyebrow ? "max-w-full" : "mb-2",
      )}
    >
      {eyebrow}
    </div>
  ) : null;

  return (
    <header className={cn("mb-8 flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className={cn(inlineEyebrow && "min-w-0")}>
        {inlineEyebrow ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            {titleNode}
            {eyebrowNode}
          </div>
        ) : (
          <>
            {eyebrowNode}
            {titleNode}
          </>
        )}
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionHeading({
  action,
  className,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div>
        {eyebrow ? <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.12em] text-primary">{eyebrow}</p> : null}
        <h2 className="text-lg font-extrabold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = "default" | "strong" | "secondary" | "outline" | "ghost" | "destructive" | "danger-subtle";
type ButtonSize = "sm" | "default" | "lg" | "icon";

export function buttonVariants({
  className,
  size = "default",
  variant = "default",
}: {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
} = {}) {
  const variants: Record<ButtonVariant, string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    strong: "bg-card-foreground text-card hover:bg-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    "danger-subtle": "border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10",
  };
  const sizes: Record<ButtonSize, string> = {
    sm: "h-9 rounded-lg px-3",
    default: "h-10 rounded-lg px-4",
    lg: "h-12 rounded-lg px-5",
    icon: "size-10 rounded-lg",
  };

  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  className,
  ref,
  size,
  type = "button",
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: Ref<HTMLButtonElement>;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return <button className={buttonVariants({ className, size, variant })} ref={ref} type={type} {...props} />;
}

const controlClassName =
  "w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-destructive/20";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClassName, "h-10", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClassName, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClassName, "min-h-28 resize-y py-2.5", className)} {...props} />;
}

export function Field({
  children,
  className,
  description,
  error,
  htmlFor,
  label,
  required,
}: {
  children: ReactElement<{
    "aria-describedby"?: string;
    "aria-errormessage"?: string;
    "aria-invalid"?: boolean | "false" | "grammar" | "spelling" | "true";
    id?: string;
  }>;
  className?: string;
  description?: ReactNode;
  error?: ReactNode;
  htmlFor: string;
  label: ReactNode;
  required?: boolean;
}) {
  const descriptionId = description ? `${htmlFor}-description` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  const describedBy = [children.props["aria-describedby"], descriptionId]
    .filter(Boolean)
    .join(" ") || undefined;
  const errorMessage = [children.props["aria-errormessage"], errorId]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <label className="text-xs font-bold text-foreground" htmlFor={htmlFor}>
        {label}{required ? <span className="ml-1 font-medium text-muted-foreground">(required)</span> : null}
      </label>
      {cloneElement(children, {
        "aria-describedby": describedBy,
        "aria-errormessage": errorMessage,
        "aria-invalid": error ? true : children.props["aria-invalid"],
        id: htmlFor,
      })}
      {description ? <p className="text-xs leading-5 text-muted-foreground" id={descriptionId}>{description}</p> : null}
      {error ? <p className="text-xs font-semibold text-destructive" id={errorId} role="alert">{error}</p> : null}
    </div>
  );
}

export function Checkbox({
  className,
  description,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  description?: ReactNode;
  label: ReactNode;
}) {
  return (
    <label className={cn("flex min-h-10 items-start gap-3 text-sm text-foreground", className)}>
      <input
        className="mt-0.5 size-4 rounded border-input accent-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        type="checkbox"
        {...props}
      />
      <span>
        <span className="block font-semibold">{label}</span>
        {description ? <span className="mt-1 block leading-5 text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  );
}

const cardClassName = "rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(cardClassName, className)} {...props} />;
}

export function SectionCard({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn(cardClassName, "space-y-6", className)} {...props} />;
}

export function DangerZone({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-foreground", className)} {...props} />;
}

export function CatalogCard({
  action,
  className,
  description,
  icon,
  status,
  title,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  action: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  status?: ReactNode;
  title: ReactNode;
}) {
  return (
    <a
      className={cn(
        "group flex flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    >
      {icon || status ? (
        <span className="mb-4 flex items-center gap-3">
          {icon ? (
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted/40 text-muted-foreground [&_svg]:size-4">
              {icon}
            </span>
          ) : null}
          {status ? <span className="min-w-0">{status}</span> : null}
        </span>
      ) : null}
      <span className="text-base font-extrabold tracking-tight">{title}</span>
      <span className="mt-2 text-xs leading-5 text-muted-foreground">{description}</span>
      <span className="mt-auto pt-4 text-xs font-extrabold text-primary group-hover:underline">{action}</span>
    </a>
  );
}

type StatusVariant = "neutral" | "info" | "success" | "warning" | "danger" | "archived";

export function StatusBadge({
  children,
  className,
  variant = "neutral",
}: {
  children: ReactNode;
  className?: string;
  variant?: StatusVariant;
}) {
  const variants: Record<StatusVariant, string> = {
    neutral: "bg-secondary text-secondary-foreground",
    info: "bg-accent text-accent-foreground",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-800",
    danger: "bg-destructive/10 text-destructive",
    archived: "bg-slate-200 text-slate-600",
  };

  return <span className={cn("inline-flex min-h-5 items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-extrabold", variants[variant], className)}>{children}</span>;
}

type AlertVariant = "info" | "success" | "warning" | "error";

export function AlertBanner({
  action,
  children,
  className,
  title,
  variant = "info",
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  variant?: AlertVariant;
}) {
  const variants: Record<AlertVariant, string> = {
    info: "border-primary/20 bg-accent text-foreground",
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    error: "border-destructive/20 bg-destructive/5 text-destructive",
  };
  const urgent = variant === "error";

  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4 text-sm", variants[variant], className)} role={urgent ? "alert" : "status"}>
      <div>
        {title ? <p className="font-extrabold">{title}</p> : null}
        <div className={cn("leading-6", title ? "mt-1" : undefined)}>{children}</div>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  action,
  className,
  description,
  headingLevel = "h2",
  icon,
  title,
}: {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  headingLevel?: "h1" | "h2" | "h3";
  icon?: ReactNode;
  title: ReactNode;
}) {
  const Heading = headingLevel;

  return (
    <div className={cn("rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center", className)}>
      {icon ? <div className="mx-auto mb-4 flex size-10 items-center justify-center text-muted-foreground">{icon}</div> : null}
      <Heading className="font-extrabold text-foreground">{title}</Heading>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
