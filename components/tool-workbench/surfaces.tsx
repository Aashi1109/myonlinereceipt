import type { HTMLAttributes, ReactNode } from "react";

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  actions?: ReactNode;
  children: ReactNode;
  title: ReactNode;
};

function Surface({
  actions,
  children,
  className = "",
  title,
  ...props
}: SurfaceProps) {
  return (
    <section
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden bg-card ${className}`}
      {...props}
    >
      <header className="flex h-[46px] shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <h2 className="font-caption text-xs font-extrabold tracking-[0.06em] uppercase">
          {title}
        </h2>
        {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

function EditorSurface(props: SurfaceProps) {
  return <Surface data-surface="editor" {...props} />;
}

function ResultSurface(props: SurfaceProps) {
  return <Surface data-surface="result" {...props} />;
}

function EmptySurface({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={`flex min-h-72 flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground ${className}`}
      data-surface="empty"
      {...props}
    >
      {children}
    </div>
  );
}

export { EditorSurface, EmptySurface, ResultSurface };
