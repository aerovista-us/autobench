import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoBench | AeroVista",
  description: "AI-first vehicle design and fabrication workbench.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
