import type { MemoryStore } from "./memory";
let override: MemoryStore | null = null;
/** Tests can inject a store. */
export function setMemoryStoreOverride(s: MemoryStore | null) { override = s; }
export function memoryOverride() { return override; }
