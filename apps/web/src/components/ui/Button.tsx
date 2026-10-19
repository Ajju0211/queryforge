import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:opacity-90 active:scale-[0.98] transition-all font-medium",
        primary:
          "bg-primary text-primary-foreground shadow-xs hover:opacity-90 active:scale-[0.98] transition-all font-medium",
        outline:
          "border-border bg-card text-foreground hover:bg-muted active:scale-[0.98] transition-all",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-muted active:scale-[0.98] transition-all",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-muted active:scale-[0.98] transition-all",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90 shadow-xs active:scale-[0.98] transition-all",
        link: "text-foreground underline-offset-4 hover:underline",
        emerald:
          "bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs active:scale-[0.98] transition-all font-medium",
      },
      size: {
        default: "h-8.5 gap-2 px-3.5 text-xs font-medium rounded-md",
        xs: "h-6 gap-1 rounded-sm px-2 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7.5 gap-1.5 px-2.5 text-xs rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        md: "h-8.5 gap-2 px-3.5 text-xs font-medium rounded-md",
        lg: "h-10 gap-2 px-4 text-sm font-medium rounded-md",
        icon: "size-8.5 rounded-md",
        "icon-xs": "size-6 rounded-sm [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7.5 rounded-md",
        "icon-lg": "size-9.5 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      disabled={disabled || isLoading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {isLoading && <Loader2 className="size-4 animate-spin shrink-0 text-current" />}
      {children}
    </Comp>
  )
}

export { Button, buttonVariants }

