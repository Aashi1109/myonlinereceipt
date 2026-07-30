import type { HTMLAttributes, ReactNode } from "react";

function ColumnStack({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={`flex min-h-0 flex-col ${className}`}
      data-stack="column"
      {...props}
    >
      {children}
    </div>
  );
}

function SplitStack({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={`grid h-full min-h-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] overflow-hidden max-[64rem]:grid-cols-1 max-[64rem]:overflow-x-hidden max-[64rem]:overflow-y-auto ${className}`}
      data-stack="split"
      {...props}
    >
      {children}
    </div>
  );
}

function ScrollableStack({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={`min-h-0 overflow-auto overscroll-contain ${className}`}
      data-stack="scrollable"
      {...props}
    >
      {children}
    </div>
  );
}

export { ColumnStack, ScrollableStack, SplitStack };
