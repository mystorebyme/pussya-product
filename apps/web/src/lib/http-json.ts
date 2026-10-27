/**
 * Safe JSON reader.
 *
 * Hosting/proxy kabhi HTML error page (`<html>…`) ya khaali body bhej deta hai; us par
 * `response.json()` crash karta hai (`Unexpected token '<'`). Har fetch isi se parse hota hai
 * taaki customer ko friendly message mile, white screen ya console error nahi.
 */
export type JsonResult<T> = { data: T | null; error: string | null };

function statusMessage(status: number): string {
  if (status === 401 || status === 403) return "Session expire ho gaya — page refresh karke dobara try kariye.";
  if (status === 404) return "Service nahi mili — thodi der baad try kariye.";
  if (status === 429) return "Bohot zyada requests — ek minute baad try kariye.";
  if (status >= 500) return "Server par problem hai — thodi der baad try kariye ya WhatsApp par order kar dijiye.";
  return "Request poori nahi hui — dobara try kariye.";
}

export async function readJson<T>(response: Response): Promise<JsonResult<T>> {
  let text = "";
  try {
    text = await response.text();
  } catch {
    return { data: null, error: "Server se reply nahi aaya. Internet check karke dobara try kariye." };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { data: null, error: response.ok ? null : statusMessage(response.status) };
  }
  if (trimmed.startsWith("<")) {
    return {
      data: null,
      error: response.ok
        ? "Server ne galat reply bheja — page refresh kariye ya WhatsApp par order kar dijiye."
        : statusMessage(response.status),
    };
  }

  try {
    return { data: JSON.parse(trimmed) as T, error: null };
  } catch {
    return { data: null, error: "Server ka reply samajh nahi aaya — dobara try kariye." };
  }
}

/** POST helper: network fail + HTML page + timeout, sab par saaf message. */
export async function postJson<T>(
  url: string,
  body: unknown,
  init?: { timeoutMs?: number; headers?: Record<string, string> },
): Promise<JsonResult<T> & { status: number }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(init?.timeoutMs ?? 30_000),
    });
    const result = await readJson<T>(response);
    return { ...result, status: response.status };
  } catch (error) {
    const name = (error as Error)?.name;
    return {
      data: null,
      status: 0,
      error:
        name === "TimeoutError" || name === "AbortError"
          ? "Server se reply nahi aaya (timeout). WhatsApp par order bhej dijiye — hum turant confirm karenge."
          : "Network error — internet check kariye ya WhatsApp par order bhej dijiye.",
    };
  }
}
