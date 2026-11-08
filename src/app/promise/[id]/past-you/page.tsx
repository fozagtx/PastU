import { Suspense } from "react";
import { PastYouScreen } from "@/components/PastYouScreen";
export const metadata = { title: "Past You" };
export default function Page() { return <Suspense><PastYouScreen /></Suspense>; }
