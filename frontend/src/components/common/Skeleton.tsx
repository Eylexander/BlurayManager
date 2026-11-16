/** Placeholder block with a moving sheen, sized by className. */
export const Skeleton = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => (
  <div
    aria-hidden
    style={style}
    className={`rounded-md bg-muted bg-size-[200%_100%] bg-[linear-gradient(90deg,transparent_25%,hsl(var(--foreground)/0.06)_50%,transparent_75%)] animate-shimmer ${className}`}
  />
);

/** Mirrors BlurayCard: the case, then the caption under it. */
export const BlurayCardSkeleton = () => (
  <div>
    <Skeleton className="aspect-2/3 w-full rounded-md" />
    <div className="pt-3 space-y-2">
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

/** Mirrors BlurayListItem and the add page results: cover then text lines. */
export const BlurayRowSkeleton = () => (
  <div className="flex gap-4 py-3 px-2 sm:px-3 border-b border-border">
    <Skeleton className="w-14 h-21 sm:w-16 sm:h-24 shrink-0" />
    <div className="flex-1 flex flex-col justify-center gap-2">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/4" />
      <Skeleton className="h-3 w-full max-w-md" />
    </div>
  </div>
);
