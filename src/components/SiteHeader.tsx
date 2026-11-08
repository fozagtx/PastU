import Link from "next/link";
import { ConnectButton } from "./ConnectButton";
export function SiteHeader() {
  return (
    <header className="siteHeader">
      <Link href="/" className="brand">Past <em>You</em></Link>
      <ConnectButton />
    </header>
  );
}
