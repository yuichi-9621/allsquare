import { type VariantProps, cva } from "class-variance-authority"
import type * as React from "react"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-xs tabular-nums",
  {
    variants: {
      variant: {
        foil: "border-foil/50 bg-foil/20 text-foil",
        success: "border-success/50 bg-success/15 text-success font-semibold",
        danger: "border-danger/55 bg-danger/15 text-danger font-semibold",
        muted: "border-border text-muted-foreground",
      },
    },
    defaultVariants: { variant: "foil" },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
)
export { badgeVariants }
