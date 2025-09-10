import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-drain-blue-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-drain-blue-500 text-white hover:bg-drain-blue-600",
        secondary:
          "border-transparent bg-drain-orange-500 text-white hover:bg-drain-orange-600",
        destructive:
          "border-transparent bg-priority-p1 text-white hover:bg-red-700",
        outline: "text-drain-steel-600 border-drain-steel-300",
        success:
          "border-transparent bg-drain-green-500 text-white hover:bg-drain-green-600",
        priority1:
          "priority-p1",
        priority2:
          "priority-p2",
        priority3:
          "priority-p3",
        priority4:
          "priority-p4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
