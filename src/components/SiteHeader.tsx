import Link from "next/link";
import { ConnectButton } from "./ConnectButton";
import { Logo } from "./Logo";
export function SiteHeader() {
  return (
    <header className="siteHeader">
      <Link href="/" className="brand" aria-label="Past You, home"><Logo /><span>Past <em>You</em></span></Link>
      <nav className="row" aria-label="Main" style={{ gap: "1rem" }}>
        <Link className="navLink" href="/story">Maya’s story</Link>
        <Link className="navLink" href="/details">Agent ID</Link>
        <ConnectButton />
      </nav>
    </header>
  );
}
