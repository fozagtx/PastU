import { MemWal } from "@mysten-incubation/memwal";
import { randomUUID } from "node:crypto";
import { env } from "./env";
import { TAG_KINDS } from "./tags";

export interface StoredMemory { id: string; blobId?: string; text: string; createdAt: string }
export interface WriteResult { id: string; blobId?: string }

/** The only thing the app knows about Walrus Memory. One namespace per promise. */
export interface MemoryStore {
  /** wait=true => rememberAndWait (blob id returned); false => fire-and-forget remember. */
  write(namespace: string, text: string, opts: { wait: boolean }): Promise<WriteResult>;
  /** Every memory in the namespace, oldest first. Callers filter by tag themselves. */
  readAll(namespace: string): Promise<StoredMemory[]>;
}

// ---------------- Fake (offline/tests) ----------------
export class FakeMemoryStore implements MemoryStore {
  private data = new Map<string, StoredMemory[]>();
  private seq = 0;
  /** Test hook: pin the clock. */
  now: () => Date = () => new Date();
  async write(ns: string, text: string, opts: { wait: boolean }): Promise<WriteResult> {
    const n = ++this.seq;
    const m: StoredMemory = {
      id: `fake-mem-${n}`,
      blobId: opts.wait ? `fakeblob${String(n).padStart(6, "0")}${randomUUID().slice(0, 8)}` : undefined,
      text, createdAt: this.now().toISOString(),
    };
    // Async writes in the real SDK still end up with a blob id; expose one for the memories listing.
    if (!m.blobId) m.blobId = `fakeblob${String(n).padStart(6, "0")}`;
    const list = this.data.get(ns) ?? [];
    list.push(m);
    this.data.set(ns, list);
    return { id: m.id, blobId: opts.wait ? m.blobId : undefined };
  }
  async readAll(ns: string): Promise<StoredMemory[]> {
    return [...(this.data.get(ns) ?? [])];
  }
  clear() { this.data.clear(); }
}

// ---------------- Real (Walrus Memory via @mysten-incubation/memwal) ----------------
export interface MemwalLike {
  rememberAndWait(text: string, ns?: string): Promise<{ id: string; blob_id: string }>;
  remember(text: string, ns?: string): Promise<{ job_id: string; status: string }>;
  recall(params: { query: string; limit?: number; namespace?: string; sort?: "recent" | "relevance" }): Promise<{ results: { blob_id: string; text: string; created_at?: string }[] }>;
  restore(namespace: string, limit?: number): Promise<unknown>;
}

export class MemwalStore implements MemoryStore {
  constructor(private client: MemwalLike) {}

  static fromKey(privateKeyHex: string, accountId: string): MemwalStore {
    const client = MemWal.create({ key: privateKeyHex, accountId, serverUrl: env.relayerUrl });
    return new MemwalStore(client as unknown as MemwalLike);
  }

  async write(ns: string, text: string, opts: { wait: boolean }): Promise<WriteResult> {
    if (opts.wait) {
      const r = await this.client.rememberAndWait(text, ns);
      return { id: r.id, blobId: r.blob_id };
    }
    const r = await this.client.remember(text, ns); // never `analyze`: we store exact words
    return { id: r.job_id };
  }

  private async recallAll(ns: string): Promise<StoredMemory[]> {
    const seen = new Map<string, StoredMemory>();
    // The SDK has no tag filter: query by each tag prefix (limit 100) and filter exactly in code.
    for (const kind of TAG_KINDS) {
      const r = await this.client.recall({ query: `[${kind}`, limit: 100, namespace: ns, sort: "recent" });
      for (const h of r.results) {
        if (!h.text.startsWith(`[${kind}`)) continue;
        if (!seen.has(h.blob_id)) seen.set(h.blob_id, { id: h.blob_id, blobId: h.blob_id, text: h.text, createdAt: h.created_at ?? new Date(0).toISOString() });
      }
    }
    return [...seen.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async readAll(ns: string): Promise<StoredMemory[]> {
    try {
      return await this.recallAll(ns);
    } catch (e) {
      // Missing local index (fresh server / new relayer): rebuild from Walrus then retry once.
      await this.client.restore(ns, 1000);
      return await this.recallAll(ns);
    }
  }
}

// ---------------- Resolution ----------------
const g = globalThis as unknown as { __pastyouFakeMemory?: FakeMemoryStore };

export function fakeStore(): FakeMemoryStore {
  return (g.__pastyouFakeMemory ??= new FakeMemoryStore());
}

export function isFakeMemory(): boolean {
  return env.memoryMode === "fake";
}


export function walrusBlobUrl(blobId?: string): string | undefined {
  return blobId && !blobId.startsWith("fakeblob") ? `${env.walrusAggregator}/v1/blobs/${blobId}` : undefined;
}
