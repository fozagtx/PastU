/** Past You mark: an outlined circle (your past self) overlapped by a solid one (you now). */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false">
      <rect width="64" height="64" rx="16" fill="var(--ink)" />
      <circle cx="25" cy="32" r="14" fill="none" stroke="var(--paper)" strokeOpacity=".6" strokeWidth="3.5" />
      <circle cx="39" cy="32" r="14" fill="var(--accent-mark, #e8935f)" />
    </svg>
  );
}
