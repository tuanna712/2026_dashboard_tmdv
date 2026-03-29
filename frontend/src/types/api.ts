export type ApiEnvelope<T> = {
  data: T;
  message: string;
  errors: string[] | null;
};

export type ChangeDirection = "up" | "down" | "flat";

export type PricingRow = {
  prod_code: string;
  prod_name: string;
  price: string;
  currency_code: string | null;
  unit_code: string | null;
  last_updated_at: string | null;
  value_change: string | null;
  percentage_change: string | null;
  change_direction: ChangeDirection;
};

export type PricingGroupBlock = {
  group_code: string;
  group_name: string;
  items: PricingRow[];
};

export type PricingByGroupData = {
  market: string;
  groups: PricingGroupBlock[];
};

export type HistorySeries = {
  prod_code: string;
  label: string;
  prices: (number | null)[];
  unit_code: string | null;
};

export type HistoryChartData = {
  group_code: string;
  source: string;
  dates: string[];
  series: HistorySeries[];
};

export type ForecastRow = {
  id: number;
  prod_code: string;
  prod_name: string;
  forecast_price: string;
  currency_code: string | null;
  unit_code: string | null;
  forecast_period: string | null;
  period_type: string | null;
  forecast_provider_code: string | null;
  forecast_provider_name: string | null;
  created_at: string | null;
};

export type ForecastListData = {
  items: ForecastRow[];
};

export type StockIndexItem = {
  code: string;
  name: string;
  market: string | null;
};

export type StockIndexPriceRow = {
  id: number;
  code: string;
  date: string | null;
  close: string | null;
  currency: string | null;
};

export type RegionItem = {
  region_code: string;
  region_name: string;
};

export type IndicatorItem = {
  indicator_code: string;
  name: string;
  category: string | null;
};

export type IndicatorDataRow = {
  id: number;
  indicator_code: string;
  region_code: string;
  value: string | null;
  unit: string | null;
  period: string | null;
  period_type: string | null;
};
