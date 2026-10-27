import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Test isolation: har suite ka apna data dir + deterministic secrets.
 * Yeh module sabse pehle import hona chahiye (static import order matter karta hai),
 * kyunki app modules env ko load ke waqt padhte hain.
 */
export function isolate(prefix: string, extra: Record<string, string> = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `noor-${prefix}-`));
  process.env.DATA_DIR = dir;
  process.env.ADMIN_API_TOKEN ??= "test_admin_token";
  for (const [key, value] of Object.entries(extra)) process.env[key] = value;
  return dir;
}
