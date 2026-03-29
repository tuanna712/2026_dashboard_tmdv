import { useTranslation } from "react-i18next";
import type { ChangeDirection, PricingRow as PricingRowT } from "@/types/api";
import { formatMoney, formatPercent, formatPlainNumber, formatShortDate } from "@/utils/format";
import { tProduct } from "@/utils/localizedEntity";

function DirectionBadge({
  dir,
  change,
  pct,
  updatedAt,
  locale,
}: {
  dir: ChangeDirection;
  change: string | null;
  pct: string | null;
  updatedAt: string | null;
  locale: string;
}) {
  const icon =
    dir === "up" ? "trending_up" : dir === "down" ? "trending_down" : "horizontal_rule";
  const color =
    dir === "up"
      ? "text-secondary bg-secondary-fixed/30"
      : dir === "down"
        ? "text-error bg-error-container/40"
        : "text-on-surface-variant bg-surface-container/50";
  const changeNum = change !== null && change !== "" ? Number(change) : NaN;
  const changeStr =
    !Number.isNaN(changeNum) && change !== null
      ? `${changeNum > 0 ? "+" : ""}${formatPlainNumber(changeNum, locale)}`
      : change || "0";

  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${color}`}
      >
        <span className="material-symbols-outlined text-[12px] mr-0.5">{icon}</span>
        {changeStr}
      </span>
      <span
        className={`text-[10px] font-medium ${
          dir === "up"
            ? "text-secondary"
            : dir === "down"
              ? "text-error"
              : "text-outline"
        }`}
      >
        {formatPercent(pct, locale)}
      </span>
      <span className="ml-auto text-[9px] text-outline-variant font-medium">
        {formatShortDate(updatedAt, locale)}
      </span>
    </div>
  );
}

export function PricingCardRow({ row }: { row: PricingRowT }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  return (
    <div className="flex flex-col gap-1 p-2 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer group">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-on-surface">
          {tProduct(row.prod_code, row.prod_name, t)}
        </span>
        <span className="text-xs font-bold font-headline">
          {formatMoney(row.price, row.currency_code, locale)}
        </span>
      </div>
      <DirectionBadge
        dir={row.change_direction}
        change={row.value_change}
        pct={row.percentage_change}
        updatedAt={row.last_updated_at}
        locale={locale}
      />
    </div>
  );
}
