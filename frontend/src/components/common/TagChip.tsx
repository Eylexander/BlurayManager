export const TAG_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6',
];

/** Coloured tag pill, shared wherever a tag is displayed. */
export function TagChip({ name, color, className = '' }: { name: string; color?: string; className?: string }) {
  const c = color || TAG_COLORS[0];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}
      style={{ backgroundColor: `${c}1f`, borderColor: `${c}59`, color: c }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
      {name}
    </span>
  );
}
