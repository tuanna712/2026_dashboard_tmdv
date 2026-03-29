import { useTranslation } from "react-i18next";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="rounded-xl border border-error/30 bg-error-container/30 p-4 text-sm text-on-error-container"
    >
      <p className="font-semibold">{t("error.genericTitle")}</p>
      <p className="mt-1 opacity-90">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-on-primary text-xs font-semibold"
        >
          {t("error.retry")}
        </button>
      ) : null}
    </div>
  );
}
