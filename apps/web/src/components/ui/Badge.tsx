import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground border border-border/60 [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/15 text-destructive border border-destructive/30",
        outline:
          "border-border bg-card text-foreground [a]:hover:bg-muted [a]:hover:text-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground text-muted-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
        neutral:
          "border-border bg-card text-muted-foreground hover:text-foreground",
        green:
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        emerald:
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        forest:
          "border-border bg-secondary text-foreground",
        mint:
          "border-teal-500/25 bg-teal-500/10 text-teal-600 dark:text-teal-400",
        purple:
          "border-purple-500/25 bg-purple-500/10 text-purple-600 dark:text-purple-400",
        amber:
          "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        red:
          "border-destructive/30 bg-destructive/15 text-destructive",
        blue:
          "border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400",
      },
      size: {
        default: "h-5 px-2 py-0.5 text-[11px]",
        sm: "h-4.5 px-1.5 py-0.2 text-[10px]",
        md: "h-5.5 px-2.5 py-0.5 text-xs",
        lg: "h-6.5 px-3 py-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

