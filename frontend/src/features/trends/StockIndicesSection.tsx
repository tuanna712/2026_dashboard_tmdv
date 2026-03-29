import type { TFunction } from "i18next";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChartDateRangeButtons } from "@/components/ChartDateRangeButtons";
import type { ChartDateRangePreset } from "@/utils/chartDateRange";
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
import type { StockIndexPriceRow } from "@/types/api";
import { useTheme } from "@/hooks/useTheme";
import { tStockIndex } from "@/utils/localizedEntity";

const SERIES_COLORS = ["#003703", "#006e20", "#114f11", "#284c2c", "#113518"];
const DASH_BY_INDEX: (string | undefined)[] = [undefined, undefined, "7 4", "3 4", "6 3"];

export type StockIndexPriceSlice = {
  code: string;
  name: string;
  rows: StockIndexPriceRow[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
};

type Props = {
  slices: StockIndexPriceSlice[];
  indicesLoading: boolean;
  indicesError: Error | null;
  onRetryIndices: () => void;
  dateRangePreset: ChartDateRangePreset;
  onDateRangeChange: (preset: ChartDateRangePreset) => void;
};

function isoDateKey(d: string | null | undefined): string | null {
  if (!d || typeof d !== "string") return null;
  const s = d.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = Date.parse(d);
  if (!Number.isNaN(parsed)) {
    const x = new Date(parsed);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return d;
}

function parseClose(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatXLabel(iso: string, locale: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

type ChartRow = {
  dateLabel: string;
  dateIso: string;
} & Record<string, number | null | string | Record<string, { close: string; currency: string | null }>>;

type SeriesMeta = {
  code: string;
  displayName: string;
};

function buildRows(
  slices: StockIndexPriceSlice[],
  mode: "rebased" | "absolute",
  locale: string,
  t: TFunction,
): {
  rows: ChartRow[];
  seriesList: SeriesMeta[];
  yMin: number;
  yMax: number;
  span: number;
  perCodeAbsolute?: { code: string; displayName: string; yMin: number; yMax: number; span: number }[];
} | null {
  const active = slices.filter((s) => s.rows.length > 0);
  if (!active.length) return null;

  const dateSet = new Set<string>();
  const byCode = new Map<string, Map<string, { close: number; currency: string | null }>>();

  for (const s of active) {
    const m = new Map<string, { close: number; currency: string | null }>();
    for (const r of s.rows) {
      const dk = isoDateKey(r.date);
      if (!dk) continue;
      const c = parseClose(r.close);
      if (c === null) continue;
      m.set(dk, { close: c, currency: r.currency ?? null });
      dateSet.add(dk);
    }
    byCode.set(s.code, m);
  }

  const dates = [...dateSet].sort();
  if (!dates.length) return null;

  const seriesList: SeriesMeta[] = active.map((s) => ({
    code: s.code,
    displayName: tStockIndex(s.code, s.name, t),
  }));

  if (mode === "rebased") {
    const bases = new Map<string, number>();
    for (const s of active) {
      const m = byCode.get(s.code)!;
      let base: number | null = null;
      for (const d of dates) {
        const v = m.get(d)?.close;
        if (v != null) {
          base = v;
          break;
        }
      }
      if (base != null && base !== 0) bases.set(s.code, base);
    }

    const rows: ChartRow[] = dates.map((iso) => {
      const row: ChartRow = {
        dateLabel: formatXLabel(iso, locale),
        dateIso: iso,
      };
      const rawBag: Record<string, { close: string; currency: string | null }> = {};
      for (const s of active) {
        const m = byCode.get(s.code)!;
        const pt = m.get(iso);
        const base = bases.get(s.code);
        if (pt && base != null) {
          row[s.code] = (pt.close / base) * 100;
          rawBag[s.code] = { close: String(pt.close), currency: pt.currency };
        } else {
          row[s.code] = null;
        }
      }
      row._raw = rawBag;
      return row;
    });

    const values: number[] = [];
    for (const row of rows) {
      for (const s of active) {
        const v = row[s.code];
        if (typeof v === "number" && Number.isFinite(v)) values.push(v);
      }
    }
    let yMin = values.length ? Math.min(...values) : 0;
    let yMax = values.length ? Math.max(...values) : 1;
    const rawSpan = yMax - yMin;
    const pad = rawSpan * 0.06 || 1;
    yMin -= pad;
    yMax += pad;
    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    }
    return { rows, seriesList, yMin, yMax, span: yMax - yMin };
  }

  const perCodeAbsolute: {
    code: string;
    displayName: string;
    yMin: number;
    yMax: number;
    span: number;
  }[] = [];

  const rows: ChartRow[] = dates.map((iso) => {
    const row: ChartRow = {
      dateLabel: formatXLabel(iso, locale),
      dateIso: iso,
    };
    for (const s of active) {
      const m = byCode.get(s.code)!;
      const pt = m.get(iso);
      row[s.code] = pt ? pt.close : null;
    }
    return row;
  });

  for (const s of active) {
    const vals: number[] = [];
    for (const d of dates) {
      const m = byCode.get(s.code)!;
      const pt = m.get(d);
      if (pt) vals.push(pt.close);
    }
    let yMin = vals.length ? Math.min(...vals) : 0;
    let yMax = vals.length ? Math.max(...vals) : 1;
    const rawSpan = yMax - yMin;
    const pad = rawSpan * 0.06 || Math.abs(yMax) * 0.02 || 1;
    yMin -= pad;
    yMax += pad;
    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    }
    perCodeAbsolute.push({
      code: s.code,
      displayName: tStockIndex(s.code, s.name, t),
      yMin,
      yMax,
      span: yMax - yMin,
    });
  }

  return {
    rows,
    seriesList,
    yMin: 0,
    yMax: 1,
    span: 1,
    perCodeAbsolute,
  };
}

function formatAxis(value: number, span: number, locale?: string): string {
  if (!Number.isFinite(value)) return "—";
  const loc = locale && locale.length > 0 ? locale : undefined;
  if (span >= 10_000) {
    return new Intl.NumberFormat(loc, { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  if (span <= 2) return value.toFixed(2);
  if (span <= 50) return value.toFixed(1);
  return value.toFixed(0);
}

export function StockIndicesSection({
  slices,
  indicesLoading,
  indicesError,
  onRetryIndices,
  dateRangePreset,
  onDateRangeChange,
}: Props) {
  const { dark } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [mode, setMode] = useState<"rebased" | "absolute">("rebased");

  const anyPriceLoading = slices.some((s) => s.isLoading);
  const priceErrors = slices.filter((s) => s.error);
  const chartModel = useMemo(
    () => buildRows(slices, mode, locale, t),
    [slices, mode, locale, t],
  );

  const gridStroke = dark ? "#334155" : "#e2e8f0";
  const tickFill = dark ? "#94a3b8" : "#64748b";

  const cardClass =
    "bg-surface-container-lowest rounded-xl p-5 md:p-6 shadow-sm border border-outline-variant/10";

  if (indicesLoading) {
    return (
      <div className={cardClass}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
          <h2 className="font-headline font-bold text-lg text-primary">{t("trends.stocksTitle")}</h2>
          <ChartDateRangeButtons
            value={dateRangePreset}
            onChange={onDateRangeChange}
            className="shrink-0"
          />
        </div>
        <div
          className="h-[220px] md:h-[280px] w-full rounded-lg bg-surface-container-low/40 border border-outline-variant/10 animate-pulse"
          aria-hidden
        />
      </div>
    );
  }

  if (indicesError) {
    return (
      <div className={cardClass}>
        <h2 className="font-headline font-bold text-lg text-primary mb-2">{t("trends.stocksTitle")}</h2>
        <p className="text-sm text-error" role="alert">
          {indicesError.message}
        </p>
        <button
          type="button"
          onClick={onRetryIndices}
          className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary"
        >
          {t("chart.retry")}
        </button>
      </div>
    );
  }

  if (!slices.length) {
    return (
      <div className={cardClass}>
        <h2 className="font-headline font-bold text-lg text-primary mb-2">{t("trends.stocksTitle")}</h2>
        <p className="text-sm text-on-surface-variant">{t("trends.stocksEmpty")}</p>
      </div>
    );
  }

  if (anyPriceLoading && !chartModel) {
    return (
      <div className={cardClass}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
          <h2 className="font-headline font-bold text-lg text-primary">{t("trends.stocksTitle")}</h2>
          <ChartDateRangeButtons
            value={dateRangePreset}
            onChange={onDateRangeChange}
            className="shrink-0"
          />
        </div>
        <div
          className="h-[220px] md:h-[280px] w-full rounded-lg bg-surface-container-low/40 border border-outline-variant/10 animate-pulse"
          aria-hidden
        />
      </div>
    );
  }

  if (priceErrors.length > 0) {
    return (
      <div className={cardClass}>
        <h2 className="font-headline font-bold text-lg text-primary mb-2">{t("trends.stocksTitle")}</h2>
        <p className="text-sm text-error" role="alert">
          {priceErrors[0]?.error?.message ?? t("trends.stocksError")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {slices.map((s) =>
            s.error ? (
              <button
                key={s.code}
                type="button"
                onClick={() => s.onRetry()}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary"
              >
                {t("trends.retrySeries", { code: s.code })}
              </button>
            ) : null,
          )}
        </div>
      </div>
    );
  }

  if (!chartModel) {
    return (
      <div className={cardClass}>
        <h2 className="font-headline font-bold text-lg text-primary mb-2">{t("trends.stocksTitle")}</h2>
        <p className="text-sm text-on-surface-variant">{t("trends.stocksNoPrices")}</p>
      </div>
    );
  }

  const { rows, seriesList, yMin, yMax, span, perCodeAbsolute } = chartModel;
  const ariaSeries = seriesList.map((s) => s.displayName).join(", ");

  return (
    <article className={cardClass}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-2">
        <div>
          <h2 className="font-headline font-bold text-lg text-primary">{t("trends.stocksTitle")}</h2>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            {mode === "rebased" ? t("trends.stocksSubtitleRebased") : t("trends.stocksSubtitleAbsolute")}
          </p>
        </div>
        <div
          className="flex rounded-lg border border-outline-variant/20 p-0.5 shrink-0"
          role="group"
          aria-label={t("trends.stocksScaleMode")}
        >
          <button
            type="button"
            onClick={() => setMode("rebased")}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              mode === "rebased"
                ? "bg-primary text-on-primary"
                : "text-slate-600 dark:text-slate-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20"
            }`}
            aria-pressed={mode === "rebased"}
          >
            {t("trends.stocksModeRebased")}
          </button>
          <button
            type="button"
            onClick={() => setMode("absolute")}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              mode === "absolute"
                ? "bg-primary text-on-primary"
                : "text-slate-600 dark:text-slate-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20"
            }`}
            aria-pressed={mode === "absolute"}
          >
            {t("trends.stocksModeAbsolute")}
          </button>
        </div>
      </header>

      <div className="mb-2 flex justify-end">
        <ChartDateRangeButtons value={dateRangePreset} onChange={onDateRangeChange} />
      </div>

      <div
        className="rounded-lg bg-surface-container-low/25 dark:bg-slate-900/20 border border-outline-variant/10 overflow-hidden min-h-[260px] md:min-h-[280px]"
        role="img"
        aria-label={`${t("trends.stocksTitle")}. ${ariaSeries}`}
      >
        {mode === "rebased" ? (
          <ResponsiveContainer width="100%" height={300}>
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
                tickFormatter={(v) => formatAxis(Number(v), span, locale)}
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
                formatter={(value, name, item) => {
                  const num = typeof value === "number" ? value : Number(value);
                  const idxLabel = Number.isFinite(num) ? formatAxis(num, span, locale) : "—";
                  const payload = item && typeof item === "object" && "payload" in item
                    ? (item as { payload?: ChartRow }).payload
                    : undefined;
                  const raw = payload?._raw as Record<string, { close: string; currency: string | null }> | undefined;
                  const code = seriesList.find((s) => s.displayName === name)?.code;
                  const extra =
                    code && raw?.[code]
                      ? ` (${raw[code].close}${raw[code].currency ? ` ${raw[code].currency}` : ""})`
                      : "";
                  return [`${idxLabel}${extra}`, String(name)];
                }}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 6 }}
              />
              {seriesList.map((s, si) => {
                const dash = DASH_BY_INDEX[si % DASH_BY_INDEX.length];
                return (
                  <Line
                    key={s.code}
                    type="monotone"
                    dataKey={s.code}
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
        ) : (
          <div className="flex flex-col gap-4 p-2">
            {perCodeAbsolute?.map((meta, si) => (
              <div key={meta.code}>
                <p className="text-[11px] font-semibold text-on-surface-variant mb-1 px-1">{meta.displayName}</p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 9, fill: tickFill, fontWeight: 500 }}
                      tickLine={{ stroke: tickFill }}
                      axisLine={{ stroke: gridStroke }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis
                      domain={[meta.yMin, meta.yMax]}
                      tickFormatter={(v) => formatAxis(Number(v), meta.span, locale)}
                      tick={{ fontSize: 9, fill: tickFill, fontWeight: 500 }}
                      tickLine={{ stroke: tickFill }}
                      axisLine={{ stroke: gridStroke }}
                      width={48}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 8,
                        border: `1px solid ${gridStroke}`,
                      }}
                      formatter={(value) => {
                        const num = typeof value === "number" ? value : Number(value);
                        return [
                          Number.isFinite(num) ? formatAxis(num, meta.span, locale) : "—",
                          meta.displayName,
                        ];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={meta.code}
                      stroke={SERIES_COLORS[si % SERIES_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
