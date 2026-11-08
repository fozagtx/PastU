import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Figtree, Newsreader } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";

const sans = Figtree({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Past You",
  description: "When you try to break a promise to yourself, you hear from yourself. In your own words.",
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f6f4ef" }, { media: "(prefers-color-scheme: dark)", color: "#0c0c0d" }],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <Providers>
          <SiteHeader />
          <main id="main">{children}</main>
          <footer className="siteFooter">
            Test version on Sui testnet. Don’t lock money you can’t afford to lose.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
