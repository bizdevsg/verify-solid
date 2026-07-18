export default function JoinCompletedPage() {
  return (
    <div className="space-y-3 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
        &#10003;
      </div>
      <h2 className="text-lg font-semibold text-zinc-900">Meeting Selesai</h2>
      <p className="mx-auto max-w-sm text-sm text-zinc-500">
        Terima kasih telah mengikuti proses verifikasi video. Anda dapat menutup halaman ini.
      </p>
    </div>
  );
}
