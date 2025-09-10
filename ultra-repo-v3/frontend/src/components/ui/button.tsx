import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-drain-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-drain-blue-500 text-white hover:bg-drain-blue-600 shadow-md hover:shadow-lg",
        destructive:
          "bg-priority-p1 text-white hover:bg-red-700 shadow-md hover:shadow-lg",
        outline:
          "border border-drain-steel-300 bg-background hover:bg-drain-steel-50 hover:border-drain-blue-500",
        secondary:
          "bg-drain-orange-500 text-white hover:bg-drain-orange-600 shadow-md hover:shadow-lg",
        ghost: "hover:bg-drain-steel-50 hover:text-drain-blue-600",
        link: "text-drain-blue-500 underline-offset-4 hover:underline hover:text-drain-blue-600",
        success: "bg-drain-green-500 text-white hover:bg-drain-green-600 shadow-md hover:shadow-lg",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
