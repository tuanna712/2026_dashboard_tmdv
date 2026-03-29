import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ForecastListData } from "@/types/api";
import { formatMoney } from "@/utils/format";
import { tForecastProvider, tPeriodType, tProduct } from "@/utils/localizedEntity";

function formatForecastPeriod(value: string, locale: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ForecastList({
  data,
  isLoading,
  isError,
  error,
  onRetry,
}: {
  data: ForecastListData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  if (isLoading) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm space-y-3 h-full min-h-[12rem] lg:min-h-0 flex flex-col">
        <Skeleton className="h-6 w-48 shrink-0" />
        <Skeleton className="h-24 w-full shrink-0" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="h-full min-h-[12rem] lg:min-h-0 flex flex-col">
        <ErrorState message={error?.message || t("forecast.errorLoad")} onRetry={onRetry} />
      </div>
    );
  }
  if (!data?.items?.length) {
    return (
      <div className="h-full min-h-[12rem] lg:min-h-0 flex flex-col">
        <EmptyState
          title={t("forecast.emptyTitle")}
          description={t("forecast.emptyDescription")}
        />
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm h-full min-h-0 flex flex-col">
      <h2 className="font-headline font-bold text-sm text-primary mb-4 shrink-0">
        {t("forecast.title")}
      </h2>
      <ul className="space-y-3 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]" role="list">
        {data.items.map((row) => (
          <li
            key={`${row.id}-${row.prod_code}`}
            className="rounded-lg border border-outline-variant/15 p-3 hover:bg-surface-container-low/80 transition-colors"
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="text-xs font-bold text-on-surface">
                  {tProduct(row.prod_code, row.prod_name, t)}
                </p>
                <p className="text-[10px] text-on-surface-variant font-mono">{row.prod_code}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-headline font-bold text-primary">
                  {formatMoney(row.forecast_price, row.currency_code, locale)}
                </p>
                {row.forecast_period ? (
                  <p className="text-[9px] text-outline">
                    {formatForecastPeriod(row.forecast_period, locale)}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-on-surface-variant">
              <span>
                {tForecastProvider(
                  row.forecast_provider_code,
                  row.forecast_provider_name,
                  t,
                )}
              </span>
              <span aria-hidden>·</span>
              <span>{tPeriodType(row.period_type, t)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
