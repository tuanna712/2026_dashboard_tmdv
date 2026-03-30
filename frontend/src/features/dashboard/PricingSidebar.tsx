import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Market } from "@/features/dashboard/MarketTabs";
import type { PricingByGroupData } from "@/types/api";
import { tGroup } from "@/utils/localizedEntity";
import { PricingCardRow } from "./PricingCardRow";

export function PricingSidebar({
  data,
  market,
  isLoading,
  isError,
  error,
  onRetry,
}: {
  data: PricingByGroupData | undefined;
  market: Market;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const expectedCurrency = market === "international" ? "USD" : "VND";
  const filteredGroups = useMemo(
    () =>
      (data?.groups ?? []).map((group) => ({
        ...group,
        items: group.items.filter((row) => (row.currency_code ?? "").toUpperCase() === expectedCurrency),
      })),
    [data?.groups, expectedCurrency],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }
  if (isError) {
    return (
      <ErrorState message={error?.message || t("pricing.errorLoad")} onRetry={onRetry} />
    );
  }
  if (!filteredGroups.length) {
    return (
      <EmptyState title={t("pricing.emptyTitle")} description={t("pricing.emptyDescription")} />
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
      {filteredGroups.map((g) => (
        <section key={g.group_code} className="mb-6 last:mb-0">
          <h2 className="font-headline font-bold text-sm text-primary mb-4">
            {tGroup(g.group_code, g.group_name, t)}
          </h2>
          {g.items.length === 0 ? (
            <p className="text-xs text-on-surface-variant">{t("pricing.noRows")}</p>
          ) : (
            <div className="space-y-3">
              {g.items.map((row) => (
                <PricingCardRow key={row.prod_code} row={row} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
