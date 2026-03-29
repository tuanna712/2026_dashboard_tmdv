export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant/40 p-8 text-center">
      <span className="material-symbols-outlined text-4xl text-outline mb-2">inventory_2</span>
      <p className="font-headline font-semibold text-on-surface">{title}</p>
      {description ? <p className="mt-1 text-sm text-on-surface-variant">{description}</p> : null}
    </div>
  );
}
