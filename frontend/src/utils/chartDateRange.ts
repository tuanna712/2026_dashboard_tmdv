export type ChartDateRangePreset = "7d" | "30d" | "3m" | "6m" | "1y";

export const CHART_RANGE_PRESETS: ChartDateRangePreset[] = ["7d", "30d", "3m", "6m", "1y"];

function formatLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Inclusive local calendar bounds for API `from` / `to` query params. */
export function getChartRangeIsoBounds(preset: ChartDateRangePreset): { from: string; to: string } {
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  switch (preset) {
    case "7d":
      from.setDate(from.getDate() - 7);
      break;
    case "30d":
      from.setDate(from.getDate() - 30);
      break;
    case "3m":
      from.setMonth(from.getMonth() - 3);
      break;
    case "6m":
      from.setMonth(from.getMonth() - 6);
      break;
    case "1y":
      from.setFullYear(from.getFullYear() - 1);
      break;
    default:
      from.setDate(from.getDate() - 30);
  }
  return { from: formatLocalIsoDate(from), to: formatLocalIsoDate(to) };
}
