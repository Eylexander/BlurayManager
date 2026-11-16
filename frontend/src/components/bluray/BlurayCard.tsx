"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Star, Tag as TagIcon, MoreVertical, Film } from "lucide-react";
import { Bluray } from "@/types/bluray";
import { useBlurayTools } from "@/hooks/useBlurayTools";

interface BlurayCardProps {
  bluray: Bluray;
  onUpdate?: () => void;
  /** Position in the grid, used to stagger the entrance */
  index?: number;
}

/**
 * A bluray as its cover, with the type and rating as chips on it and a
 * caption underneath. On hover the cover lifts, its own colours bloom behind
 * it and the disc slides out.
 */
export default function BlurayCard({ bluray, onUpdate, index = 0 }: BlurayCardProps) {
  const t = useTranslations();
  const { currentBluray, title, canModify, detailHref, openMenu, openTags, overlays } = useBlurayTools(bluray, onUpdate);
  const isMovie = currentBluray.type === "movie";

  return (
    <>
      <div
        onContextMenu={openMenu}
        style={{ "--i": index } as CSSProperties}
        className="relative group h-full w-full shelf-in"
      >
        <Link href={detailHref} className="block h-full w-full rounded-md">
          <div className="relative transition-transform duration-300 ease-out md:group-hover:-translate-y-1.5 group-active:scale-[0.98]">
            {/* The cover's own colours, blurred into a glow behind it. Same
                src and sizes as the cover, so it is one download. */}
            {currentBluray.cover_image_url && (
              <Image
                src={currentBluray.cover_image_url}
                alt=""
                aria-hidden
                fill
                sizes="(max-width: 640px) 50vw, 20vw"
                className="object-cover translate-y-3 scale-95 blur-xl saturate-150 opacity-0 transition-opacity duration-500 md:group-hover:opacity-70"
              />
            )}

            {/* The disc, hidden behind the case until it is hovered */}
            <div
              aria-hidden
              className="disc absolute right-0 top-1/2 w-[84%] aspect-square -translate-y-1/2 transition-transform duration-500 ease-out md:group-hover:translate-x-[15%] md:group-hover:rotate-[100deg]"
            />

            {/* The case */}
            <div className="relative overflow-hidden rounded-lg bg-muted case-shell">
              <div className="relative aspect-2/3 w-full">
                {currentBluray.cover_image_url ? (
                  <Image
                    src={currentBluray.cover_image_url}
                    alt={title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 20vw"
                  />
                ) : (
                  <div className="w-full h-full noise flex flex-col items-center justify-center gap-3 p-3 text-muted-foreground/60">
                    <Film className="w-8 h-8" />
                    <span className="font-display text-center text-lg line-clamp-3">{title}</span>
                  </div>
                )}
              </div>

              <span className="absolute top-2 left-2 flex items-center gap-1.5 h-5 px-2 rounded-full bg-black/65 text-white label-caps text-[0.625rem]">
                <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${isMovie ? "bg-[#6f83ff]" : "bg-[#ff9a5a]"}`} />
                {isMovie ? t("common.movie") : t("common.series")}
              </span>
              {currentBluray.rating > 0 && (
                <span className="absolute top-2 right-2 flex items-center gap-0.5 h-5 px-2 rounded-full bg-black/65 text-white label-caps text-[0.625rem] tabular-nums">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  {currentBluray.rating.toFixed(1)}
                </span>
              )}
            </div>

            {/* Quick action, on the case but outside its clipping */}
            {canModify && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  openTags();
                }}
                aria-label={t("tags.manageTags")}
                title={t("tags.manageTags")}
                className="hidden md:grid absolute top-9 right-2 place-items-center w-8 h-8 rounded-full bg-black/75 text-white opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 focus-visible:opacity-100 hover:bg-primary"
              >
                <TagIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Caption */}
          <div className="pt-3 pr-6 md:pr-0">
            <h3 className="font-semibold text-sm sm:text-[0.9375rem] leading-snug text-foreground line-clamp-1 [font-stretch:88%] transition-colors md:group-hover:text-primary">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
              {[currentBluray.release_year, currentBluray.director || t("common.unknownDirector")]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </Link>

        {/* Mobile More Trigger */}
        {canModify && (
          <button
            onClick={(e) => openMenu(e, -100)}
            aria-label={t("common.moreOptions")}
            className="md:hidden absolute bottom-0 -right-1.5 p-2 text-muted-foreground active:text-foreground transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      </div>

      {overlays}
    </>
  );
}
