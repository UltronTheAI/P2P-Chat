import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "P2P Chat",
  description: "A dark-theme peer-to-peer messaging MVP built with Next.js and WebRTC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-black text-white">{children}</body>
    </html>
  );
}
