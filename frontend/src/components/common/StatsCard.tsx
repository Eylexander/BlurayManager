'use client';

import { ReactNode } from 'react';

const colorClasses = {
  blue: 'bg-primary/10 text-primary',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400',
  yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  pink: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
};

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: keyof typeof colorClasses;
}

export default function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <div className="card p-4 sm:p-5 h-full transition-colors hover:border-primary/30">
      <div className="flex flex-row items-stretch justify-between h-full gap-3">
        
        {/* Left Side: Text Column */}
        <div className="flex flex-col justify-between flex-grow">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-muted-foreground leading-tight mb-4">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        </div>

        {/* Right Side: Icon Centered Vertically */}
        <div className="flex items-center justify-center">
          <div className={`p-3 sm:p-4 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
            <div className="w-6 h-6 sm:w-8 sm:h-8">
              {icon}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}