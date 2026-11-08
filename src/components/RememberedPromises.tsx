"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listPromises } from "@/lib/client/store";
import { shortId } from "@/lib/client/format";

export function RememberedPromises() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => setIds(listPromises()), []);
  if (!ids.length) return null;
  return (
    <section className="stack stack-sm fade-in">
      <h2>Your promises on this device</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack-sm stack">
        {ids.map((id) => <li key={id}><Link href={`/promise/${id}`}>Promise {shortId(id, 5)}</Link></li>)}
      </ul>
    </section>
  );
}
