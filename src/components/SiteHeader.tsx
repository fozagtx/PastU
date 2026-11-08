"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "./ConnectButton";
import { Logo } from "./Logo";
export function SiteHeader() {
  const path = usePathname();
  // Demo pages are no-wallet by design. Hiding the wallet button avoids the
  // impression that Maya's invented data is the signed-in user's data.
  const isDemo = path === "/story" || path?.startsWith("/story/");
  return (
    <header className="siteHeader">
      <Link href="/" className="brand" aria-label="Past You, home"><Logo /><span>Past <em>You</em></span></Link>
      <nav className="row" aria-label="Main" style={{ gap: "1rem" }}>
        <Link className="navLink" href="/how">How it works</Link>
        <Link className="navLink" href="/story">Maya’s story</Link>
        {!isDemo && <ConnectButton />}
      </nav>
    </header>
  );
}
