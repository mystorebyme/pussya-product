import { after } from "next/server";

/**
 * Response bhejne ke **baad** chalne wala kaam (Google Sheet mirror, email, audit…).
 *
 * Kyun zaroori: pehle contact form `void mirrorMessageToSheet(...)` likhta tha.
 * Vercel par response jaate hi function "freeze" ho sakta hai — isliye message DB me
 * save ho jaata tha par sheet me row kabhi nahi pahunchti thi (owner ko "message
 * sheet me nahi aaya" dikhta tha).
 *
 * `after()` Next.js ka official tarika hai: response chala jaata hai, par platform
 * us task ke khatam hone tak function zinda rakhta hai.
 *
 * `after()` sirf request scope me chalta hai (unit test / CLI me throw karta hai),
 * isliye try/catch ke saath fire-and-forget fallback bhi hai.
 */
export function runInBackground(task: () => void | Promise<unknown>): void {
  if (typeof after === "function") {
    try {
      after(task);
      return;
    } catch {
      // request scope nahi (test / script) — neeche fire-and-forget
    }
  }
  void Promise.resolve()
    .then(task)
    .catch((error) => console.warn("[background] task failed", (error as Error).message));
}
