import { Onboarding } from "@/components/Onboarding";

export const metadata = { title: "How it works · Past You" };

export default function How() {
  return (
    <div className="page wide centerPage fade-in">
      <h1 className="centerTitle">Four steps to your first promise</h1>
      <Onboarding showConnect={false} />
    </div>
  );
}
