"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Star, Calendar, Tag as TagIcon, MoreVertical, Film } from "lucide-react";
import { Bluray } from "@/types/bluray";
import { useBlurayTools } from "@/hooks/useBlurayTools";

interface BlurayCardProps {
  bluray: Bluray;
  onUpdate?: () => void;
}

export default function BlurayCard({ bluray, onUpdate }: BlurayCardProps) {
  const t = useTranslations();
  const { currentBluray, canModify, detailHref, openMenu, openTags, overlays } = useBlurayTools(bluray, onUpdate);

  return (
    <>
      <div
        onContextMenu={openMenu}
        className="relative group h-full w-full"
      >
        <Link
          href={detailHref}
          className="block h-full w-full"
        >
          <div
            className="
            relative flex flex-col h-full w-full
            bg-card border border-border rounded-lg overflow-hidden
            transition-all duration-300 ease-out
            md:group-hover:-translate-y-1 md:group-hover:border-primary/40
            md:group-hover:shadow-lg md:group-hover:shadow-primary/10
            active:scale-[0.98]
          "
          >
            {/* Image Container */}
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
              {/* Motion Wrapper: Both image and gradient live here */}
              <div className="relative w-full h-full transition-transform duration-500 ease-out md:group-hover:scale-105">
                {currentBluray.cover_image_url ? (
                  <Image
                    src={currentBluray.cover_image_url}
                    alt={currentBluray.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 20vw"
                  />
                ) : (
                  <div className="w-full h-full noise flex items-center justify-center text-muted-foreground/40">
                    <Film className="w-10 h-10" />
                  </div>
                )}

                {/* Bottom shade so the badge and actions read on any cover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              </div>

              {/* Floating Badge (Top Left) */}
              <div className="absolute top-3 left-3">
                <span
                  className={`
                  px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest rounded-full backdrop-blur-md border border-white/15 text-white
                  ${currentBluray.type === "movie" ? "bg-primary/80" : "bg-violet-600/80"}
                `}
                >
                  {currentBluray.type === "movie"
                    ? t("common.movie")
                    : t("common.series")}
                </span>
              </div>

              {/* Quick Actions: Outside the scaling wrapper so they don't grow with the image */}
              {canModify && (
                <div className="hidden md:flex absolute top-3 right-3 flex-col gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out z-10">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      openTags();
                    }}
                    aria-label={t("tags.manageTags")}
                    className="p-2.5 bg-black/60 backdrop-blur-xl hover:bg-primary text-white rounded-lg border border-white/15 shadow-lg transition-colors"
                  >
                    <TagIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="p-3 sm:p-4 flex-1 flex flex-col">
              <div className="flex-1">
                <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {currentBluray.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {currentBluray.director || t("common.unknownDirector")}
                </p>
              </div>

              {/* Bottom Meta Row */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-3">
                  {currentBluray.rating > 0 && (
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{currentBluray.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {currentBluray.release_year && (
                    <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                      <Calendar className="w-3 h-3" />
                      <span>{currentBluray.release_year}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Link>
        {/* Mobile More Trigger */}
        {canModify && (
          <button
            onClick={(e) => openMenu(e, -100)}
            aria-label={t("common.moreOptions")}
            className="md:hidden absolute bottom-1.5 right-1 p-2 text-muted-foreground z-20 active:text-foreground transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      </div>

      {overlays}
    </>
  );
}
