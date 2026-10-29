/**
 * Safe JSON reader.
 *
 * Hosting/proxy kabhi HTML error page (`<html>…`) ya khaali body bhej deta hai; us par
 * `response.json()` crash karta hai (`Unexpected token '<'`). Har fetch isi se parse hota hai
 * taaki customer ko friendly message mile, white screen ya console error nahi.
 */
export type JsonResult<T> = { data: T | null; error: string | null };

function statusMessage(status: number): string {
  if (status === 401 || status === 403) return "Your session expired — refresh the page and try again.";
  if (status === 404) return "Service unavailable — please try again in a moment.";
  if (status === 429) return "Too many requests — please try again in a minute.";
  if (status >= 500) return "Something went wrong on our side — try again in a moment or send your order on WhatsApp.";
  return "The request did not complete — please try again.";
}

export async function readJson<T>(response: Response): Promise<JsonResult<T>> {
  let text = "";
  try {
    text = await response.text();
  } catch {
    return { data: null, error: "No reply from the server. Check your connection and try again." };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { data: null, error: response.ok ? null : statusMessage(response.status) };
  }
  if (trimmed.startsWith("<")) {
    return {
      data: null,
      error: response.ok
        ? "The server sent an unexpected reply — refresh the page or send your order on WhatsApp."
        : statusMessage(response.status),
    };
  }

  try {
    return { data: JSON.parse(trimmed) as T, error: null };
  } catch {
    return { data: null, error: "We could not read the server reply — please try again." };
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
          ? "The server did not reply in time. Send your order on WhatsApp — our team confirms quickly."
          : "Network error — check your connection or send your order on WhatsApp.",
    };
  }
}
