import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { Market } from "@/features/dashboard/MarketTabs";
import { IndicatorRegionsChart } from "@/features/trends/IndicatorRegionsChart";
import { StockIndicesSection } from "@/features/trends/StockIndicesSection";
import { apiGet } from "@/services/api";
import type { ChartDateRangePreset } from "@/utils/chartDateRange";
import { getChartRangeIsoBounds } from "@/utils/chartDateRange";
import type {
  IndicatorDataRow,
  IndicatorItem,
  RegionItem,
  StockIndexItem,
  StockIndexPriceRow,
} from "@/types/api";

type Props = {
  /** Reserved for future market-specific filtering of trends data. */
  market: Market;
};

export function TrendsPage({ market: _market }: Props) {
  void _market;

  const stockIndicesQuery = useQuery({
    queryKey: ["trends", "stock-indices"],
    queryFn: () => apiGet<StockIndexItem[]>("/api/v1/stock-indices"),
  });

  const codes = useMemo(
    () => stockIndicesQuery.data?.map((x) => x.code) ?? [],
    [stockIndicesQuery.data],
  );

  const [stockRangePreset, setStockRangePreset] = useState<ChartDateRangePreset>("30d");
  const [indicatorRangePreset, setIndicatorRangePreset] = useState<ChartDateRangePreset>("30d");
  const stockBounds = useMemo(() => getChartRangeIsoBounds(stockRangePreset), [stockRangePreset]);
  const indicatorBounds = useMemo(
    () => getChartRangeIsoBounds(indicatorRangePreset),
    [indicatorRangePreset],
  );

  const priceQueries = useQueries({
    queries: codes.map((code) => ({
      queryKey: ["trends", "stock-index-prices", code, stockBounds.from, stockBounds.to],
      queryFn: () =>
        apiGet<StockIndexPriceRow[]>(
          `/api/v1/stock-index-prices?code=${encodeURIComponent(code)}&from=${encodeURIComponent(stockBounds.from)}&to=${encodeURIComponent(stockBounds.to)}`,
        ),
      enabled: codes.length > 0,
    })),
  });

  const indicatorsQuery = useQuery({
    queryKey: ["trends", "indicators"],
    queryFn: () => apiGet<IndicatorItem[]>("/api/v1/indicators"),
  });

  const regionsQuery = useQuery({
    queryKey: ["trends", "regions"],
    queryFn: () => apiGet<RegionItem[]>("/api/v1/regions"),
  });

  const [selectedIndicator, setSelectedIndicator] = useState("");

  useEffect(() => {
    const list = indicatorsQuery.data;
    if (!list?.length) return;
    setSelectedIndicator((prev) => {
      if (prev && list.some((i) => i.indicator_code === prev)) return prev;
      const pmi = list.find((i) => i.indicator_code === "PMI");
      if (pmi) return pmi.indicator_code;
      return [...list].sort((a, b) => a.indicator_code.localeCompare(b.indicator_code))[0]!
        .indicator_code;
    });
  }, [indicatorsQuery.data]);

  const indicatorDataQuery = useQuery({
    queryKey: [
      "trends",
      "indicator-data",
      selectedIndicator,
      indicatorBounds.from,
      indicatorBounds.to,
    ],
    queryFn: () =>
      apiGet<IndicatorDataRow[]>(
        `/api/v1/indicator-data?indicator_code=${encodeURIComponent(selectedIndicator)}&from=${encodeURIComponent(indicatorBounds.from)}&to=${encodeURIComponent(indicatorBounds.to)}`,
      ),
    enabled: Boolean(selectedIndicator),
  });

  const slices = useMemo(() => {
    const masters = stockIndicesQuery.data ?? [];
    return masters.map((m, i) => ({
      code: m.code,
      name: m.name,
      rows: priceQueries[i]?.data ?? [],
      isLoading: priceQueries[i]?.isLoading ?? false,
      error: (priceQueries[i]?.error as Error) ?? null,
      onRetry: () => void priceQueries[i]?.refetch(),
    }));
  }, [stockIndicesQuery.data, priceQueries]);

  const columnBase = "col-span-12 flex min-h-0 flex-col";

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-6">
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-6 lg:items-stretch">
        <section className={`${columnBase} lg:col-span-8`}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
            <StockIndicesSection
              slices={slices}
              indicesLoading={stockIndicesQuery.isLoading}
              indicesError={stockIndicesQuery.error as Error | null}
              onRetryIndices={() => void stockIndicesQuery.refetch()}
              dateRangePreset={stockRangePreset}
              onDateRangeChange={setStockRangePreset}
            />
          </div>
        </section>

        <section className={`${columnBase} lg:col-span-4`}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
            <IndicatorRegionsChart
              indicators={indicatorsQuery.data ?? []}
              indicatorsLoading={indicatorsQuery.isLoading}
              indicatorsError={indicatorsQuery.error as Error | null}
              onRetryIndicators={() => void indicatorsQuery.refetch()}
              selectedCode={selectedIndicator}
              onSelectCode={setSelectedIndicator}
              regionCatalog={regionsQuery.data ?? []}
              data={indicatorDataQuery.data ?? []}
              dataLoading={indicatorDataQuery.isLoading}
              dataError={indicatorDataQuery.error as Error | null}
              onRetryData={() => void indicatorDataQuery.refetch()}
              dateRangePreset={indicatorRangePreset}
              onDateRangeChange={setIndicatorRangePreset}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
