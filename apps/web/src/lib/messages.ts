import "server-only";

import fs from "@/lib/fs-runtime";
import { randomUUID } from "node:crypto";
import { dataFile } from "@/lib/data-dir";
import { dbEnabled } from "@/lib/db";
import { appendSheetRows } from "@/lib/google-sheets";
import { messageSheetRow, subscriberSheetRow } from "@/lib/sheet-format";

/**
 * Contact form ("Send us a message") ka store.
 *
 * Pehle messages sirf storefront container ki local file me jaate the — Render/
 * Vercel par redeploy ke saath gayab, aur admin panel (alag service) ko dikhte hi
 * nahi the. Ab:
 *   • Postgres (`DATABASE_URL`) me `contact_messages` table,
 *   • warna local JSON (dev / test).
 * Admin panel `/api/admin/messages` se padhta hai, isliye dono jagah same data.
 */

export interface ContactMessage {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  handled: boolean;
  handledAt?: string | null;
  handledBy?: string | null;
  /** admin ne customer ko jawab/WhatsApp reply bhej diya */
  replied: boolean;
  repliedAt?: string | null;
  repliedBy?: string | null;
}

export interface Subscriber {
  id: string;
  createdAt: string;
  email: string;
}

type Row = {
  id: string;
  created_at: Date | string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  handled: boolean;
  handled_at: Date | string | null;
  handled_by: string | null;
  is_replied: boolean;
  replied_at: Date | string | null;
  replied_by: string | null;
};

function iso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function readJson<T>(name: string): T[] {
  const file = dataFile(name);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T[];
  } catch {
    return [];
  }
}

function writeJson<T>(name: string, rows: T[]) {
  const file = dataFile(name);
  fs.mkdirSync(file.replace(/\/[^/]+$/, ""), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
  fs.renameSync(tmp, file);
}

export async function saveMessage(
  input: Omit<ContactMessage, "id" | "createdAt" | "handled" | "replied">,
): Promise<ContactMessage> {
  const message: ContactMessage = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    handled: false,
    replied: false,
    repliedAt: null,
    repliedBy: null,
    ...input,
  };

  if (dbEnabled()) {
    const { query } = await import("@/lib/db");
    await query(
      `insert into contact_messages (id, name, email, phone, subject, message, payload)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [
        message.id,
        message.name,
        message.email,
        message.phone ?? null,
        message.subject ?? null,
        message.message,
        JSON.stringify(message),
      ],
    );
    return message;
  }

  const rows = readJson<ContactMessage>("messages.json");
  rows.unshift(message);
  writeJson("messages.json", rows.slice(0, 2000));
  return message;
}

/** Owner ki sheet me message (best-effort, message save kabhi fail nahi hota) */
export async function mirrorMessageToSheet(message: ContactMessage): Promise<boolean> {
  return appendSheetRows([{ sheet: "Messages", row: messageSheetRow(message) }]);
}

export async function mirrorSubscriberToSheet(email: string): Promise<boolean> {
  return appendSheetRows([{ sheet: "Newsletter", row: subscriberSheetRow(email) }]);
}

export async function listMessages(limit = 100): Promise<ContactMessage[]> {
  if (dbEnabled()) {
    const { query } = await import("@/lib/db");
    const rows = await query<Row>(
      `select id, created_at, name, email, phone, subject, message, is_handled as handled, handled_at, handled_by,
              is_replied, replied_at, replied_by
       from contact_messages order by created_at desc limit $1`,
      [Math.min(500, Math.max(1, limit))],
    );
    return rows.map((row) => ({
      id: row.id,
      createdAt: iso(row.created_at) ?? new Date().toISOString(),
      name: row.name,
      email: row.email,
      phone: row.phone,
      subject: row.subject,
      message: row.message,
      handled: row.handled,
      handledAt: iso(row.handled_at),
      handledBy: row.handled_by,
      replied: row.is_replied,
      repliedAt: iso(row.replied_at),
      repliedBy: row.replied_by,
    }));
  }
  return readJson<ContactMessage>("messages.json").slice(0, limit);
}

function toMessage(row: Row): ContactMessage {
  return {
    id: row.id,
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    handled: row.handled,
    handledAt: iso(row.handled_at),
    handledBy: row.handled_by,
    replied: row.is_replied,
    repliedAt: iso(row.replied_at),
    repliedBy: row.replied_by,
  };
}

/**
 * "Replied" toggle — admin message ka jawab de chuka hai ya nahi.
 * Handled se alag hai: handled = inbox se nipta diya, replied = customer ko
 * jawab chala gaya. Replied karne par handled bhi true ho jaata hai.
 */
export async function setMessageReplied(
  id: string,
  replied: boolean,
  actor: string,
): Promise<ContactMessage | null> {
  if (dbEnabled()) {
    const { query } = await import("@/lib/db");
    const rows = await query<Row>(
      `update contact_messages
         set is_replied = $2,
             replied_at = case when $2 then now() else null end,
             replied_by = case when $2 then $3 else null end,
             is_handled = case when $2 then true else is_handled end,
             handled_at = case when $2 then coalesce(handled_at, now()) else handled_at end,
             handled_by = case when $2 then coalesce(handled_by, $3) else handled_by end
       where id = $1
       returning id, created_at, name, email, phone, subject, message, is_handled as handled, handled_at, handled_by,
                 is_replied, replied_at, replied_by`,
      [id, replied, actor],
    );
    const row = rows[0];
    return row ? toMessage(row) : null;
  }

  const rows = readJson<ContactMessage>("messages.json");
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return null;
  const now = new Date().toISOString();
  rows[index] = {
    ...rows[index]!,
    replied,
    repliedAt: replied ? now : null,
    repliedBy: replied ? actor : null,
    handled: replied ? true : rows[index]!.handled,
    handledAt: replied ? (rows[index]!.handledAt ?? now) : rows[index]!.handledAt,
    handledBy: replied ? (rows[index]!.handledBy ?? actor) : rows[index]!.handledBy,
  };
  writeJson("messages.json", rows);
  return rows[index]!;
}

export async function markMessageHandled(id: string, actor: string): Promise<ContactMessage | null> {
  if (dbEnabled()) {
    const { query } = await import("@/lib/db");
    const rows = await query<Row>(
      `update contact_messages set is_handled = true, handled_at = coalesce(handled_at, now()), handled_by = coalesce(handled_by, $2)
       where id = $1
       returning id, created_at, name, email, phone, subject, message, is_handled as handled, handled_at, handled_by,
                 is_replied, replied_at, replied_by`,
      [id, actor],
    );
    const row = rows[0];
    if (!row) return null;
    return toMessage(row);
  }

  const rows = readJson<ContactMessage>("messages.json");
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return null;
  rows[index] = { ...rows[index]!, handled: true, handledAt: new Date().toISOString(), handledBy: actor };
  writeJson("messages.json", rows);
  return rows[index]!;
}

export async function saveSubscriber(email: string): Promise<{ duplicate: boolean }> {
  if (dbEnabled()) {
    const { query } = await import("@/lib/db");
    const rows = await query<{ id: string }>(
      `insert into newsletter_subscribers (email) values ($1)
       on conflict (email) do nothing returning id`,
      [email],
    );
    return { duplicate: rows.length === 0 };
  }

  const rows = readJson<Subscriber>("newsletter.json");
  if (rows.some((row) => row.email === email)) return { duplicate: true };
  rows.unshift({ id: randomUUID(), createdAt: new Date().toISOString(), email });
  writeJson("newsletter.json", rows.slice(0, 5000));
  return { duplicate: false };
}
