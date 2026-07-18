export function ErrorState({
  message = "Terjadi kesalahan saat memuat data.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 py-12 text-center text-sm text-red-700">
      <p>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md bg-red-600 px-4 py-1.5 text-white transition hover:bg-red-700"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
}
