/** Placeholder block with a moving sheen, sized by className. */
export const Skeleton = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => (
  <div
    aria-hidden
    style={style}
    className={`rounded-md bg-muted bg-[length:200%_100%] bg-[linear-gradient(90deg,transparent_25%,hsl(var(--foreground)/0.06)_50%,transparent_75%)] animate-shimmer ${className}`}
  />
);

/** Mirrors BlurayCard's layout. */
export const BlurayCardSkeleton = () => (
  <div className="flex flex-col rounded-lg border border-border bg-card overflow-hidden">
    <Skeleton className="aspect-[2/3] w-full rounded-none" />
    <div className="p-3 sm:p-4 space-y-2">
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-1/2" />
      <div className="pt-3 mt-1 border-t border-border">
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  </div>
);

/** Mirrors BlurayListItem and the add page results: cover then text lines. */
export const BlurayRowSkeleton = () => (
  <div className="flex gap-4 p-3 sm:p-4 rounded-lg border border-border bg-card">
    <Skeleton className="w-16 h-24 sm:w-20 sm:h-28 shrink-0" />
    <div className="flex-1 flex flex-col justify-center gap-2">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/4" />
      <Skeleton className="h-3 w-full max-w-md" />
    </div>
  </div>
);
