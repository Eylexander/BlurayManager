export const TAG_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6',
];

/** Tag label with its colour on the edge, shared wherever a tag is displayed. */
export function TagChip({ name, color, className = '' }: { name: string; color?: string; className?: string }) {
  const c = color || TAG_COLORS[0];
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-sm border-l-[3px] text-xs font-semibold text-foreground ${className}`}
      style={{ backgroundColor: `${c}24`, borderLeftColor: c }}
    >
      {name}
    </span>
  );
}
