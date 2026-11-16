'use client';

import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Star, ArrowRight, Film, MoreVertical } from 'lucide-react';
import { Bluray } from '@/types/bluray';
import { useBlurayTools } from '@/hooks/useBlurayTools';
import { getLocalizedTextArray } from '@/lib/bluray-utils';

interface BlurayListItemProps {
  bluray: Bluray;
  onUpdate?: () => void;
  /** Position in the list, used to stagger the entrance */
  index?: number;
}

/** A bluray as a ruled catalogue line: cover, title, then its details. */
export default function BlurayListItem({ bluray, onUpdate, index = 0 }: BlurayListItemProps) {
  const t = useTranslations();
  const locale = useLocale() as 'en-US' | 'fr-FR';
  const { currentBluray, title, canModify, detailHref, openMenu, overlays } = useBlurayTools(bluray, onUpdate);
  const isMovie = currentBluray.type === 'movie';
  const genre = getLocalizedTextArray(currentBluray.genre, locale)[0];

  return (
    <>
      <div
        onContextMenu={openMenu}
        style={{ '--i': index } as CSSProperties}
        className="relative group shelf-in"
      >
        <Link
          href={detailHref}
          className="relative flex gap-4 py-3 px-2 sm:px-3 border-b border-border transition-colors md:hover:bg-accent active:bg-accent before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary before:origin-center before:scale-y-0 before:transition-transform before:duration-200 md:hover:before:scale-y-100"
        >
          {/* Cover */}
          <div className="relative w-14 h-21 sm:w-16 sm:h-24 shrink-0 overflow-hidden rounded-sm bg-muted case-shell">
            {currentBluray.cover_image_url ? (
              <Image src={currentBluray.cover_image_url} alt={title} fill className="object-cover" sizes="64px" />
            ) : (
              <div className="w-full h-full noise flex items-center justify-center text-muted-foreground/50">
                <Film className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center pr-8 md:pr-0">
            <p className={`label-caps ${isMovie ? 'text-primary' : 'text-sticker'}`}>
              {isMovie ? t('common.movie') : t('common.series')}
              {genre && <span className="hidden sm:inline text-muted-foreground"> · {genre}</span>}
            </p>
            <h3 className="mt-1 text-base sm:text-lg font-bold text-foreground truncate">{title}</h3>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground truncate">
              {[currentBluray.release_year, currentBluray.director || t('common.unknownDirector')]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0">
            {currentBluray.rating > 0 && (
              <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-foreground">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {currentBluray.rating.toFixed(1)}
              </span>
            )}
            <ArrowRight className="w-4 h-4 text-primary opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
          </div>
        </Link>

        {/* Right-click is hard on touch screens, so the menu gets a button there */}
        {canModify && (
          <button
            onClick={(e) => openMenu(e, -100)}
            aria-label={t('common.moreOptions')}
            className="md:hidden absolute top-1/2 -translate-y-1/2 right-0 p-2 text-muted-foreground active:text-foreground transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      </div>

      {overlays}
    </>
  );
}
