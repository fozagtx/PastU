"use client";
import { useState } from "react";

export function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ }
  }
  return (
    <div className="field">
      <div className="fieldHead"><span className="label" style={{ margin: 0 }}>{label}</span>
        <button type="button" className="btn text" onClick={copy} aria-label={`Copy ${label}`}>{done ? "Copied" : "Copy"}</button></div>
      <code className="fieldVal">{value}</code>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
