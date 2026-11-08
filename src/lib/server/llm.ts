import { z } from "zod";
import type { Trigger } from "../types";
import { env } from "./env";

export const TRIGGERS: Trigger[] = ["loss", "payday", "stress", "boredom", "social", "emergency", "other"];

// Health/safety keywords => emergency regardless of what any model says.
const EMERGENCY_RE = /\b(emergenc\w*|hospital\w*|ambulance|medical|medic\w*|surgery|doctor|dentist|sick|ill(ness)?|injur\w*|hurt|bleeding|safety|unsafe|danger\w*|abus\w*|violen\w*|police|fire|flood|funeral|died|death|dying|suicid\w*|overdose)\b/i;

const KEYWORDS: [Trigger, RegExp][] = [
  ["loss", /\b(los[st]|lose|losing|crash\w*|down|red|dump\w*|rekt|liquidat\w*|recoup|win it back|make it back)\b/i],
  ["payday", /\b(pay\s?day|paid|salary|paycheck|bonus|got money|treat myself|reward)\b/i],
  ["stress", /\b(stress\w*|anxious|anxiety|overwhelm\w*|panic\w*|worried|worry|pressure|deadline|burn(ed|t)?\s?out)\b/i],
  ["boredom", /\b(bor(ed|ing|edom)|nothing to do|restless|idle|scroll\w*)\b/i],
  ["social", /\b(friends?|party|dinner|drinks?|everyone|they|trip|wedding|birthday|gift|fomo|bar|club)\b/i],
];

export function isEmergencyText(text: string): boolean {
  return EMERGENCY_RE.test(text);
}

export function heuristicLabel(urge: string): Trigger {
  if (isEmergencyText(urge)) return "emergency";
  for (const [t, re] of KEYWORDS) if (re.test(urge)) return t;
  return "other";
}

export interface LlmOpts { fetchImpl?: typeof fetch; apiKey?: string; model?: string; baseUrl?: string; timeoutMs?: number }

const labelSchema = z.object({ trigger: z.enum(["loss", "payday", "stress", "boredom", "social", "emergency", "other"]) });
const orderSchema = z.object({ order: z.array(z.string()).min(1).max(10) });

async function chatJson(system: string, user: string, o: LlmOpts): Promise<unknown | null> {
  // Provider order: explicit options (tests), then Nebius, then the Neon AI Gateway. None configured => keyword rules.
  const useNebius = !!(o.apiKey ?? env.nebiusKey) && !!(o.model ?? env.nebiusModel);
  const useNeon = !useNebius && !o.apiKey && !!env.neonAiToken && !!env.neonAiBase;
  const apiKey = useNeon ? env.neonAiToken : (o.apiKey ?? env.nebiusKey);
  const model = useNeon ? env.neonAiModel : (o.model ?? env.nebiusModel);
  if (!apiKey || !model) return null;
  const base = (useNeon ? `${env.neonAiBase}/v1` : (o.baseUrl ?? env.nebiusBase)).replace(/\/?$/, "/");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), o.timeoutMs ?? 8000);
  try {
    const res = await (o.fetchImpl ?? fetch)(base + "chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model, temperature: 0, max_tokens: 120,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Label an urge. Emergency keywords always win. LLM output is never shown to users. */
export async function labelUrge(urge: string, o: LlmOpts = {}): Promise<{ trigger: Trigger; source: "llm" | "code" }> {
  if (isEmergencyText(urge)) return { trigger: "emergency", source: "code" };
  const raw = await chatJson(
    `Classify the user's urge to withdraw savings into exactly one label from: ${TRIGGERS.join(",")}. Reply only with JSON {"trigger":"<label>"}.`,
    urge, o);
  const parsed = labelSchema.safeParse(raw);
  if (parsed.success) return { trigger: parsed.data.trigger, source: "llm" };
  return { trigger: heuristicLabel(urge), source: "code" };
}

/** Ask the model to reorder candidate ids. Returns null on any failure / unknown id (caller keeps code order). */
export async function reorderTop(
  trigger: Trigger,
  candidates: { id: string; text: string; shown: number; held: number }[],
  o: LlmOpts = {},
): Promise<string[] | null> {
  if (candidates.length < 2) return null;
  const raw = await chatJson(
    'Order these saved reasons from most to least likely to help the user keep their savings promise right now, given their urge trigger. Reply only with JSON {"order":["id",...]} containing exactly the given ids.',
    JSON.stringify({ trigger, candidates }), o);
  const parsed = orderSchema.safeParse(raw);
  if (!parsed.success) return null;
  const ids = new Set(candidates.map((c) => c.id));
  const order = parsed.data.order;
  if (order.length !== ids.size || new Set(order).size !== order.length || !order.every((i) => ids.has(i))) return null;
  return order;
}
