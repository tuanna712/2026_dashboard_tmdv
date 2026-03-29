# API endpoints required for the dashboard (`dashboard.html`)

This document ties the static dashboard layout to your PostgreSQL model (`data/dbdiagram.txt`, `data/create_tables.py`) and sample CSVs under `data/csv/`. It is written so a **FastAPI** backend and a **React + TypeScript** client can be implemented in a consistent way.

## Conventions (backend + frontend)

- **Base URL**: `/api/v1` (prefix all routes below).
- **JSON**: UTF-8, `Content-Type: application/json`. Use `decimal` as **string** in JSON if you need exact money values; otherwise document `number` and accept float rounding in the UI.
- **Dates**: ISO 8601 date `YYYY-MM-DD` for calendar dates; timestamps as RFC 3339 (`...Z` or offset).
- **Errors**: Problem-style bodies, e.g. `{ "detail": "...", "code": "NOT_FOUND" }` with appropriate HTTP status.
- **CORS**: Enable for the React dev origin in development.
- **Pagination** (optional later): `limit`, `cursor` for large history tables; the dashboard MVP can use fixed windows for charts.

### TypeScript/React notes

- Generate or hand-write **OpenAPI** from FastAPI and run **openapi-typescript** (or similar) for `paths` / `components.schemas` types.
- Keep **view models** separate from raw DB rows when the UI needs formatted labels (e.g. chart legend names, signed change strings).

---

## Schema alignment and known mismatches

| Area | `dbdiagram.txt` | `create_tables.py` (commented DDL) / CSV |
|------|-----------------|------------------------------------------|
| `product` PK | `prod_id int` | DDL uses surrogate `id` + `prod_code` unique — pick one source of truth before coding. |
| `price_history` date column | `price_date` | Commented DDL uses `date`; CSV header uses `price_date`. **Standardize on one name** in migrations. |
| `price_forecast` provider FK | `source` → `forecast_provider` | Commented DDL column `forecast_provider`; CSV matches. Align ORM/models with the real DB. |
| `price_latest.change_direction` | `'up' / 'down'` comment | Sample CSV uses `increase` / `decrease`. API should **normalize** to a small enum for the UI. |
| `forecast_provider` | No explicit PK in diagram | Treat `forecast_provider_code` as PK (matches commented DDL). |

---

## 1. Reference data (products & groups)

Used to build filters, labels, and to validate `prod_code` / `group_code` query parameters.

### `GET /product-groups`

- **Purpose**: Populate group metadata (sidebar sections: Crude, Fuel, Fertilizer, Agricultural Product).
- **DB**: `product_group`.
- **Response** (example):

```json
{
  "items": [
    { "group_code": "CRUDE", "group_name": "Crude Oil" },
    { "group_code": "FUEL", "group_name": "Refined Petroleum Products" }
  ]
}
```

### `GET /products`

- **Purpose**: Optional master list for drill-down, admin, or future product pickers.
- **Query**: `group_code` (optional), `q` (optional search on `prod_name` / `prod_code`).
- **DB**: `product` (join `product_group` if you need `group_name`).
- **Response item** (example):

```json
{
  "prod_id": 1,
  "prod_code": "MOGAS95",
  "prod_name": "Mogas 95",
  "group_code": "FUEL",
  "group_name": "Refined Petroleum Products"
}
```

*(If the live DB uses only `prod_code` as business key, you may omit `prod_id` in the API or alias it.)*

---

## 2. Left column — “latest price” cards by group

**UI**: `dashboard.html` — sections **Crude Oil**, **Fuel**, **Fertilizer**, **Agricultural Product**; each row: name, price, absolute change, % change, direction icon, “as of” date.

### `GET /dashboard/pricing-by-group`

- **Purpose**: Single request returning all groups and their latest rows for the sidebar (matches the four stacked blocks).
- **DB**: `price_latest` **JOIN** `product` **JOIN** `product_group` (and **JOIN** `currency` if you need currency display names).
- **Query parameters**:
  - `groups` (optional): comma-separated `group_code` values, default all four dashboard groups: `CRUDE,FUEL,FERT,AGRI`.
  - `market` (optional, see below): reserved for **International** vs **Domestic** header tabs.

**`market` behavior (important)**  
`price_latest` in the diagram has **no** `source` or `region_code`. Sample `price_history` uses `source` (e.g. `DOM`). Until `price_latest` is split per market or joined to a market-specific view, implement one of:

1. **Phase 1**: Ignore `market` (same snapshot for both tabs), **or**
2. **Phase 2**: Filter using a denormalized column on `price_latest` (e.g. `market_scope` / `source_code`), **or**
3. **Phase 2**: Derive “latest” per `(prod_code, source)` from `price_history` instead of `price_latest` for the domestic/international toggle.

Document the chosen behavior in OpenAPI (`description` on the parameter).

- **Response** (example):

```json
{
  "market": "international",
  "groups": [
    {
      "group_code": "CRUDE",
      "group_name": "Crude Oil",
      "items": [
        {
          "prod_code": "WTI",
          "prod_name": "WTI Crude Oil",
          "price": "92.3200",
          "currency_code": "USD",
          "unit_code": null,
          "last_updated_at": "2026-03-25T00:00:00Z",
          "value_change": "0.7620",
          "percentage_change": "1.14",
          "change_direction": "up"
        }
      ]
    }
  ]
}
```

- **`change_direction` enum** (normalized for the UI): `up` | `down` | `flat` (map from DB `increase`/`decrease`/`flat`).

**React usage**: One `useQuery` on mount; map `groups[].items` to the existing card layout; format numbers and dates in the client.

---

## 3. Center column — historical price charts

**UI**: Four panels — **Crude Oil Historical Price** (multi-series), **Fuel Price**, **Fertilizer Price**, **Agriculture Price** (placeholders in HTML). The crude chart expects **aligned dates** and **one array of prices per series** (see inline `CRUDE_OIL_CHART_DATA` in `dashboard.html`).

### `GET /dashboard/price-history-chart`

- **Purpose**: Time series for a **single product group** (or explicit product list) suitable for line charts.
- **DB**: `price_history` **JOIN** `product` (for names) **JOIN** `price_source` (optional, for filtering).
- **Query parameters**:
  - `group_code`: `CRUDE` | `FUEL` | `FERT` | `AGRI` (required unless `prod_codes` is provided).
  - `prod_codes` (optional): comma-separated override; must belong to the group (server validates).
  - `from`, `to` (optional): ISO dates; default e.g. last 90 days or max range in DB.
  - `source` (optional): `price_source.source_code` — **primary lever for Domestic vs International** if those tabs filter history (e.g. `DOM` vs a global benchmark code).
  - `granularity` (optional): `day` | `week` | `month` — if you aggregate (else return raw observations).

- **Response** (chart-friendly, mirrors the template structure):

```json
{
  "group_code": "CRUDE",
  "source": "DOM",
  "dates": ["2026-01-06", "2026-01-13"],
  "series": [
    {
      "prod_code": "DATEDBRENT",
      "label": "Dated Brent",
      "prices": [78.4, 79.2]
    }
  ]
}
```

**Backend rules**:

- **Align series**: Only include dates where **all** requested products have a value, **or** return sparse points and let the frontend interpolate (document which). The static template uses **dense** arrays — simplest is to return a **shared** `dates` array and `null`-allowed prices, e.g. `"prices": [78.4, null]`, with OpenAPI type `number | null`, **or** fill forward last observation (document).
- **Units**: `price_history` has `unit`; include per series if multiple units can appear (`unit_code` + display name from `unit`).

**Repeat calls**: The React app will call this endpoint **four times** (once per chart) with different `group_code`, or you may add a batch endpoint later:

### `POST /dashboard/price-history-charts` (optional batch)

- **Body**: `{ "requests": [ { "group_code": "CRUDE", "from": "...", "to": "...", "source": "DOM" }, ... ] }`
- **Response**: `{ "charts": [ { ...same as GET... }, ... ] }`

---

## 4. Right column — predictive price forecasting

**UI**: “Predictive Price Forecasting” list rows showing product code, provider, forecast price, period.

### `GET /dashboard/price-forecasts`

- **Purpose**: Latest or selected forecasts for dashboard teaser list.
- **DB**: `price_forecast` **JOIN** `product` **LEFT JOIN** `forecast_provider` on `price_forecast.source` = `forecast_provider.forecast_provider_code` (or equivalent column name in your DB).
- **Query parameters**:
  - `limit` (default `10`)
  - `group_code` (optional): filter via `product.group_code`
  - `period_type` (optional): e.g. `QUARTERLY` (matches CSV)
  - `forecast_provider` (optional): provider code filter

- **Response** (example):

```json
{
  "items": [
    {
      "id": 1,
      "prod_code": "LPG",
      "prod_name": "LPG",
      "forecast_price": "58.7000",
      "currency_code": "USD",
      "unit_code": "BBL",
      "forecast_period": "2026-01-01",
      "period_type": "QUARTERLY",
      "forecast_provider_code": "WM",
      "forecast_provider_name": "Wood Mackenzie",
      "created_at": "2026-03-15"
    }
  ]
}
```

If multiple rows exist per product (different periods), either return **only the latest per `prod_code`** (window function in SQL) or return all and let the UI group (specify in OpenAPI).

---

## 5. Header — International vs Domestic

**UI**: Top nav tabs “International” / “Domestic”.

**Recommended mapping**:

- Pass `market=international|domestic` from React; FastAPI maps to one or more `price_source.source_code` values (or `region_code` if you attach regions to sources in seed data).
- Apply consistently to:
  - `GET /dashboard/price-history-chart` (`source` or derived from `market`)
  - `GET /dashboard/pricing-by-group` once `price_latest` supports market or you compute latest from history per source.

Until that mapping exists, implement the tabs as **client state** that sets `source` / `market` query params and show a **501** or empty state when unsupported — avoid silent wrong data.

---

## 6. Supporting reference endpoints (optional for MVP)

These are not shown on `dashboard.html` but match your schema and CSVs for future “Market Trends” / “Reports” pages.

| Method & path | DB tables | Purpose |
|---------------|-----------|---------|
| `GET /currencies` | `currency` | Reference |
| `GET /units` | `unit` | Reference |
| `GET /price-sources` | `price_source` | Build `source` dropdowns |
| `GET /forecast-providers` | `forecast_provider` | Admin / filters |
| `GET /regions` | `region` | Regional indicators |
| `GET /indicators` | `indicator` | Metadata |
| `GET /indicator-data` | `indicator_data` | Time series / tables (query: `indicator_code`, `region_code`, `from`, `to`) |
| `GET /stock-indices` | `stock_index_master` | Master list |
| `GET /stock-index-prices` | `stock_index_price` | Chart data (query: `code`, `from`, `to`) |

---

## 7. FastAPI implementation sketch (for later)

- **Routers**: `reference.py` (groups, products, enums), `dashboard.py` (snapshot + charts + forecasts).
- **Dependencies**: Async or sync DB session (SQLAlchemy / psycopg); **one module** mapping `market` → `source` codes.
- **Pydantic models**: `PricingGroupBlock`, `PricingRow`, `HistoryChartResponse`, `ForecastRow` — mirror the JSON above.
- **Performance**: For `pricing-by-group`, prefer **one SQL** with `WHERE group_code = ANY(:groups)` and `JOIN price_latest`; for charts, index `(prod_code, price_date)` or `(prod_code, date)` per your final column name.

---

## 8. React + TypeScript integration sketch (for later)

- **Data fetching**: TanStack Query (React Query) with keys `['dashboard','pricing', market]` and `['dashboard','chart', groupCode, source, from, to]`.
- **Components**: `PricingSidebar`, `PriceChart` (props: `HistoryChartResponse`), `ForecastList`.
- **Formatting**: `Intl.NumberFormat` for money; map `change_direction` to icon (trending_up / trending_down / horizontal_rule).
- **Internationalization**: Keep API field names in English; translate `group_name` / `prod_name` only if you add i18n columns or a locale layer.

---

## 9. Market Trends page (`/trends`)

**UI**: React route `Market Trends` — major equity **close** prices (multi-index line chart) and **macro indicators** with one series per `region_code`.

**Response envelope** (all routes below): the app wraps payloads as:

```json
{
  "data": …,
  "message": "ok",
  "errors": null
}
```

Use `data` as the typed body in the client (`apiGet` already unwraps it). **Monetary / numeric precision**: expose `close` and `value` as **strings** in JSON where the DB uses `NUMERIC` (matches current FastAPI/Pydantic behavior).

### `GET /stock-indices`

- **Purpose**: Master list for index tickers (e.g. DJI, SPX, COMP) from `stock_index_master`.
- **Query**: none.
- **Response** (`data`: array):

```json
[
  {
    "code": "DJI",
    "name": "Dow Jones",
    "market": "USA"
  }
]
```

**React usage**: Drive `useQueries` — one `GET /stock-index-prices` per `code` (typically 3 parallel requests).

### `GET /stock-index-prices`

- **Purpose**: Daily (or irregular) **close** observations for one index; joins implicitly via `code` to `stock_index_master`.
- **DB**: `stock_index_price` (`close`, `currency`, `date`).
- **Query**:
  - `code` (required): `stock_index_master.code`.
  - `from`, `to` (optional): ISO `YYYY-MM-DD` — filter `date` inclusive (alias `from` on the wire as in FastAPI: `from_` → `from`).

- **Response** (`data`: array, ascending `date`):

```json
[
  {
    "id": 1,
    "code": "DJI",
    "date": "2026-03-23",
    "close": "46208.0000",
    "currency": "USD"
  }
]
```

**Frontend**: Merge multiple codes into one chart (shared date axis); **rebase** each series to 100 at the first observation in range for comparability, or use **small multiples** for absolute levels.

### `GET /indicators`

- **Purpose**: Catalog rows for the indicator dropdown (`indicator`).
- **Response** (`data`: array):

```json
[
  {
    "indicator_code": "PMI",
    "name": "Manufacturing PMI",
    "category": "MACRO"
  }
]
```

### `GET /regions`

- **Purpose**: Labels for `region_code` in charts and filters (`region`).
- **Response** (`data`: array):

```json
[
  {
    "region_code": "USA",
    "region_name": "United States"
  }
]
```

### `GET /indicator-data`

- **Purpose**: Observations for charts/tables (`indicator_data`).
- **Query**:
  - `indicator_code` (optional but **recommended** for the Trends page — avoids large unfiltered responses).
  - `region_code` (optional).
  - `from`, `to` (optional): applied to **`period`** when it parses as an ISO date (`YYYY-MM-DD` prefix); rows with non-parseable `period` pass through when a date filter is set (current backend behavior).

- **Response** (`data`: array):

```json
[
  {
    "id": 1,
    "indicator_code": "PMI",
    "region_code": "USA",
    "value": "52.4",
    "unit": null,
    "period": "2026-01-01",
    "period_type": "MONTHLY"
  }
]
```

**Frontend**: For a fixed `indicator_code`, pivot by `period` on the X-axis and `region_code` as separate series; honor `unit` in axis subtitle/tooltip.

### Optional batch optimization (not implemented)

- `GET /dashboard/stock-indices-chart?codes=DJI,SPX,COMP&from=&to=` — single round-trip returning a chart-shaped payload (same idea as `GET /dashboard/price-history-chart`). Useful if the number of indices grows.

---

## Summary checklist (minimum for current `dashboard.html`)

| # | Endpoint | Fills UI section |
|---|----------|------------------|
| 1 | `GET /product-groups` | Labels for group sections (optional if hard-coded) |
| 2 | `GET /dashboard/pricing-by-group` | Left column — all four group tables |
| 3 | `GET /dashboard/price-history-chart` | Center — crude / fuel / fertilizer / ag charts |
| 4 | `GET /dashboard/price-forecasts` | Right — predictive list |

The **Market Trends** nav item uses §9 (`/stock-indices`, `/stock-index-prices`, `/indicators`, `/regions`, `/indicator-data`). Add an optional batch stock-chart route if index count or latency becomes an issue.
