// Shared API contract between backend (src/lib/server, src/app/api) and frontend (src/app pages, src/components).
export type Trigger = "loss" | "payday" | "stress" | "boredom" | "social" | "emergency" | "other";

export interface Reason { id: string; text: string; createdAt: string; blobId?: string; kind: "promise" | "checkin" }
export interface ReasonStat { reasonId: string; shown: number; held: number; regretted: number; similarHold: boolean; score: number }
export interface PastAttempt { number: number; trigger: Trigger; urge: string; result: "held" | "exited" | "pending"; felt?: "regret" | "fine"; finding?: string; at: string; blobId?: string; txDigest?: string }

export interface PromiseDTO {
  id: string; owner: string; currentVaultId: string | null; namespace: string; coinType: string;
  status: "active" | "exiting" | "closed"; attempts: number;
}

export interface PastYouQuote { reasonId: string; text: string; date: string; blobId?: string; template: string; stats: ReasonStat }
export interface PastYouDTO {
  emergency: boolean;                // true => show only the timer, no persuasion
  trigger: Trigger;
  quotes: PastYouQuote[];            // best first, max 3, exact stored text
  history: PastAttempt[];
  orderSource: "llm" | "code";       // fallback transparency
  attemptNumber: number;
}

// Route bodies
export interface AuthBody { address: string; message: string; signature: string }
export interface CreatePromiseBody { vaultId: string; coinType: string; reason: string }
export interface AttemptBody { urge: string }
export interface AttemptResp { attemptId: string; number: number; urgeBlobId: string; trigger: Trigger }
export interface DecisionBody { result: "held" | "exited"; exitTx?: string; withdrawReason?: string; plan?: string }

// Insights: the user's saving reasons next to their withdrawals, plus where the money went.
export interface InsightAttempt {
  number: number; at: string; trigger: Trigger;
  urge: string;                      // what was going on, written when the exit timer started
  withdrawReason?: string;           // why they withdrew, written at the moment of withdrawing
  plan?: string;                     // where they said the money would go
  result: "held" | "exited" | "pending"; felt?: "regret" | "fine";
  wentTo?: string;                   // where the money actually went (Tatum), if they withdrew
  exitTx?: string;
}
export interface InsightsDTO {
  goal: { text: string; date: string }[];
  attempts: InsightAttempt[];
  stats: { attempts: number; held: number; exited: number; regretted: number; byTrigger: { trigger: Trigger; count: number }[] };
  demo?: boolean;
}
export interface ChatMessage { role: "user" | "assistant"; content: string }
export interface InsightsChatBody { messages: ChatMessage[] }
export interface InsightsChatResp { answer: string }
export interface OutcomeBody { felt: "regret" | "fine" }
export const WAIT_DEMO_MS = 60_000, WAIT_DEFAULT_MS = 86_400_000, WAIT_MAX_MS = 7 * 86_400_000;

// ---- Additive backend response shapes ----
export interface AuthResp { address: string; expiresAt: string }
export interface AccountBody { accountId?: string }
export interface AccountResp { delegatePublicKey: string; delegateSuiAddress: string; accountId: string | null }
export interface PromiseDetailDTO extends PromiseDTO { reasons: Reason[] }
export interface CreatePromiseResp { promise: PromiseDTO; reason: Reason }
export interface AddReasonBody { text: string; kind?: "promise" | "checkin" }
export interface MemoryItemDTO {
  blobId?: string; walrusUrl?: string; kind: "reason" | "urge" | "shown" | "decision" | "outcome" | "habit" | "withdraw" | "plan";
  attrs: Record<string, string>; text: string; createdAt: string;
}
export interface VaultInfo { objectId: string; balance: string | null; coinType: string | null; exitAt: string | null; exitRemainingMs: number | null; raw?: unknown }
export interface ChainDTO { vault: VaultInfo | null; balances: { coinType: string; balance: string }[]; source: "tatum" | "mock" | "unavailable"; error?: string }
export interface DecisionResp { ok: true; attemptNumber: number; result: "held" | "exited"; followUpAt: string | null }
export interface OutcomeResp { ok: true; finding: string; blobId?: string }
export interface HabitBody { weeklyAmount?: number; weekday?: number; week?: number; digest?: string; note?: string }
