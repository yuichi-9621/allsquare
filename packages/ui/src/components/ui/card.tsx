import * as React from "react"
import { cn } from "../../lib/utils"

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "surface-paper rounded-lg border border-border/20 bg-card text-card-foreground shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_10px_24px_-16px_rgba(0,0,0,0.5)]",
        className,
      )}
      {...props}
    />
  ),
)
Card.displayName = "Card"

export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-baseline justify-between gap-2 p-3.5 pb-2", className)} {...p} />
)
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("font-semibold", className)} {...p} />
)
export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 px-3.5 pb-3.5", className)} {...p} />
)
