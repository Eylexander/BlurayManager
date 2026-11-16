import { ReactNode } from 'react';

// Colour of the card's spine and icon. The names are the callers'; they map
// onto the two accents and a few fixed meanings (amber for ratings).
const colorClasses = {
  blue: 'before:bg-primary [&_svg]:text-primary',
  indigo: 'before:bg-primary [&_svg]:text-primary',
  purple: 'before:bg-sticker [&_svg]:text-sticker',
  pink: 'before:bg-foreground [&_svg]:text-foreground',
  yellow: 'before:bg-amber-500 [&_svg]:text-amber-500',
  green: 'before:bg-emerald-500 [&_svg]:text-emerald-500',
};

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: keyof typeof colorClasses;
}

export default function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <div
      className={`group card relative h-full overflow-hidden pl-5 pr-4 py-4 sm:pl-6 sm:pr-5 sm:py-5 transition-colors hover:border-foreground/30 before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:origin-bottom before:transition-transform before:duration-300 hover:before:scale-x-150 ${colorClasses[color]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="label-caps text-muted-foreground">{title}</p>
        <div className="shrink-0 [&_svg]:w-5! [&_svg]:h-5! opacity-80">{icon}</div>
      </div>
      <p className="mt-3 font-display text-4xl sm:text-5xl text-foreground tabular-nums">{value}</p>
    </div>
  );
}
