import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "#lib/utils"

const inputVariants = cva(
  "w-full min-w-0 rounded-lg border border-input bg-card font-sans text-foreground outline-none transition-[border-color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-on-ink-muted disabled:opacity-70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 aria-invalid:border-validation aria-invalid:ring-2 aria-invalid:ring-validation/15",
  {
    variants: {
      size: {
        xs: "h-8 px-2.5 text-[11px]",
        sm: "h-9 px-3 text-[13px]",
        default: "h-11 px-4 text-sm",
        md: "h-12 px-[18px] text-[15px]",
        lg: "h-13 px-5.5 text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
)

type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>

function Input({ className, size = "default", type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(inputVariants({ size }), "group-data-[variant=auth]/field:px-3.5", className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
export type { InputProps }
