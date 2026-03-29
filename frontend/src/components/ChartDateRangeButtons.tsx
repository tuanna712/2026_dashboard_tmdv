import { useTranslation } from "react-i18next";
import type { ChartDateRangePreset } from "@/utils/chartDateRange";
import { CHART_RANGE_PRESETS } from "@/utils/chartDateRange";

type Props = {
  value: ChartDateRangePreset;
  onChange: (preset: ChartDateRangePreset) => void;
  className?: string;
};

const PRESET_LABEL_KEY: Record<ChartDateRangePreset, string> = {
  "7d": "chart.range7d",
  "30d": "chart.range30d",
  "3m": "chart.range3m",
  "6m": "chart.range6m",
  "1y": "chart.range1y",
};

export function ChartDateRangeButtons({ value, onChange, className = "" }: Props) {
  const { t } = useTranslation();
  return (
    <div
      className={`flex flex-wrap items-center gap-0.5 rounded-md border border-outline-variant/20 bg-surface-container-low/40 p-0.5 dark:bg-slate-900/30 ${className}`}
      role="group"
      aria-label={t("chart.dateRangeAria")}
    >
      {CHART_RANGE_PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onChange(preset)}
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight transition-colors sm:px-2 sm:text-[11px] ${
            value === preset
              ? "bg-primary text-on-primary"
              : "text-slate-600 dark:text-slate-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20"
          }`}
          aria-pressed={value === preset}
        >
          {t(PRESET_LABEL_KEY[preset])}
        </button>
      ))}
    </div>
  );
}
