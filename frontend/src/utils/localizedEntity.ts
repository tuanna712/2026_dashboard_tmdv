import type { TFunction } from "i18next";

export function tProduct(code: string, fallback: string, t: TFunction) {
  return t(`data:product.${code}`, { defaultValue: fallback });
}

export function tGroup(code: string, fallback: string, t: TFunction) {
  return t(`data:group.${code}`, { defaultValue: fallback });
}

export function tForecastProvider(
  code: string | null | undefined,
  fallback: string | null | undefined,
  t: TFunction,
) {
  if (code) {
    return t(`data:forecastProvider.${code}`, { defaultValue: fallback || code });
  }
  return fallback || "—";
}

export function tPeriodType(code: string | null | undefined, t: TFunction) {
  if (!code?.trim()) return "—";
  return t(`data:periodType.${code}`, { defaultValue: code });
}

export function tPriceSource(code: string, t: TFunction) {
  return t(`data:priceSource.${code}`, { defaultValue: code });
}

export function tStockIndex(code: string, fallback: string, t: TFunction) {
  return t(`data:stockIndex.${code}`, { defaultValue: fallback });
}

export function tIndicator(code: string, fallback: string, t: TFunction) {
  return t(`data:indicator.${code}`, { defaultValue: fallback });
}

export function tRegion(code: string, fallback: string, t: TFunction) {
  return t(`data:region.${code}`, { defaultValue: fallback });
}
