import { Onboarding } from "@/components/Onboarding";

export const metadata = { title: "How it works · Past You" };

export default function How() {
  return (
    <div className="page wide stack fade-in" style={{ paddingTop: "1.25rem" }}>
      <header className="stack stack-sm" style={{ textAlign: "center", justifyItems: "center" }}>
        <p className="eyebrow">How it works</p>
        <h1 style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.6rem)" }}>Four steps to your first promise</h1>
      </header>
      <Onboarding showConnect={false} />
    </div>
  );
}
