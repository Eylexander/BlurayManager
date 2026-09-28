"use client";

import { PageHeader } from "@/components/common";
import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  CartesianGrid,
} from "recharts";
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
} from "lucide-react";

import { apiClient } from "@/lib/api-client";
import useRouteProtection, { ROUTES } from "@/hooks/useRouteProtection";
import { Statistics } from "@/types/statistics";
import StatsCard from "@/components/common/StatsCard";
import { LoaderCircle } from "@/components/common/LoaderCircle";

// Chart palette, led by the brand primary so it follows the theme
const COLORS = [
  "hsl(var(--primary))",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
];

const TOOLTIP_STYLE = {
  borderRadius: "12px",
  border: "1px solid hsl(var(--border))",
  backgroundColor: "hsl(var(--card))",
  color: "hsl(var(--card-foreground))",
  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
};

const ChartContainer = ({
  title,
  children,
  subtitle,
}: {
  title: string;
  children: React.ReactNode;
  subtitle?: string;
}) => (
  <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-sm border border-border">
    <div className="mb-6">
      <h3 className="text-lg font-bold text-foreground">
        {title}
      </h3>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    <div className="h-[300px] w-full outline-none">{children}</div>
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

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile(); // Check on mount
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Prepare data for charts
  const genreData = useMemo(() => {
    if (!stats?.genre_distribution) return [];
    return Object.entries(stats.genre_distribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 genres
  }, [stats]);

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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <PageHeader icon={<BarChart3 />} title={t("statistics.title")} description={t("statistics.subtitle")} />

      {/* Main KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t("statistics.totalBlurays")}
          value={stats.total_blurays || 0}
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

      {/* Primary Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartContainer
            title={t("statistics.genreDistribution")}
            subtitle={t("statistics.top8Genres")}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={genreData}
                layout="vertical"
                margin={{ left: 40 }}
                style={{ outline: "none" }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                  opacity={0.1}
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "currentColor", fontSize: 12 }}
                />
                {!isMobile && (
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={TOOLTIP_STYLE}
                  />
                )}
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                  activeBar={isMobile ? false : undefined}
                >
                  {genreData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <ChartContainer
          title={t("statistics.contentTypeSplit")}
          subtitle={t("statistics.moviesVsTvShows")}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart style={{ outline: "none" }}>
              <Pie
                data={typeData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                activeShape={isMobile ? false : undefined}
              >
                {typeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>

              {!isMobile && <Tooltip contentStyle={TOOLTIP_STYLE} />}
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-[-40px]">
            {typeData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-xs font-medium text-muted-foreground">
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        </ChartContainer>
      </div>

      {/* Technical & Storage Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Euro className="w-8 h-8 opacity-80" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">
              {t("statistics.estimatedValue")}
            </span>
          </div>
          <p className="text-4xl font-bold">
            €{(stats.total_spent || 0).toFixed(2)}
          </p>
          <p className="mt-2 text-green-100 text-sm flex items-center">
            <ArrowUpRight className="w-4 h-4 mr-1" />
            {t("statistics.estimatedValueSubtitle", {
              value: stats.average_price.toFixed(2),
            })}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <HardDrive className="text-indigo-500 w-6 h-6" />
            <h4 className="font-semibold">{t("statistics.dataStorage")}</h4>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold">
              {(stats.physical_storage_gb || 0).toLocaleString()} GB
            </p>
            <p className="text-sm text-muted-foreground">
              {t("statistics.digitalFootprint", {
                value: ((stats.physical_storage_gb || 0) / 1024).toFixed(2),
              })}
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <Clock className="text-purple-500 w-6 h-6" />
            <h4 className="font-semibold">{t("statistics.totalRuntime")}</h4>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold">
              {Math.floor((stats.total_runtime_minutes || 0) / 60)}
              <span className="text-lg">h</span>{" "}
              {(stats.total_runtime_minutes || 0) % 60}
              <span className="text-lg">m</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {t("statistics.nonstopPlayback", {
                value: ((stats.total_runtime_minutes || 0) / 1440).toFixed(1),
              })}
            </p>
          </div>
        </div>
      </div>

      {/* History & Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border flex flex-col">
          <div className="flex items-center gap-2 mb-6 text-amber-600 uppercase text-xs font-bold tracking-widest">
            <History className="w-4 h-4" /> {t("statistics.timelineMilestones")}
          </div>

          {/* Use flex-1 and justify-around to spread the two items out vertically */}
          <div className="flex-1 flex flex-col justify-around">
            <div className="flex justify-between items-center group p-2 -mx-2 rounded-lg hover:bg-accent transition-colors">
              <div className="flex flex-col">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">
                  {t("statistics.oldest")}
                </p>
                <button
                  onClick={() =>
                    router.push(
                      ROUTES.DASHBOARD.BLURAYS.DETAIL.replace(
                        "[id]",
                        stats.oldest_bluray?.id || "",
                      ),
                    )
                  }
                  className="font-bold text-left hover:text-primary transition-colors line-clamp-1"
                >
                  {stats.oldest_bluray?.title}
                </button>
              </div>
              <span className="text-3xl font-black text-muted-foreground">
                {stats.oldest_bluray?.release_year}
              </span>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent w-full my-4" />

            <div className="flex justify-between items-center group p-2 -mx-2 rounded-lg hover:bg-accent transition-colors">
              <div className="flex flex-col">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">
                  {t("statistics.newest")}
                </p>
                <button
                  onClick={() =>
                    router.push(
                      ROUTES.DASHBOARD.BLURAYS.DETAIL.replace(
                        "[id]",
                        stats.newest_bluray?.id || "",
                      ),
                    )
                  }
                  className="font-bold text-left hover:text-primary transition-colors line-clamp-1"
                >
                  {stats.newest_bluray?.title}
                </button>
              </div>
              <span className="text-3xl font-black text-muted-foreground">
                {stats.newest_bluray?.release_year}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border flex flex-col">
          <div className="flex items-center gap-2 mb-6 text-primary uppercase text-xs font-bold tracking-widest">
            <Award className="w-4 h-4" /> {t("statistics.topRated")}
          </div>
          <div className="space-y-2 flex-1 flex flex-col justify-between">
            {stats.top_rated?.slice(0, 5).map((item, index) => (
              <button
                key={item.id}
                onClick={() =>
                  router.push(
                    ROUTES.DASHBOARD.BLURAYS.DETAIL.replace("[id]", item.id),
                  )
                }
                className="flex items-center justify-between group w-full hover:bg-accent rounded-lg p-2 -mx-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-4">
                    {index + 1}
                  </span>
                  <p className="font-medium group-hover:text-primary transition-colors line-clamp-1">
                    {item.title}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-700 dark:text-yellow-500">
                    {item.rating?.toFixed(1)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
