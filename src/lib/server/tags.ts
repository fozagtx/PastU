// Memory tag format: `[kind k=v k=v] free text`. The tag is machine-owned; text after it is stored verbatim.
export type TagKind = "reason" | "urge" | "shown" | "decision" | "outcome" | "habit";
export const TAG_KINDS: TagKind[] = ["reason", "urge", "shown", "decision", "outcome", "habit"];

export interface ParsedTag { kind: TagKind; attrs: Record<string, string>; text: string }

const TAG_RE = /^\[(reason|urge|shown|decision|outcome|habit)((?:[ \t]+[a-z_]+=[^\s\]]*)*)\][ \t]?([\s\S]*)$/;
const ATTR_RE = /([a-z_]+)=([^\s\]]*)/g;
const SAFE_VALUE = /^[A-Za-z0-9_.,:-]*$/;

export function formatTag(kind: TagKind, attrs: Record<string, string | number>, text?: string): string {
  const parts = Object.entries(attrs).map(([k, v]) => {
    const s = String(v);
    if (!/^[a-z_]+$/.test(k) || !SAFE_VALUE.test(s)) throw new Error(`unsafe tag attr ${k}=${s}`);
    return `${k}=${s}`;
  });
  return `[${[kind, ...parts].join(" ")}]${text ? " " + text : ""}`;
}

export function parseTag(raw: string): ParsedTag | null {
  const m = TAG_RE.exec(raw);
  if (!m) return null;
  const attrs: Record<string, string> = {};
  for (const a of m[2].matchAll(ATTR_RE)) attrs[a[1]] = a[2];
  return { kind: m[1] as TagKind, attrs, text: m[3] ?? "" };
}
