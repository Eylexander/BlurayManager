'use client';

import { ReactNode } from 'react';

const colorClasses = {
  blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  pink: 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
};

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: keyof typeof colorClasses;
}

export default function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <div className="card p-4 sm:p-5 h-full transition-all hover:shadow-md border border-gray-100 dark:border-gray-800">
      <div className="flex flex-row items-stretch justify-between h-full gap-3">
        
        {/* Left Side: Text Column */}
        <div className="flex flex-col justify-between flex-grow">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 leading-tight mb-4">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            {value}
          </p>
        </div>

        {/* Right Side: Icon Centered Vertically */}
        <div className="flex items-center justify-center">
          <div className={`p-4 sm:p-4 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
            <div className="w-6 h-6 sm:w-8 sm:h-8">
              {icon}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}