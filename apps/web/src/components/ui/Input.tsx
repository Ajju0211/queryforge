import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8.5 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1.5 text-xs text-foreground transition-all duration-150 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground hover:border-border/80 focus-visible:border-foreground/40 focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
