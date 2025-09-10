import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'button';
  animate?: boolean;
}

function Skeleton({
  className,
  variant = 'default',
  animate = true,
  ...props
}: SkeletonProps) {
  const variants = {
    default: "h-4 w-full",
    card: "h-32 w-full rounded-lg",
    text: "h-4 w-3/4",
    avatar: "h-10 w-10 rounded-full",
    button: "h-9 w-24 rounded-md"
  };

  return (
    <div
      className={cn(
        "bg-gradient-to-r from-muted/50 via-muted to-muted/50 bg-[length:200%_100%]",
        animate && "animate-shimmer",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

interface SkeletonContainerProps {
  children: React.ReactNode;
  className?: string;
  repeat?: number;
}

function SkeletonContainer({ children, className, repeat = 1 }: SkeletonContainerProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: repeat }).map((_, i) => (
        <div key={i}>{children}</div>
      ))}
    </div>
  );
}

// Prebuilt skeleton patterns
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton variant="default" className="h-10" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-5 w-1/3" />
        <Skeleton variant="avatar" className="h-6 w-6" />
      </div>
      <Skeleton variant="default" className="h-20" />
      <div className="flex justify-between">
        <Skeleton variant="button" />
        <Skeleton variant="text" className="h-4 w-16" />
      </div>
    </div>
  );
}

function ListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <Skeleton variant="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-1/2" />
            <Skeleton variant="text" className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Export all components
export { 
  Skeleton,
  SkeletonContainer,
  TableSkeleton,
  CardSkeleton,
  ListSkeleton
};

// Add shimmer animation to global CSS
const shimmerStyles = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-shimmer {
  animation: shimmer 2s ease-in-out infinite;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = shimmerStyles;
  document.head.appendChild(styleElement);
}