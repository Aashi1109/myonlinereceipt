import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "#lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-sans font-semibold outline-none transition-[background-color,border-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:border disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/15 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[#0052CC] active:bg-[#003D99]",
        strong: "bg-surface-ink text-white hover:bg-[#25272B]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-[#C51F1F] focus-visible:ring-destructive",
        outline:
          "border border-input bg-card text-foreground hover:bg-muted",
        secondary:
          "border border-input bg-card text-foreground hover:bg-muted",
        ghost:
          "bg-transparent text-primary hover:bg-accent active:bg-accent",
        "danger-subtle":
          "border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[46px] rounded-full px-[26px] text-[15px] has-[>svg]:px-5",
        xs: "h-7 gap-1 rounded-lg px-2 text-[11px] has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-full px-4 text-[13px] has-[>svg]:px-3",
        lg: "h-14 rounded-full px-[34px] text-[17px] has-[>svg]:px-7",
        icon: "size-10 rounded-lg",
        "icon-xs": "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-full [&_svg:not([class*='size-'])]:size-5",
      },
    },
    compoundVariants: [
      {
        variant: ["secondary", "outline"],
        size: "default",
        className: "h-11 px-[25px] text-[15px]",
      },
      {
        variant: "destructive",
        size: "default",
        className: "px-6",
      },
      {
        variant: "ghost",
        size: "default",
        className: "h-10 px-5 text-sm",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      type={asChild ? type : (type ?? "button")}
      {...props}
    />
  )
}

export { Button, buttonVariants }
