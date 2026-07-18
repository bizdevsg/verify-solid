import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Solid Video Verification",
  description: "Verifikasi video satu lawan satu antara petugas Solid Gold dan nasabah.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-light text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
