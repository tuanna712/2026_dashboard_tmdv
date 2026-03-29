import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartDateRangeButtons } from "@/components/ChartDateRangeButtons";
import { apiGet } from "@/services/api";
import type { HistoryChartData } from "@/types/api";
import { useTheme } from "@/hooks/useTheme";
import type { ChartDateRangePreset } from "@/utils/chartDateRange";
import { getChartRangeIsoBounds } from "@/utils/chartDateRange";
import { tProduct } from "@/utils/localizedEntity";

const SERIES_COLORS = ["#003703", "#006e20", "#114f11", "#284c2c", "#113518"];

const DASH_BY_INDEX: (string | undefined)[] = [undefined, undefined, "7 4", "3 4", "6 3"];

type Props = {
  title: string;
  groupCode: string;
  market: string;
};

function formatPriceAxis(value: number, span: number, locale?: string): string {
  if (!Number.isFinite(value)) return "—";
  const loc = locale && locale.length > 0 ? locale : undefined;
  if (span >= 10_000) {
    return new Intl.NumberFormat(loc, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (span <= 2) return value.toFixed(2);
  if (span <= 20) return value.toFixed(1);
  return value.toFixed(0);
}

function formatXLabel(iso: string, locale: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

type ChartRow = {
  dateLabel: string;
  dateIso: string;
} & Record<string, number | null | string>;

type SeriesModel = {
  prod_code: string;
  displayName: string;
  prices: (number | null)[];
  unit_code: string | null;
};

export function PriceLineChart({ title, groupCode, market }: Props) {
  const { dark } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [rangePreset, setRangePreset] = useState<ChartDateRangePreset>("30d");
  const { from, to } = useMemo(() => getChartRangeIsoBounds(rangePreset), [rangePreset]);

  const chartQuery = useQuery({
    queryKey: ["dashboard", "chart", groupCode, market, from, to],
    queryFn: () =>
      apiGet<HistoryChartData>(
        `/api/v1/dashboard/price-history-chart?group_code=${encodeURIComponent(groupCode)}&market=${encodeURIComponent(market)}&granularity=day&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
  });

  const chart = chartQuery.data;
  const isLoading = chartQuery.isLoading;
  const error = (chartQuery.error as Error) ?? null;

  const chartModel = useMemo(() => {
    if (!chart?.dates.length || !chart.series.length) return null;

    const dates = chart.dates;
    const sortedSeries: SeriesModel[] = [...chart.series]
      .sort((a, b) =>
        a.prod_code.localeCompare(b.prod_code, undefined, { numeric: true, sensitivity: "base" }),
      )
      .map((s) => ({
        prod_code: s.prod_code,
        displayName: tProduct(s.prod_code, s.label, t),
        prices: s.prices,
        unit_code: s.unit_code,
      }));

    const rows: ChartRow[] = dates.map((iso, i) => {
      const row: ChartRow = {
        dateLabel: formatXLabel(iso, locale),
        dateIso: iso,
      };
      for (const s of sortedSeries) {
        const v = s.prices[i];
        row[s.prod_code] = v !== null && Number.isFinite(v) ? v : null;
      }
      return row;
    });

    const values: number[] = [];
    for (const s of sortedSeries) {
      for (const p of s.prices) {
        if (p !== null && Number.isFinite(p)) values.push(p);
      }
    }

    let yMin = values.length ? Math.min(...values) : 0;
    let yMax = values.length ? Math.max(...values) : 1;
    const rawSpan = yMax - yMin;
    const pad = rawSpan * 0.06 || Math.abs(yMax) * 0.02 || 1;
    yMin -= pad;
    yMax += pad;
    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    }
    const span = yMax - yMin;

    const ariaSeries = sortedSeries.map((s) => s.displayName).join(", ");

    return { sortedSeries, rows, yMin, yMax, span, ariaSeries };
  }, [chart, locale, t]);

  const onRetry = () => void chartQuery.refetch();

  const gridStroke = dark ? "#334155" : "#e2e8f0";
  const tickFill = dark ? "#94a3b8" : "#64748b";

  if (isLoading) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-5 md:p-6 shadow-sm border border-outline-variant/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
          <h2 className="font-headline font-bold text-lg text-primary">{title}</h2>
          <ChartDateRangeButtons value={rangePreset} onChange={setRangePreset} className="shrink-0" />
        </div>
        <div
          className="h-[220px] md:h-[260px] w-full rounded-lg bg-surface-container-low/40 border border-outline-variant/10 animate-pulse"
          aria-hidden
        />
        <div className="mt-3 flex flex-wrap gap-3 border-t border-outline-variant/15 pt-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 w-28 animate-pulse rounded bg-surface-container-high" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-5 md:p-6 shadow-sm border border-outline-variant/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-3">
          <h2 className="font-headline font-bold text-lg text-primary">{title}</h2>
          <ChartDateRangeButtons value={rangePreset} onChange={setRangePreset} className="shrink-0" />
        </div>
        <p className="text-sm text-error" role="alert">
          {error.message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary"
        >
          {t("chart.retry")}
        </button>
      </div>
    );
  }

  if (!chart || !chart.dates.length || !chart.series.length || !chartModel) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-5 md:p-6 shadow-sm border border-outline-variant/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-3">
          <h2 className="font-headline font-bold text-lg text-primary">{title}</h2>
          <ChartDateRangeButtons value={rangePreset} onChange={setRangePreset} className="shrink-0" />
        </div>
        <p className="text-sm text-on-surface-variant">{t("chart.noHistory")}</p>
      </div>
    );
  }

  const { sortedSeries, rows, yMin, yMax, span, ariaSeries } = chartModel;

  return (
    <article className="bg-surface-container-lowest rounded-xl p-5 md:p-6 shadow-sm border border-outline-variant/10">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-3">
        <div>
          <h2 className="font-headline font-bold text-lg text-primary">{title}</h2>
        </div>
        <ChartDateRangeButtons value={rangePreset} onChange={setRangePreset} className="shrink-0" />
      </header>

      <div
        className="rounded-lg bg-surface-container-low/25 dark:bg-slate-900/20 border border-outline-variant/10 overflow-hidden min-h-[260px] md:min-h-[300px]"
        role="img"
        aria-label={`${title}. Series: ${ariaSeries}`}
      >
        <ResponsiveContainer width="100%" height={288}>
          <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 10, fill: tickFill, fontWeight: 500 }}
              tickLine={{ stroke: tickFill }}
              axisLine={{ stroke: gridStroke }}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              domain={[yMin, yMax]}
              tickFormatter={(v) => formatPriceAxis(Number(v), span, locale)}
              tick={{ fontSize: 10, fill: tickFill, fontWeight: 500 }}
              tickLine={{ stroke: tickFill }}
              axisLine={{ stroke: gridStroke }}
              width={52}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: `1px solid ${gridStroke}`,
              }}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as ChartRow | undefined;
                const iso = row?.dateIso;
                if (typeof iso !== "string") return "";
                const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
                if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
                return d.toLocaleDateString(locale, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
              }}
              formatter={(value, name) => {
                const num = typeof value === "number" ? value : Number(value);
                const formatted = Number.isFinite(num) ? formatPriceAxis(num, span, locale) : "—";
                return [formatted, name];
              }}
            />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 6 }}
              formatter={(value) => <span>{value}</span>}
            />
            {sortedSeries.map((s, si) => {
              const dash = DASH_BY_INDEX[si % DASH_BY_INDEX.length];
              return (
                <Line
                  key={s.prod_code}
                  type="monotone"
                  dataKey={s.prod_code}
                  name={s.displayName}
                  stroke={SERIES_COLORS[si % SERIES_COLORS.length]}
                  strokeWidth={si === 0 ? 2.25 : 1.85}
                  strokeDasharray={dash}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
