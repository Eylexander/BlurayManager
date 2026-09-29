"use client";

import { PageHeader } from "@/components/common";
import { useEffect, useState, useMemo, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Euro,
  Star,
  Film,
  Tv,
  Package,
  Clock,
  HardDrive,
  ArrowUpRight,
  Award,
  History,
  Layers,
  PieChart,
  Tag,
} from "lucide-react";

import { apiClient } from "@/lib/api-client";
import useRouteProtection, { ROUTES } from "@/hooks/useRouteProtection";
import { Statistics } from "@/types/statistics";
import StatsCard from "@/components/common/StatsCard";
import { LoaderCircle } from "@/components/common/LoaderCircle";

type Datum = { name: string; value: number };

// Two-slot categorical pair for the movies/seasons split, validated for CVD
// separation and 3:1 contrast on the card surface in both themes.
const SPLIT_COLORS = ["bg-primary", "bg-[#eb6834] dark:bg-[#d95926]"];

const TOP_N = 8;

const toSortedData = (distribution?: Record<string, number>): Datum[] =>
  Object.entries(distribution || {})
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .slice(0, TOP_N);

const percent = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

/** Card with a small uppercase label, shared by every section of the page. */
const Panel = ({
  icon,
  title,
  subtitle,
  children,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) => (
  <section className={`card p-4 sm:p-6 flex flex-col min-w-0 ${className}`}>
    <header className="mb-5">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground [&_svg]:w-4 [&_svg]:h-4 [&_svg]:text-primary">
        {icon}
        {title}
      </h3>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </header>
    {children}
  </section>
);

/**
 * Horizontal bars as plain HTML: names truncate instead of colliding, and the
 * exact count is always visible, so nothing depends on hover.
 */
const BarList = ({
  data,
  total,
  emptyLabel,
}: {
  data: Datum[];
  total: number;
  emptyLabel: string;
}) => {
  if (data.length === 0) {
    return (
      <p className="flex-1 grid place-items-center py-8 text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  const max = data[0].value;

  return (
    <ul className="space-y-3.5">
      {data.map((d, index) => (
        <li key={d.name}>
          <div className="flex items-baseline justify-between gap-3 mb-1.5 text-sm">
            <span className="font-medium text-foreground truncate">{d.name}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{d.value}</span>
              <span className="ml-1.5 text-xs">{percent(d.value, total)}%</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary origin-left motion-safe:animate-grow-x"
              style={{
                width: `${Math.max((d.value / max) * 100, 2)}%`,
                animationDelay: `${index * 40}ms`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

/** Single 100% bar split into segments, with a legend carrying the numbers. */
const SplitBar = ({ data }: { data: Datum[] }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {data.map((d, index) => (
          <div key={d.name} className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${SPLIT_COLORS[index]}`} />
              <span className="truncate">{d.name}</span>
            </div>
            <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">
              {percent(d.value, total)}
              <span className="text-base font-semibold text-muted-foreground">%</span>
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">{d.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-muted">
        {total > 0 &&
          data.map((d, index) =>
            d.value > 0 ? (
              <div
                key={d.name}
                className={`h-full rounded-sm origin-left motion-safe:animate-grow-x ${SPLIT_COLORS[index]}`}
                style={{ width: `${(d.value / total) * 100}%` }}
              />
            ) : null,
          )}
      </div>
    </div>
  );
};

/** Compact metric card: icon chip, label, big value and a caption. */
const MetricCard = ({
  icon,
  label,
  value,
  caption,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  caption: string;
}) => (
  <div className="card p-4 sm:p-6 flex flex-col justify-between gap-4">
    <div className="flex items-center gap-3">
      <div className="grid place-items-center w-9 h-9 rounded-lg bg-primary/10 text-primary [&_svg]:w-5 [&_svg]:h-5">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-muted-foreground">{label}</h4>
    </div>
    <div>
      <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
    </div>
  </div>
);

export default function StatisticsPage() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useRouteProtection(pathname);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiClient.getStatistics();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const genreData = useMemo(() => toSortedData(stats?.genre_distribution), [stats]);
  const tagData = useMemo(() => toSortedData(stats?.tag_distribution), [stats]);

  const typeData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: t("statistics.totalMovies"), value: stats.total_movies || 0 },
      { name: t("statistics.totalSeasons"), value: stats.total_seasons || 0 },
    ];
  }, [stats, t]);

  if (loading) return <LoaderCircle />;

  if (!stats)
    return <div className="p-4 sm:p-8 text-center text-muted-foreground">{t("statistics.loadFailed")}</div>;

  const totalBlurays = stats.total_blurays || 0;
  const runtime = stats.total_runtime_minutes || 0;
  const openBluray = (id?: string) => {
    if (id) router.push(ROUTES.DASHBOARD.BLURAYS.DETAIL.replace("[id]", id));
  };

  const milestones = [
    { label: t("statistics.oldest"), item: stats.oldest_bluray },
    { label: t("statistics.newest"), item: stats.newest_bluray },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-12">
      <PageHeader icon={<BarChart3 />} title={t("statistics.title")} description={t("statistics.subtitle")} />

      {/* Main KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          title={t("statistics.totalBlurays")}
          value={totalBlurays}
          icon={<Package className="w-6 h-6 sm:w-8 sm:h-8" />}
          color="blue"
        />
        <StatsCard
          title={t("statistics.totalMovies")}
          value={stats.total_movies || 0}
          icon={<Film className="w-6 h-6 sm:w-8 sm:h-8" />}
          color="purple"
        />
        <StatsCard
          title={t("statistics.totalSeasons")}
          value={stats.total_seasons || 0}
          icon={<Tv className="w-6 h-6 sm:w-8 sm:h-8" />}
          color="pink"
        />
        <StatsCard
          title={t("statistics.averageRating")}
          value={(stats.average_rating || 0).toFixed(1)}
          icon={<Star className="w-6 h-6 sm:w-8 sm:h-8" />}
          color="yellow"
        />
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Panel
          icon={<Layers />}
          title={t("statistics.genreDistribution")}
          subtitle={t("statistics.top8Genres")}
          className={tagData.length === 0 ? "lg:col-span-2" : ""}
        >
          <BarList data={genreData} total={totalBlurays} emptyLabel={t("statistics.noData")} />
        </Panel>

        {tagData.length > 0 && (
          <Panel icon={<Tag />} title={t("statistics.tagDistribution")} subtitle={t("statistics.topTags")}>
            <BarList data={tagData} total={totalBlurays} emptyLabel={t("statistics.noData")} />
          </Panel>
        )}

        <Panel
          icon={<PieChart />}
          title={t("statistics.contentTypeSplit")}
          subtitle={t("statistics.moviesVsTvShows")}
        >
          <SplitBar data={typeData} />
          <p className="mt-auto pt-5 text-sm text-muted-foreground tabular-nums">
            {t("statistics.splitSummary", {
              series: stats.total_series || 0,
              episodes: stats.total_episodes || 0,
            })}
          </p>
        </Panel>
      </div>

      {/* Value, Storage & Runtime */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="brand-gradient rounded-lg p-4 sm:p-6 text-white shadow-sm flex flex-col justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center w-9 h-9 rounded-lg bg-white/15">
              <Euro className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-white/80">{t("statistics.estimatedValue")}</h4>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
              €{(stats.total_spent || 0).toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-white/80 flex items-center">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              {t("statistics.estimatedValueSubtitle", {
                value: (stats.average_price || 0).toFixed(2),
              })}
            </p>
          </div>
        </div>

        <MetricCard
          icon={<HardDrive />}
          label={t("statistics.dataStorage")}
          value={`${(stats.physical_storage_gb || 0).toLocaleString()} GB`}
          caption={t("statistics.digitalFootprint", {
            value: ((stats.physical_storage_gb || 0) / 1024).toFixed(2),
          })}
        />

        <MetricCard
          icon={<Clock />}
          label={t("statistics.totalRuntime")}
          value={
            <>
              {Math.floor(runtime / 60)}
              <span className="text-lg text-muted-foreground">h</span> {runtime % 60}
              <span className="text-lg text-muted-foreground">m</span>
            </>
          }
          caption={t("statistics.nonstopPlayback", { value: (runtime / 1440).toFixed(1) })}
        />
      </div>

      {/* History & Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        <Panel icon={<History />} title={t("statistics.timelineMilestones")}>
          <div className="flex-1 flex flex-col justify-around divide-y divide-border">
            {milestones.map(({ label, item }) => (
              <button
                key={label}
                onClick={() => openBluray(item?.id)}
                disabled={!item}
                className="group flex items-center justify-between gap-4 w-full text-left py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="font-semibold truncate group-hover:text-primary transition-colors">
                    {item?.title || "—"}
                  </p>
                </div>
                <span className="shrink-0 text-2xl sm:text-3xl font-black tabular-nums text-muted-foreground/70">
                  {item?.release_year || ""}
                </span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel icon={<Award />} title={t("statistics.topRated")}>
          {stats.top_rated?.length ? (
            <ol className="space-y-1">
              {stats.top_rated.slice(0, 5).map((item, index) => (
                <li key={item.id}>
                  <button
                    onClick={() => openBluray(item.id)}
                    className="group flex items-center gap-3 w-full text-left rounded-lg px-2 py-2 -mx-2 hover:bg-accent transition-colors"
                  >
                    <span className="shrink-0 w-5 text-xs font-bold tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="flex-1 min-w-0 font-medium truncate group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                    <span className="shrink-0 flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-md">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-bold tabular-nums text-yellow-700 dark:text-yellow-500">
                        {item.rating?.toFixed(1)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="flex-1 grid place-items-center py-8 text-sm text-muted-foreground">
              {t("statistics.noData")}
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
