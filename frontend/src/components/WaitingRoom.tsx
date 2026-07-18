export function WaitingRoom({ staffName, meetingTitle }: { staffName: string; meetingTitle: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="h-14 w-14 animate-pulse rounded-full bg-gold/20" />
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Menunggu Petugas</h2>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          Mohon tunggu, {staffName} akan segera memulai meeting &ldquo;{meetingTitle}&rdquo;. Halaman ini akan
          berpindah otomatis saat meeting dimulai.
        </p>
      </div>
      <div className="h-2 w-2 animate-bounce rounded-full bg-gold [animation-delay:-0.3s]" />
    </div>
  );
}
