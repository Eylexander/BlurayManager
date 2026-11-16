import { ReactNode } from 'react';

// Tint of the card's icon and corner glow. The names are the callers'; they
// map onto the two accents and a few fixed meanings (amber for ratings).
const colorClasses = {
  blue: 'text-primary',
  indigo: 'text-primary',
  purple: 'text-sticker',
  pink: 'text-foreground',
  yellow: 'text-amber-500',
  green: 'text-emerald-500',
};

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: keyof typeof colorClasses;
}

export default function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <div className="group card relative h-full overflow-hidden p-4 sm:p-5 transition-[translate,border-color] duration-300 hover:-translate-y-1 hover:border-foreground/20">
      {/* A lamp of the card's colour in the corner; it warms up on hover */}
      <div
        aria-hidden
        className={`absolute -right-10 -top-10 w-32 aspect-square rounded-full bg-current blur-2xl opacity-20 transition-opacity duration-300 group-hover:opacity-40 ${colorClasses[color]}`}
      />
      <div className="relative flex items-center justify-between gap-3">
        <p className="label-caps text-muted-foreground">{title}</p>
        <div
          className={`grid place-items-center shrink-0 w-9 h-9 rounded-md bg-current/10 [&_svg]:w-4.5! [&_svg]:h-4.5! ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
      <p className="relative mt-3 font-display text-4xl sm:text-5xl text-foreground tabular-nums">{value}</p>
    </div>
  );
}
