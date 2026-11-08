/**
 * Original line-art illustrations for Past You.
 * Style: black outlines, flat gold, soft warm-gray shapes behind. Drawn for this project.
 */
const INK = "var(--ink)";
const GOLD = "#F2C55C";
const GOLD_DEEP = "#D9A13A";
const SOFT = "var(--paper-2)";
const PAPER = "var(--card)";
const line = { stroke: INK, strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** A stack of coins seen from the side, `n` coins high, bottom-centered at (cx, bottom). */
function Coins({ cx, bottom, n, rx = 30, ry = 9, h = 9 }: { cx: number; bottom: number; n: number; rx?: number; ry?: number; h?: number }) {
  const coins = Array.from({ length: n }, (_, i) => bottom - ry - i * h);
  return (
    <g>
      {coins.map((cy, i) => (
        <g key={i}>
          <path d={`M${cx - rx} ${cy} v${h} a${rx} ${ry} 0 0 0 ${rx * 2} 0 v${-h}`} fill={GOLD_DEEP} {...line} />
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={GOLD} {...line} />
          {i === n - 1 && <ellipse cx={cx} cy={cy} rx={rx * 0.62} ry={ry * 0.55} fill="none" {...line} strokeWidth={2} />}
        </g>
      ))}
    </g>
  );
}

function Padlock({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-14 0 v-12 a14 14 0 0 1 28 0 v12" fill="none" {...line} strokeWidth={4} />
      <rect x={-22} y={0} width={44} height={36} rx={8} fill={GOLD} {...line} />
      <circle cx={0} cy={14} r={4.5} fill={INK} />
      <path d="M0 16 v9" {...line} strokeWidth={4} />
    </g>
  );
}

function QuoteBubble({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <path d={`M${x + 18} ${y} h${w - 36} a18 18 0 0 1 18 18 v${h - 36} a18 18 0 0 1 -18 18 h${-(w - 70)} l-18 18 v-18 h-16 a18 18 0 0 1 -18 -18 v${-(h - 36)} a18 18 0 0 1 18 -18 z`} fill={PAPER} {...line} />
      {/* opening quote mark */}
      <path d={`M${x + 22} ${y + 34} q0 -12 10 -14 M${x + 36} ${y + 34} q0 -12 10 -14`} fill="none" {...line} strokeWidth={4} />
      <path d={`M${x + 22} ${y + 50} h${w - 50}`} {...line} stroke={INK} strokeOpacity={0.85} />
      <path d={`M${x + 22} ${y + 66} h${w - 80}`} {...line} strokeOpacity={0.85} />
    </g>
  );
}

function Hourglass({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-26 0 h52 M-26 92 h52" {...line} strokeWidth={5} />
      <path d="M-20 4 c0 26 34 26 34 42 c0 16 -34 16 -34 42 M20 4 c0 26 -34 26 -34 42 c0 16 34 16 34 42" fill="none" {...line} />
      <path d="M-11 22 h22 c-4 10 -11 14 -11 18 c0 -4 -7 -8 -11 -18 z" fill={GOLD} stroke="none" />
      <path d="M-13 84 c4 -12 9 -16 13 -16 c4 0 9 4 13 16 z" fill={GOLD} {...line} strokeWidth={2} />
      <path d="M0 48 v16" {...line} stroke={GOLD_DEEP} strokeWidth={2.5} strokeDasharray="2 4" />
    </g>
  );
}

function Sparkle({ x, y, r = 7 }: { x: number; y: number; r?: number }) {
  return <path d={`M${x} ${y - r} v${r * 2} M${x - r} ${y} h${r * 2}`} {...line} strokeWidth={2.5} />;
}

/** Step 1: a wallet. */
export function WalletIllustration() {
  return (
    <svg viewBox="0 0 200 140" role="img" aria-label="A wallet" className="illo">
      <circle cx={100} cy={72} r={58} fill={SOFT} />
      <rect x={52} y={36} width={84} height={52} rx={8} fill={PAPER} {...line} transform="rotate(-8 94 62)" />
      <rect x={42} y={52} width={116} height={70} rx={14} fill={GOLD} {...line} />
      <path d="M118 74 h40 v28 h-40 a14 14 0 0 1 0 -28 z" fill={GOLD_DEEP} {...line} />
      <circle cx={122} cy={88} r={4.5} fill={INK} />
      <Sparkle x={168} y={40} r={6} />
    </svg>
  );
}

/** Step 2: free test coins from a tap. */
export function FaucetIllustration() {
  return (
    <svg viewBox="0 0 200 140" role="img" aria-label="Coins falling from a tap" className="illo">
      <circle cx={100} cy={72} r={58} fill={SOFT} />
      <path d="M30 40 h70 c14 0 22 8 22 22 v10 h-22 v-6 c0 -4 -2 -6 -6 -6 h-64 z" fill={PAPER} {...line} />
      <rect x={52} y={22} width={22} height={12} rx={4} fill={GOLD} {...line} />
      <path d="M63 34 v6" {...line} />
      <ellipse cx={111} cy={90} rx={11} ry={4} fill={GOLD} {...line} transform="rotate(-20 111 90)" />
      <ellipse cx={104} cy={106} rx={11} ry={4} fill={GOLD} {...line} transform="rotate(15 104 106)" />
      <Coins cx={120} bottom={130} n={2} rx={22} ry={6} h={7} />
      <Sparkle x={150} y={60} r={6} />
    </svg>
  );
}

/** Step 3: lock it and write why. */
export function NoteLockIllustration() {
  return (
    <svg viewBox="0 0 200 140" role="img" aria-label="A note and a padlock" className="illo">
      <circle cx={100} cy={72} r={58} fill={SOFT} />
      <rect x={40} y={22} width={84} height={104} rx={8} fill={PAPER} {...line} transform="rotate(-6 82 74)" />
      <path d="M54 50 h48 M56 66 h52 M58 82 h36" {...line} transform="rotate(-6 82 74)" />
      <path d="M96 112 l52 -60 l10 9 l-52 60 l-14 5 z" fill={GOLD} {...line} />
      <path d="M148 52 l10 9" {...line} />
      <Padlock x={150} y={98} s={0.7} />
    </svg>
  );
}

/** Step 4: the wait, and your own words. */
export function WaitWordsIllustration() {
  return (
    <svg viewBox="0 0 200 140" role="img" aria-label="An hourglass and a quote" className="illo">
      <circle cx={100} cy={72} r={58} fill={SOFT} />
      <QuoteBubble x={78} y={16} w={104} h={66} />
      <Hourglass x={58} y={40} s={0.85} />
    </svg>
  );
}

/** A smiling person holding a coin: someone who kept their promise. */
export function SmileIllustration() {
  return (
    <svg viewBox="0 0 200 160" role="img" aria-label="A smiling person holding a coin" className="illo">
      <circle cx={100} cy={84} r={62} fill={SOFT} />
      {/* shoulders */}
      <path d="M48 156 c4 -30 24 -44 52 -44 c28 0 48 14 52 44" fill={PAPER} {...line} />
      {/* neck */}
      <path d="M90 104 v10 c4 4 16 4 20 0 v-10" fill={PAPER} {...line} />
      {/* head */}
      <circle cx={100} cy={70} r={34} fill={PAPER} {...line} />
      {/* hair */}
      <path d="M67 66 c-2 -26 18 -38 38 -36 c18 2 30 14 30 32 c-10 -8 -22 -12 -36 -10 c-12 2 -22 6 -32 14 z" fill={INK} {...line} />
      {/* eyes: happy arcs */}
      <path d="M85 74 q5 -6 10 0 M105 74 q5 -6 10 0" fill="none" {...line} strokeWidth={2.5} />
      {/* smile */}
      <path d="M88 86 q12 12 24 0" fill="none" {...line} strokeWidth={3} />
      {/* cheeks */}
      <circle cx={80} cy={84} r={4} fill={GOLD} />
      <circle cx={120} cy={84} r={4} fill={GOLD} />
      {/* coin held up */}
      <ellipse cx={158} cy={110} rx={18} ry={18} fill={GOLD} {...line} />
      <ellipse cx={158} cy={110} rx={10} ry={10} fill="none" {...line} strokeWidth={2} />
      <path d="M140 128 c4 -6 8 -8 12 -8" fill="none" {...line} />
      <Sparkle x={36} y={40} r={6} />
      <Sparkle x={176} y={70} r={5} />
    </svg>
  );
}
