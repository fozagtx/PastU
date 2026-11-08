import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Past You",
  description: "When you try to break a promise to yourself, you hear from yourself. In your own words.",
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f7f3ec" }, { media: "(prefers-color-scheme: dark)", color: "#17140f" }],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <Providers>
          <SiteHeader />
          <main id="main">{children}</main>
          <footer className="siteFooter">
            Past You is an unaudited demo. Do not deposit more than you can afford to lose. Your words are stored on Walrus; AI help comes from Nebius.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
