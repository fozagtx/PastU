import type { PastYouDTO, PastYouQuote, ReasonStat } from "../types";

// Everything here is MADE UP: a fictional persona used only by /story.
export const PERSONA = {
  name: "Maya",
  note: "Maya is a made-up person. Nothing on this page is real data, and no wallet or backend is involved.",
  promise: "Save 400 SUI for a year of breathing room",
};

const st = (shown: number, held: number, regretted: number, similarHold: boolean, score: number): ReasonStat => ({ reasonId: "", shown, held, regretted, similarHold, score });
const R = {
  rent: { reasonId: "r1", text: "I'm tired of being one bad month away from panic. I want a year where money isn't the loudest thing in my head.", date: "2026-01-12" },
  mum: { reasonId: "r2", text: "Mum covered my rent in 2023. I never want to have to ask her again.", date: "2026-02-02" },
  calm: { reasonId: "r3", text: "Check-in: the week I didn't touch it, I slept better. Remember that.", date: "2026-03-09" },
  trip: { reasonId: "r4", text: "I want to go to Lisbon with real money behind me, not credit.", date: "2026-01-20" },
};
const q = (r: { reasonId: string; text: string; date: string }, template: string, stats: ReasonStat): PastYouQuote =>
  ({ reasonId: r.reasonId, text: r.text, date: r.date, blobId: `demoBlob${r.reasonId}`, template, stats: { ...stats, reasonId: r.reasonId } });

export const DEMO_ATTEMPTS: PastYouDTO[] = [
  {
    emergency: false, trigger: "loss", orderSource: "code", attemptNumber: 1, history: [],
    quotes: [
      q(R.rent, "This is the first thing you wrote when you made the promise.", st(0, 0, 0, false, 0.5)),
      q(R.mum, "You added this one three weeks later.", st(0, 0, 0, false, 0.4)),
      q(R.trip, "And this was the picture you had in mind.", st(0, 0, 0, false, 0.3)),
    ],
  },
  {
    emergency: false, trigger: "stress", orderSource: "llm", attemptNumber: 2,
    history: [{ number: 1, trigger: "loss", urge: "I lost a client today. I just want a cushion in my account.", result: "held", felt: "fine", at: "2026-03-14", finding: "Held. You said later it was the right call." }],
    quotes: [
      q(R.calm, "You've felt this before, and you wrote down what helped.", st(0, 0, 0, false, 0.7)),
      q(R.mum, "This one stayed with you last time too.", st(1, 1, 0, false, 0.6)),
      q(R.rent, "You read this once already and kept going.", st(1, 1, 0, false, 0.5)),
    ],
  },
  {
    emergency: false, trigger: "loss", orderSource: "llm", attemptNumber: 3,
    history: [
      { number: 1, trigger: "loss", urge: "I lost a client today. I just want a cushion in my account.", result: "held", felt: "fine", at: "2026-03-14", finding: "Held. You said later it was the right call." },
      { number: 2, trigger: "stress", urge: "Everything is too much this week.", result: "held", felt: "fine", at: "2026-04-02", finding: "Held. The exit timer ran out and you did not use it." },
    ],
    quotes: [
      q(R.rent, "You've felt this twice. Both times, these words were what you stayed for.", st(2, 2, 0, true, 0.9)),
      q(R.calm, "You wrote this after the last time.", st(1, 1, 0, false, 0.6)),
      q(R.mum, "It's still true.", st(2, 1, 0, false, 0.5)),
    ],
  },
];
