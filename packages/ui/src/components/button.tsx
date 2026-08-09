import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "#lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-sans font-semibold outline-none transition-[background-color,border-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:opacity-65 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/15 [&_svg]:pointer-events-none [&_svg]:shrink-0",
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
          "bg-transparent text-foreground hover:bg-accent active:bg-accent",
        "input-icon":
          "bg-transparent text-muted-foreground hover:text-foreground focus-visible:ring-inset focus-visible:ring-primary/30 focus-visible:ring-offset-0 disabled:bg-transparent",
        "danger-subtle":
          "border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10",
        link: "text-primary underline-offset-4 hover:underline disabled:bg-transparent",
      },
      size: {
        default:
          "h-11 gap-2 rounded-lg px-4 text-[15px] [&_svg:not([class*='size-'])]:size-[18px]",
        xs: "h-8 gap-1.5 rounded-lg px-2.5 text-[11px] [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-[7px] rounded-lg px-3 text-[13px] [&_svg:not([class*='size-'])]:size-[15px]",
        md: "h-12 gap-2 rounded-lg px-[18px] text-[15px] [&_svg:not([class*='size-'])]:size-[18px]",
        lg: "h-13 gap-2.5 rounded-lg px-5.5 text-base [&_svg:not([class*='size-'])]:size-5",
        icon:
          "size-11 rounded-lg [&_svg:not([class*='size-'])]:size-[18px]",
        "icon-xs":
          "size-8 rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm":
          "size-9 rounded-lg [&_svg:not([class*='size-'])]:size-[17px]",
        "icon-md":
          "size-12 rounded-lg [&_svg:not([class*='size-'])]:size-5",
        "icon-lg":
          "size-13 rounded-lg [&_svg:not([class*='size-'])]:size-[22px]",
      },
    },
    compoundVariants: [
      {
        variant: "ghost",
        size: "default",
        className: "text-sm text-primary",
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
