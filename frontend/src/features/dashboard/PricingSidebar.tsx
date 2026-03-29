import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PricingByGroupData } from "@/types/api";
import { tGroup } from "@/utils/localizedEntity";
import { PricingCardRow } from "./PricingCardRow";

export function PricingSidebar({
  data,
  isLoading,
  isError,
  error,
  onRetry,
}: {
  data: PricingByGroupData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation();

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
  if (!data?.groups?.length) {
    return (
      <EmptyState title={t("pricing.emptyTitle")} description={t("pricing.emptyDescription")} />
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
      {data.groups.map((g) => (
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
