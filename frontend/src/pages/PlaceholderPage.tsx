import { useTranslation } from "react-i18next";

export function PlaceholderPage({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-lg flex-1 overflow-y-auto py-16 text-center md:min-h-0">
      <span className="material-symbols-outlined text-5xl text-outline-variant">construction</span>
      <h1 className="mt-4 font-headline text-xl font-bold text-primary">{title}</h1>
      <p className="mt-2 text-sm text-on-surface-variant">{t("placeholder.notImplemented")}</p>
    </div>
  );
}
