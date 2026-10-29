/**
 * Runtime-safe `fs` — Cloudflare Workers par file system **read-only** hai.
 *
 * Kyun: Workers (workerd) me `node:fs` bundle ke read-only view par chalta hai —
 * `mkdirSync`/`writeFileSync` turant `EPERM: operation not permitted` deta hai.
 * Isse `dataDir()` par hi order create, settings, delivery cache sab 500 ho rahe the
 * (R34 me vinext/workerd par reproduce hua).
 *
 * Ye module wahi 5 methods deta hai jo app use karta hai (`existsSync`,
 * `readFileSync`, `writeFileSync`, `renameSync`, `mkdirSync`):
 *   • Node / Vercel / Render par — bilkul asli `node:fs` (zero behaviour change).
 *   • Workers par — likhna memory (per-isolate) me jaata hai, padhna memory se
 *     ya bundle se. Iska matlab: **durable data Postgres me hi jaana chahiye**
 *     (`DATABASE_URL`). Memory fallback sirf preview/dev ke liye hai.
 *
 * `isEphemeralStorage()` true ho to `/api/health` us baat ko report karta hai —
 * production me ye true nahi hona chahiye.
 */
import nodeFs from "node:fs";

/** Workers ka pehchanne ka documented tarika (workerd userAgent). */
export function isCloudflareWorkers(): boolean {
  const ua = (globalThis as { navigator?: { userAgent?: string } }).navigator?.userAgent ?? "";
  return ua === "Cloudflare-Workers";
}

/** Workers par likhna possible nahi — isliye memory me rakhte hain. */
const memory = new Map<string, string>();
let ephemeralWrites = false;

/**
 * Kya storage ephemeral hai (yaani durable nahi)?
 * Workers par FS read-only hai — writes memory me jaate hain, isliye wahan
 * hamesha true (chahe abhi tak koi write hua ho ya na ho).
 */
export function isEphemeralStorage(): boolean {
  return isCloudflareWorkers() || ephemeralWrites;
}

/** Tests ke liye — memory state saaf. */
export function resetEphemeralStorage(): void {
  memory.clear();
  ephemeralWrites = false;
}

function toText(data: unknown): string {
  return typeof data === "string" ? data : String(data);
}

function existsSync(file: string): boolean {
  if (memory.has(file)) return true;
  try {
    return nodeFs.existsSync(file);
  } catch {
    return false;
  }
}

/** `fs.readFileSync(file, "utf8")` → string (jaisa node karta hai) */
function readFileSync(file: string, encoding: BufferEncoding): string;
function readFileSync(file: string): Buffer;
function readFileSync(file: string, encoding?: BufferEncoding): string | Buffer {
  if (memory.has(file)) {
    const value = memory.get(file)!;
    return encoding ? value : Buffer.from(value);
  }
  return encoding ? nodeFs.readFileSync(file, encoding) : nodeFs.readFileSync(file);
}

function writeFileSync(file: string, data: unknown): void {
  try {
    nodeFs.writeFileSync(file, data as string);
  } catch {
    // Workers: read-only FS — memory me rakho (durable nahi)
    memory.set(file, toText(data));
    ephemeralWrites = true;
  }
}

function renameSync(from: string, to: string): void {
  try {
    nodeFs.renameSync(from, to);
  } catch {
    // tmp+rename atomic write ka Workers version
    const value = memory.get(from);
    if (value !== undefined) {
      memory.set(to, value);
      memory.delete(from);
    }
    ephemeralWrites = true;
  }
}

function mkdirSync(dir: string, options?: { recursive?: boolean }): void {
  try {
    nodeFs.mkdirSync(dir, options);
  } catch {
    // Workers: directory banane ki zaroorat hi nahi (memory store)
    ephemeralWrites = true;
  }
}

const fs = { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync };

export default fs;
