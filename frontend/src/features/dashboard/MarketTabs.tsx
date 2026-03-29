import { useTranslation } from "react-i18next";

export type Market = "international" | "domestic";

export function MarketTabs({
  value,
  onChange,
}: {
  value: Market;
  onChange: (m: Market) => void;
}) {
  const { t } = useTranslation();
  const tabs: { id: Market; labelKey: "market.international" | "market.domestic" }[] = [
    { id: "international", labelKey: "market.international" },
    { id: "domestic", labelKey: "market.domestic" },
  ];

  return (
    <nav className="hidden md:flex gap-6" aria-label={t("aria.marketScope")}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`text-sm font-bold pb-1 border-b-2 transition-colors ${
            value === tab.id
              ? "text-primary border-primary"
              : "text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </nav>
  );
}
