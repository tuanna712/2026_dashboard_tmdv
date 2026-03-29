function resolveLocale(locale?: string) {
  return locale && locale.length > 0 ? locale : undefined;
}

export function formatMoney(
  value: string | number | null | undefined,
  currency?: string | null,
  locale?: string,
) {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  const loc = resolveLocale(locale);
  const moneyFmt = new Intl.NumberFormat(loc, {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  });
  const s = moneyFmt.format(n);
  return currency ? `${s} ${currency}` : s;
}

export function formatShortDate(iso: string | null | undefined, locale?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const loc = resolveLocale(locale);
  return d.toLocaleDateString(loc, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatPercent(value: string | null | undefined, locale?: string) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  const sign = n > 0 ? "+" : "";
  const loc = resolveLocale(locale);
  const formatted = new Intl.NumberFormat(loc, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(n);
  return `${sign}${formatted}%`;
}

export function formatPlainNumber(value: number, locale?: string) {
  const loc = resolveLocale(locale);
  return new Intl.NumberFormat(loc, { maximumFractionDigits: 4 }).format(value);
}
