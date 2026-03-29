import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation } from "react-router-dom";
import type { Market } from "@/features/dashboard/MarketTabs";
import { MarketTabs } from "@/features/dashboard/MarketTabs";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  market: Market;
  onMarketChange: (m: Market) => void;
};

export function DashboardLayout({ market, onMarketChange }: Props) {
  const { t, i18n } = useTranslation();
  const loc = useLocation();
  const { dark, toggle } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const nav = [
    { to: "/", labelKey: "nav.dashboard" as const, icon: "dashboard" },
    { to: "/newsletter", labelKey: "nav.newsletter" as const, icon: "mail" },
    { to: "/trends", labelKey: "nav.trends" as const, icon: "trending_up" },
    { to: "/reports", labelKey: "nav.reports" as const, icon: "assessment" },
  ];

  const isEn = (i18n.resolvedLanguage ?? i18n.language).startsWith("en");
  const isVi = (i18n.resolvedLanguage ?? i18n.language).startsWith("vi");

  return (
    <div className="bg-background text-on-background overflow-hidden flex min-h-screen md:h-screen md:overflow-hidden">
      <aside
        className={`hidden md:flex flex-col h-screen fixed left-0 top-0 z-40 bg-surface-container-low dark:bg-slate-900 border-r border-slate-200/50 dark:border-slate-800/50 transition-[width] duration-200 ease-out overflow-hidden ${
          sidebarCollapsed ? "w-16 p-2 gap-1" : "w-64 p-4 gap-2"
        }`}
      >
        <div
          className={`flex shrink-0 ${
            sidebarCollapsed
              ? "flex-col items-center gap-2 px-0 mb-4"
              : "items-center gap-3 px-2 mb-8"
          }`}
        >
          <img
            src="/logo.png"
            alt=""
            className={`object-contain shrink-0 ${
              sidebarCollapsed ? "h-9 w-9 rounded-lg" : "h-9 w-auto max-w-[140px]"
            }`}
            width={sidebarCollapsed ? 36 : undefined}
            height={36}
          />
          {sidebarCollapsed && (
            <span className="sr-only">{t("app.brandShort")}</span>
          )}
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="font-headline font-bold text-lg text-primary-container dark:text-emerald-500 leading-tight">
                {t("app.brand")}
              </h1>
            </div>
          )}
        </div>
        <nav
          className="flex-1 flex flex-col gap-1 min-h-0 overflow-y-auto"
          aria-label={t("aria.mainNav")}
        >
          {nav.map((item) => {
            const active = loc.pathname === item.to;
            const label = t(item.labelKey);
            return (
              <Link
                key={item.to}
                to={item.to}
                title={sidebarCollapsed ? label : undefined}
                className={`flex items-center rounded-lg text-sm transition-all ${
                  sidebarCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"
                } ${
                  active
                    ? "bg-white dark:bg-slate-800 text-primary-container dark:text-emerald-400 shadow-sm font-semibold"
                    : `text-slate-600 dark:text-slate-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 duration-200 ${
                        sidebarCollapsed ? "" : "hover:translate-x-1"
                      }`
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
                <span className={sidebarCollapsed ? "sr-only" : ""}>{label}</span>
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => setSidebarCollapsed((c) => !c)}
          className="mt-auto shrink-0 flex items-center justify-center rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors"
          aria-expanded={!sidebarCollapsed}
          aria-label={
            sidebarCollapsed ? t("aria.expandSidebar") : t("aria.collapseSidebar")
          }
        >
          <span className="material-symbols-outlined text-[20px]">
            {sidebarCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
      </aside>

      <main
        className={`flex-1 flex flex-col min-h-screen md:min-h-0 md:overflow-hidden w-full transition-[margin] duration-200 ease-out ${
          sidebarCollapsed ? "md:ml-16" : "md:ml-64"
        }`}
      >
        <header className="flex justify-between items-center w-full px-4 md:px-6 py-3 border-b border-slate-200/50 bg-background dark:bg-slate-950 z-50 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 min-w-0">
            <div className="text-lg md:text-xl font-bold tracking-tighter text-primary-container dark:text-emerald-500 font-headline truncate">
              {t("app.marketInsights")}
            </div>
            <MarketTabs value={market} onChange={onMarketChange} />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div
              className="flex items-center rounded-full border border-slate-200/80 dark:border-slate-700 p-0.5"
              role="group"
              aria-label={t("aria.language")}
            >
              <button
                type="button"
                onClick={() => void i18n.changeLanguage("en")}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                  isEn
                    ? "bg-primary text-on-primary"
                    : "text-slate-600 dark:text-slate-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20"
                }`}
                aria-pressed={isEn}
                aria-label={t("aria.switchToEnglish")}
              >
                {t("lang.en")}
              </button>
              <button
                type="button"
                onClick={() => void i18n.changeLanguage("vi")}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                  isVi
                    ? "bg-primary text-on-primary"
                    : "text-slate-600 dark:text-slate-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20"
                }`}
                aria-pressed={isVi}
                aria-label={t("aria.switchToVietnamese")}
              >
                {t("lang.vi")}
              </button>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors rounded-full"
              aria-label={dark ? t("aria.lightMode") : t("aria.darkMode")}
            >
              <span className="material-symbols-outlined">
                {dark ? "light_mode" : "dark_mode"}
              </span>
            </button>
          </div>
        </header>

        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto p-4 md:p-6 bg-surface md:overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
