import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import type { Market } from "@/features/dashboard/MarketTabs";
import { DashboardPage } from "@/pages/DashboardPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { TrendsPage } from "@/pages/TrendsPage";

function AppRoutes() {
  const { t } = useTranslation();
  const [market, setMarket] = useState<Market>("international");

  return (
    <Routes>
      <Route element={<DashboardLayout market={market} onMarketChange={setMarket} />}>
        <Route index element={<DashboardPage market={market} />} />
        <Route path="newsletter" element={<PlaceholderPage title={t("nav.newsletter")} />} />
        <Route path="trends" element={<TrendsPage market={market} />} />
        <Route path="reports" element={<PlaceholderPage title={t("nav.reports")} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
