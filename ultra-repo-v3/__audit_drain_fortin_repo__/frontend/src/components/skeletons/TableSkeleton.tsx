export default function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="h-10 bg-muted/50" />
      <ul className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="p-3">
            <div className="flex items-center gap-4 animate-pulse">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-4 w-16 bg-muted rounded" />
              <div className="h-4 w-28 bg-muted rounded ml-auto" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

