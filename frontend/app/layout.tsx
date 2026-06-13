import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pickwise",
  description: "Yapay zeka destekli alışveriş asistanı.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className="h-full antialiased"
    >
      <body className="flex h-full flex-col overflow-hidden">{children}</body>
    </html>
  );
}
