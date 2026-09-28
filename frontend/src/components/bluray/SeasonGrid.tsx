'use client';

import { useTranslations } from 'next-intl';
import { Calendar, Check, Film } from 'lucide-react';

export interface SeasonOption {
  number: number;
  episode_count: number;
  year?: number;
}

interface SeasonGridProps {
  seasons: SeasonOption[];
  isSelected: (seasonNumber: number) => boolean;
  onToggle: (seasonNumber: number) => void;
  /** Season detected from a barcode scan, highlighted with a badge */
  detectedSeason?: number | null;
  className?: string;
}

/** Toggleable season cards, shared by the add flow and the season editor. */
export default function SeasonGrid({ seasons, isSelected, onToggle, detectedSeason, className = '' }: SeasonGridProps) {
  const t = useTranslations();

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 ${className}`}>
      {seasons.map((season) => {
        const selected = isSelected(season.number);
        const detected = season.number === detectedSeason;
        return (
          <button
            key={season.number}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(season.number)}
            className={`relative p-3 sm:p-4 rounded-lg border text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
              selected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-accent'
            }`}
          >
            <span
              className={`absolute top-2.5 right-2.5 grid place-items-center w-5 h-5 rounded-full border transition-colors ${
                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'
              }`}
            >
              {selected && <Check className="w-3 h-3" strokeWidth={3} />}
            </span>

            <div className={`pr-6 text-sm font-semibold ${selected ? 'text-primary' : 'text-foreground'}`}>
              {t('details.season')} {season.number}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Film className="w-3.5 h-3.5" />
              {season.episode_count} {t('details.episodes')}
            </div>
            {season.year ? (
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                {season.year}
              </div>
            ) : null}
            {detected && (
              <span className="mt-2 inline-block px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-semibold uppercase tracking-wide">
                {t('barcode.detected')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
