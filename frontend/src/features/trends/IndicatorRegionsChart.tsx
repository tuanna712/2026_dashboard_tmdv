import { useEffect, useMemo, useRef, useState } from "react";
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
import type { IndicatorDataRow, IndicatorItem, RegionItem } from "@/types/api";
import { useTheme } from "@/hooks/useTheme";
import type { ChartDateRangePreset } from "@/utils/chartDateRange";
import { tIndicator, tPeriodType, tRegion } from "@/utils/localizedEntity";

const SERIES_COLORS = ["#003703", "#006e20", "#114f11", "#284c2c", "#113518", "#1a5c40", "#0d3324"];
const DASH_BY_INDEX: (string | undefined)[] = [undefined, undefined, "7 4", "3 4", "6 3", "8 3", "5 5"];

type Props = {
  indicators: IndicatorItem[];
  indicatorsLoading: boolean;
  indicatorsError: Error | null;
  onRetryIndicators: () => void;
  selectedCode: string;
  onSelectCode: (code: string) => void;
  regionCatalog: RegionItem[];
  data: IndicatorDataRow[];
  dataLoading: boolean;
  dataError: Error | null;
  onRetryData: () => void;
  dateRangePreset: ChartDateRangePreset;
  onDateRangeChange: (preset: ChartDateRangePreset) => void;
};

function periodSortKey(p: string): number {
  const iso = p.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(iso + "T12:00:00").getTime();
  }
  const t = Date.parse(p);
  return Number.isNaN(t) ? NaN : t;
}

function sortPeriods(periods: string[]): string[] {
  return [...periods].sort((a, b) => {
    const ka = periodSortKey(a);
    const kb = periodSortKey(b);
    if (Number.isFinite(ka) && Number.isFinite(kb)) return ka - kb;
    if (Number.isFinite(ka)) return -1;
    if (Number.isFinite(kb)) return 1;
    return a.localeCompare(b);
  });
}

function formatPeriodLabel(p: string, locale: string): string {
  const k = periodSortKey(p);
  if (Number.isFinite(k)) {
    const d = new Date(k);
    return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  }
  return p.length > 14 ? `${p.slice(0, 12)}…` : p;
}

function parseIndicatorValue(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

type ChartRow = {
  periodLabel: string;
  periodKey: string;
} & Record<string, string | number | null>;

function regionNameMap(catalog: RegionItem[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of catalog) {
    m.set(r.region_code, r.region_name);
  }
  return m;
}

export function IndicatorRegionsChart({
  indicators,
  indicatorsLoading,
  indicatorsError,
  onRetryIndicators,
  selectedCode,
  onSelectCode,
  regionCatalog,
  data,
  dataLoading,
  dataError,
  onRetryData,
  dateRangePreset,
  onDateRangeChange,
}: Props) {
  const { dark } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const names = useMemo(() => regionNameMap(regionCatalog), [regionCatalog]);

  const regionsInData = useMemo(() => {
    const u = new Set<string>();
    for (const r of data) {
      u.add(r.region_code);
    }
    return [...u].sort();
  }, [data]);

  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [regionMenuOpen, setRegionMenuOpen] = useState(false);
  const regionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedRegions(regionsInData);
  }, [regionsInData, selectedCode]);

  useEffect(() => {
    if (!regionMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = regionMenuRef.current;
      if (el && !el.contains(e.target as Node)) {
        setRegionMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRegionMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [regionMenuOpen]);

  const chartModel = useMemo(() => {
    if (!selectedRegions.length || !data.length) return null;

    const filtered = data.filter(
      (row) => row.indicator_code === selectedCode && selectedRegions.includes(row.region_code),
    );
    if (!filtered.length) return null;

    const periodSet = new Set<string>();
    for (const row of filtered) {
      if (row.period) periodSet.add(row.period);
    }
    const periods = sortPeriods([...periodSet]);
    if (!periods.length) return null;

    const pairKey = (period: string, region: string) => `${period}\0${region}`;
    const valueByPair = new Map<string, number>();
    const unitByRegion = new Map<string, string | null>();
    const periodTypeSample = filtered[0]?.period_type ?? null;

    for (const row of filtered) {
      if (!row.period) continue;
      const v = parseIndicatorValue(row.value);
      if (v === null) continue;
      valueByPair.set(pairKey(row.period, row.region_code), v);
      if (row.unit) unitByRegion.set(row.region_code, row.unit);
    }

    const rows: ChartRow[] = periods.map((pkey) => {
      const row: ChartRow = {
        periodLabel: formatPeriodLabel(pkey, locale),
        periodKey: pkey,
      };
      for (const reg of selectedRegions) {
        row[reg] = valueByPair.get(pairKey(pkey, reg)) ?? null;
      }
      return row;
    });

    const values: number[] = [];
    for (const row of rows) {
      for (const reg of selectedRegions) {
        const v = row[reg];
        if (typeof v === "number" && Number.isFinite(v)) values.push(v);
      }
    }

    let yMin = values.length ? Math.min(...values) : 0;
    let yMax = values.length ? Math.max(...values) : 1;
    const rawSpan = yMax - yMin;
    const pad = rawSpan * 0.08 || Math.abs(yMax) * 0.02 || 0.5;
    yMin -= pad;
    yMax += pad;
    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    }

    const unitHint =
      [...new Set(selectedRegions.map((r) => unitByRegion.get(r)).filter(Boolean))].join(", ") ||
      null;

    return {
      rows,
      yMin,
      yMax,
      span: yMax - yMin,
      periodTypeSample,
      unitHint,
    };
  }, [data, selectedCode, selectedRegions, locale]);

  const gridStroke = dark ? "#334155" : "#e2e8f0";
  const tickFill = dark ? "#94a3b8" : "#64748b";

  const cardClass =
    "bg-surface-container-lowest rounded-xl p-5 md:p-6 shadow-sm border border-outline-variant/10";

  const groupedIndicators = useMemo(() => {
    const byCat = new Map<string, IndicatorItem[]>();
    for (const ind of indicators) {
      const c = ind.category?.trim() || "_other";
      if (!byCat.has(c)) byCat.set(c, []);
      byCat.get(c)!.push(ind);
    }
    for (const arr of byCat.values()) {
      arr.sort((a, b) => a.indicator_code.localeCompare(b.indicator_code));
    }
    return [...byCat.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [indicators]);

  if (indicatorsLoading) {
    return (
      <div className={cardClass}>
        <div className="h-5 w-48 animate-pulse rounded bg-surface-container-high mb-4" />
        <div className="h-[240px] w-full rounded-lg bg-surface-container-low/40 border border-outline-variant/10 animate-pulse" />
      </div>
    );
  }

  if (indicatorsError) {
    return (
      <div className={cardClass}>
        <h2 className="font-headline font-bold text-lg text-primary mb-2">{t("trends.indicatorsTitle")}</h2>
        <p className="text-sm text-error" role="alert">
          {indicatorsError.message}
        </p>
        <button
          type="button"
          onClick={onRetryIndicators}
          className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary"
        >
          {t("chart.retry")}
        </button>
      </div>
    );
  }

  if (!indicators.length) {
    return (
      <div className={cardClass}>
        <h2 className="font-headline font-bold text-lg text-primary mb-2">{t("trends.indicatorsTitle")}</h2>
        <p className="text-sm text-on-surface-variant">{t("trends.indicatorsEmpty")}</p>
      </div>
    );
  }

  return (
    <article className={cardClass}>
      <header className="flex flex-col gap-3 mb-4">
        <h2 className="font-headline font-bold text-lg text-primary">{t("trends.indicatorsTitle")}</h2>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-on-surface-variant min-w-0 flex-1">
            {t("trends.indicatorSelect")}
            <select
              value={selectedCode}
              onChange={(e) => onSelectCode(e.target.value)}
              className="rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm text-on-surface"
            >
              {groupedIndicators.map(([cat, items]) => (
                <optgroup
                  key={cat}
                  label={cat === "_other" ? t("trends.categoryOther") : cat}
                >
                  {items.map((ind) => (
                    <option key={ind.indicator_code} value={ind.indicator_code}>
                      {tIndicator(ind.indicator_code, ind.name, t)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>

        {regionsInData.length > 0 ? (
          <div className="relative min-w-0" ref={regionMenuRef}>
            <div className="flex flex-col gap-1 text-xs font-semibold text-on-surface-variant min-w-0">
              <span id="trends-regions-field-label">{t("trends.regionsLegend")}</span>
              <button
                type="button"
                className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-left text-sm font-normal text-on-surface hover:bg-surface-container-high/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                aria-expanded={regionMenuOpen}
                aria-haspopup="listbox"
                aria-labelledby="trends-regions-field-label trends-regions-trigger-text"
                onClick={() => setRegionMenuOpen((o) => !o)}
              >
                <span id="trends-regions-trigger-text" className="min-w-0 truncate">
                  {selectedRegions.length >= regionsInData.length
                    ? t("trends.regionsAllSelected")
                    : t("trends.regionsCountSelected", { count: selectedRegions.length })}
                </span>
                <span
                  className={`material-symbols-outlined shrink-0 text-[20px] text-on-surface-variant transition-transform ${
                    regionMenuOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                >
                  expand_more
                </span>
              </button>
            </div>
            {regionMenuOpen ? (
              <div
                className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto overscroll-contain rounded-lg border border-outline-variant/25 bg-surface-container-lowest py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900 [scrollbar-gutter:stable]"
                role="listbox"
                aria-multiselectable="true"
                aria-label={t("trends.regionsLegend")}
              >
                {regionsInData.map((code) => {
                  const checked = selectedRegions.includes(code);
                  return (
                    <label
                      key={code}
                      className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low dark:hover:bg-slate-800/80"
                    >
                      <input
                        type="checkbox"
                        className="size-3.5 shrink-0 rounded border-outline-variant text-primary focus:ring-primary"
                        checked={checked}
                        onChange={() => {
                          setSelectedRegions((prev) => {
                            if (prev.includes(code)) {
                              const next = prev.filter((c) => c !== code);
                              return next.length ? next : prev;
                            }
                            return [...prev, code].sort();
                          });
                        }}
                        role="option"
                        aria-selected={checked}
                      />
                      <span className="min-w-0 flex-1">{tRegion(code, names.get(code) ?? code, t)}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="mb-3 flex justify-end">
        <ChartDateRangeButtons value={dateRangePreset} onChange={onDateRangeChange} />
      </div>

      {dataLoading ? (
        <div
          className="h-[260px] w-full rounded-lg bg-surface-container-low/40 border border-outline-variant/10 animate-pulse"
          aria-hidden
        />
      ) : dataError ? (
        <div>
          <p className="text-sm text-error" role="alert">
            {dataError.message}
          </p>
          <button
            type="button"
            onClick={onRetryData}
            className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary"
          >
            {t("chart.retry")}
          </button>
        </div>
      ) : !chartModel ? (
        <p className="text-sm text-on-surface-variant">{t("trends.indicatorNoPoints")}</p>
      ) : (
        <>
          <p className="text-[11px] text-on-surface-variant mb-2">
            {chartModel.periodTypeSample
              ? t("trends.indicatorSubtitle", {
                  periodType: tPeriodType(chartModel.periodTypeSample, t),
                })
              : t("trends.indicatorSubtitlePlain")}
            {chartModel.unitHint ? ` · ${chartModel.unitHint}` : ""}
          </p>
          <div
            className="rounded-lg bg-surface-container-low/25 dark:bg-slate-900/20 border border-outline-variant/10 overflow-hidden min-h-[260px]"
            role="img"
            aria-label={t("trends.indicatorsTitle")}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartModel.rows} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="periodLabel"
                  tick={{ fontSize: 10, fill: tickFill, fontWeight: 500 }}
                  tickLine={{ stroke: tickFill }}
                  axisLine={{ stroke: gridStroke }}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis
                  domain={[chartModel.yMin, chartModel.yMax]}
                  tickFormatter={(v) => {
                    const n = Number(v);
                    if (!Number.isFinite(n)) return "—";
                    if (chartModel.span <= 2) return n.toFixed(2);
                    if (chartModel.span <= 20) return n.toFixed(1);
                    return n.toFixed(0);
                  }}
                  tick={{ fontSize: 10, fill: tickFill, fontWeight: 500 }}
                  tickLine={{ stroke: tickFill }}
                  axisLine={{ stroke: gridStroke }}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: `1px solid ${gridStroke}`,
                  }}
                  formatter={(value, name) => {
                    const num = typeof value === "number" ? value : Number(value);
                    const s =
                      chartModel.span <= 2
                        ? num.toFixed(2)
                        : chartModel.span <= 20
                          ? num.toFixed(1)
                          : num.toFixed(0);
                    return [Number.isFinite(num) ? s : "—", name as string];
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 6 }}
                />
                {selectedRegions.map((reg, si) => {
                  const dash = DASH_BY_INDEX[si % DASH_BY_INDEX.length];
                  const displayName = tRegion(reg, names.get(reg) ?? reg, t);
                  return (
                    <Line
                      key={reg}
                      type="monotone"
                      dataKey={reg}
                      name={displayName}
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
        </>
      )}
    </article>
  );
}
