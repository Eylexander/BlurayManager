'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Star, Calendar, Play, Film, MoreVertical } from 'lucide-react';
import { Bluray } from '@/types/bluray';
import { useBlurayTools } from '@/hooks/useBlurayTools';
import { getLocalizedTextArray } from '@/lib/bluray-utils';

interface BlurayListItemProps {
  bluray: Bluray;
  onUpdate?: () => void;
}

export default function BlurayListItem({ bluray, onUpdate }: BlurayListItemProps) {
  const t = useTranslations();
  const locale = useLocale() as 'en-US' | 'fr-FR';
  const { currentBluray, canModify, detailHref, openMenu, overlays } = useBlurayTools(bluray, onUpdate);

  return (
    <>
      <div
        onContextMenu={openMenu}
        className="relative group"
      >
        <Link href={detailHref}>
          <div className="
            flex gap-4 p-3 sm:p-4
            bg-card border border-border rounded-lg
            transition-all duration-300 ease-out
            md:hover:border-primary/40 md:hover:shadow-lg md:hover:shadow-primary/5
            active:scale-[0.99] active:bg-accent
          ">
            {/* Cover */}
            <div className="relative w-16 h-24 sm:w-20 sm:h-28 flex-shrink-0 shadow-md overflow-hidden rounded-md bg-muted">
              {currentBluray.cover_image_url ? (
                <Image
                  src={currentBluray.cover_image_url}
                  alt={currentBluray.title}
                  fill
                  className="object-cover transition-transform duration-500 md:group-hover:scale-105"
                  sizes="80px"
                />
              ) : (
                <div className="w-full h-full noise flex items-center justify-center text-muted-foreground/40">
                  <Film className="w-6 h-6" />
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-foreground truncate md:group-hover:text-primary transition-colors tracking-tight">
                    {currentBluray.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {currentBluray.director || t('common.unknownDirector')}
                  </p>
                </div>

                {/* Visual Indicator for Desktop */}
                <div className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-4 h-4 fill-current" />
                </div>
              </div>

              {/* Metadata Badges */}
              <div className="flex items-center gap-3 mt-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {currentBluray.rating > 0 && (
                  <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{currentBluray.rating.toFixed(1)}</span>
                  </div>
                )}

                {currentBluray.release_year && (
                  <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded">
                    <Calendar className="w-3 h-3" />
                    <span>{currentBluray.release_year}</span>
                  </div>
                )}

                {getLocalizedTextArray(currentBluray.genre, locale)?.[0] && (
                  <span className="hidden sm:block bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {getLocalizedTextArray(currentBluray.genre, locale)[0]}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Mobile-only Context Trigger (Optional, since right-click is hard on mobile) */}
        {canModify && (
          <button
            onClick={(e) => openMenu(e, -100)}
            aria-label={t('common.moreOptions')}
            className="md:hidden absolute top-2 right-2 p-2 text-muted-foreground active:text-foreground transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      </div>

      {overlays}
    </>
  );
}