import fs from "@/lib/fs-runtime";
import os from "node:os";
import path from "node:path";

/**
 * Local dev/preview ke liye file-based store — web, admin aur api teeno
 * ek hi `.data/` folder use karte hain, isliye order turant admin me dikhta hai.
 * Production me yeh Prisma/Postgres se replace hota hai (database/README.md).
 */
export function repoRoot(): string {
  let dir = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    if (fs.existsSync(path.join(dir, "turbo.json")) || fs.existsSync(path.join(dir, ".git"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

/** Serverless (Vercel/Netlify) par bundle folder read-only — sirf /tmp likha ja sakta hai. */
const IS_SERVERLESS = Boolean(
  process.env.VERCEL ||
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT,
);

export function dataDir(): string {
  const dir = process.env.DATA_DIR ?? path.join(IS_SERVERLESS ? os.tmpdir() : repoRoot(), ".data");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function dataFile(name: string): string {
  return path.join(dataDir(), name);
}
