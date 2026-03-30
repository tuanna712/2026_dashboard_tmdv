import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ForecastList } from "@/features/dashboard/ForecastList";
import { PriceLineChart } from "@/features/dashboard/PriceLineChart";
import { PricingSidebar } from "@/features/dashboard/PricingSidebar";
import type { Market } from "@/features/dashboard/MarketTabs";
import { apiGet } from "@/services/api";
import type { ForecastListData, PricingByGroupData } from "@/types/api";

const CHART_GROUPS = ["CRUDE", "FUEL", "FERT", "AGRI"] as const;

const CHART_TITLE_KEY: Record<(typeof CHART_GROUPS)[number], "chart.crude" | "chart.fuel" | "chart.fert" | "chart.agri"> = {
  CRUDE: "chart.crude",
  FUEL: "chart.fuel",
  FERT: "chart.fert",
  AGRI: "chart.agri",
};

export function DashboardPage({ market }: { market: Market }) {
  const { t } = useTranslation();
  const pricingQuery = useQuery({
    queryKey: ["dashboard", "pricing", market],
    queryFn: () =>
      apiGet<PricingByGroupData>(
        `/api/v1/dashboard/pricing-by-group?market=${encodeURIComponent(market)}`,
      ),
  });

  const forecastQuery = useQuery({
    queryKey: ["dashboard", "forecasts", market],
    queryFn: () => apiGet<ForecastListData>("/api/v1/dashboard/price-forecasts?limit=12"),
  });

  const columnBase = "col-span-12 flex h-full min-h-0 flex-col";

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-6 lg:grid-rows-[minmax(0,1fr)] lg:items-stretch">
        <section className={`${columnBase} lg:col-span-3`}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
            <PricingSidebar
              data={pricingQuery.data}
              market={market}
              isLoading={pricingQuery.isLoading}
              isError={pricingQuery.isError}
              error={pricingQuery.error as Error | null}
              onRetry={() => pricingQuery.refetch()}
            />
          </div>
        </section>

        <section className={`${columnBase} lg:col-span-6`}>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
            {CHART_GROUPS.map((gc) => (
              <PriceLineChart
                key={gc}
                title={t(CHART_TITLE_KEY[gc])}
                groupCode={gc}
                market={market}
              />
            ))}
          </div>
        </section>

        <section className={`${columnBase} lg:col-span-3`}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ForecastList
              data={forecastQuery.data}
              isLoading={forecastQuery.isLoading}
              isError={forecastQuery.isError}
              error={forecastQuery.error as Error | null}
              onRetry={() => forecastQuery.refetch()}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
