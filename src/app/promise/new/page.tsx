import { Suspense } from "react";
import { NewPromiseForm } from "@/components/NewPromiseForm";
export const metadata = { title: "New promise · Past You" };
export default function Page() { return <Suspense><NewPromiseForm /></Suspense>; }
