import fs from "node:fs";
import path from "node:path";
import type { Catalog } from "@noor/types";

/**
 * Phase 1 store: catalog JSON (build artifact) + orders/messages JSON file.
 * Phase 2 me yahi interface Prisma repository se implement hoga — service layer nahi badlega.
 */
export function repoRoot(): string {
  let dir = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    if (fs.existsSync(path.join(dir, "turbo.json")) || fs.existsSync(path.join(dir, ".git"))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

export function dataDir(): string {
  const dir = process.env.DATA_DIR || path.join(repoRoot(), ".data");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function dataFile(name: string): string {
  return path.join(dataDir(), name);
}

let cached: Catalog | null = null;

export function catalog(): Catalog {
  if (cached) return cached;
  const file = path.join(repoRoot(), "database", "seeds", "catalog.json");
  cached = JSON.parse(fs.readFileSync(file, "utf8")) as Catalog;
  return cached;
}

export function readRows<T>(name: string): T[] {
  const file = dataFile(name);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T[];
  } catch {
    return [];
  }
}

export function writeRows<T>(name: string, rows: T[]) {
  const file = dataFile(name);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
  fs.renameSync(tmp, file);
}
