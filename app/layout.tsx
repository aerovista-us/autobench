import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://autobench-nu.vercel.app";
const title = "Pops Van AutoBench | AeroVista";
const description = "Design the next chapter of Pops' classic Chevy 4x4 van. Explore body styling, suspension clearance, CAD concepts and measurement-led fabrication planning in AeroVista AutoBench.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "Pops Van AutoBench",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], shortcut: "/icon.svg" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "AeroVista AutoBench",
    title,
    description,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Pops Van AutoBench — classic Chevy 4x4 van design workbench" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
