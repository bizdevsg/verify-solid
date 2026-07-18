export function LoadingState({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-zinc-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-border border-t-gold" />
      <span>{label}</span>
    </div>
  );
}
