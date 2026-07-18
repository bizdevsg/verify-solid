export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-light">
      <header className="border-b border-gray-border bg-charcoal px-4 py-3 text-center">
        <span className="text-sm font-semibold text-white">
          Solid <span className="text-gold">Video Verification</span>
        </span>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl border border-gray-border bg-white p-6 shadow-sm">{children}</div>
      </main>
    </div>
  );
}
