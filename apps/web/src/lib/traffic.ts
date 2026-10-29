import "server-only";

import crypto from "node:crypto";
import fs from "@/lib/fs-runtime";
import { dataFile } from "./data-dir";
import { dbEnabled, query } from "./db";

/**
 * Apna traffic counter (first-party).
 *
 * Kyun: Vercel Web Analytics dashboard me "Enable" karna padta hai aur uske bina
 * `/_vercel/insights/script.js` 404 deta hai — owner ko tab tak koi data nahi
 * dikhta. Ye counter us par depend nahi karta: har page view ek chhoti POST
 * `/api/track` par jaati hai aur Postgres me ek row (+1) ban jaati hai.
 *
 * Data ka shape: ek row = ek din + ek page + ek source, `views` badhta jaata hai.
 * Isliye 100 page views bhi ek hi row ka counter hain — table chhoti rehti hai.
 */

export type TrafficDay = { day: string; views: number; visitors: number };
export type TrafficPage = { path: string; views: number };
export type TrafficReferrer = { referrer: string; views: number };

export type TrafficSummary = {
  today: number;
  yesterday: number;
  last7: number;
  visitorsToday: number;
  visitors7: number;
  days: TrafficDay[];
  pages: TrafficPage[];
  referrers: TrafficReferrer[];
  source: "db" | "file";
};

export const EMPTY_TRAFFIC: TrafficSummary = {
  today: 0,
  yesterday: 0,
  last7: 0,
  visitorsToday: 0,
  visitors7: 0,
  days: [],
  pages: [],
  referrers: [],
  source: "file",
};

/** visitor id — IP + user-agent ka short hash (koi personal data store nahi hota) */
export function visitorHash(ip: string, userAgent: string, day: string): string {
  return crypto
    .createHash("sha256")
    .update(`${day}|${ip}|${userAgent}`)
    .digest("hex")
    .slice(0, 20);
}

type FileStore = Record<string, { views: number; referrer: string }>;

function fileStore(): FileStore {
  const file = dataFile("traffic.json");
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as FileStore;
  } catch {
    return {};
  }
}

/**
 * Ek page view likho. Fail ho to `false` — caller (API) ko farq nahi padta,
 * tracking kabhi customer ke page ko slow/error nahi kar sakti.
 */
export async function recordPageView(input: {
  path: string;
  referrer: string;
  visitor: string;
  day: string;
}): Promise<boolean> {
  const { path, referrer, visitor, day } = input;
  if (dbEnabled()) {
    try {
      await query(
        `insert into traffic_daily (day, path, referrer, views) values ($1::date, $2, $3, 1)
         on conflict (day, path, referrer) do update set views = traffic_daily.views + 1`,
        [day, path, referrer],
      );
      await query(
        `insert into traffic_visitors (day, visitor, first_path) values ($1::date, $2, $3)
         on conflict (day, visitor) do nothing`,
        [day, visitor, path],
      );
      return true;
    } catch (error) {
      console.warn("[traffic] db write failed", (error as Error).message);
      return false;
    }
  }

  // local dev / preview — file me (DB ke bina bhi owner ko data dikhe)
  try {
    const store = fileStore();
    const key = `${day}|${path}|${referrer}`;
    store[key] = { views: (store[key]?.views ?? 0) + 1, referrer };
    const file = dataFile("traffic.json");
    fs.writeFileSync(file, JSON.stringify(store, null, 2));
    return true;
  } catch {
    return false;
  }
}

/** Admin "Traffic" page ka data — aaj, kal, 7 din, top pages, top sources. */
export async function getTrafficSummary(): Promise<TrafficSummary> {
  if (dbEnabled()) {
    try {
      const days = await query<{ day: string; views: string; visitors: string }>(
        `select to_char(d.day, 'YYYY-MM-DD') as day,
                coalesce(v.views, 0)::text as views,
                coalesce(u.visitors, 0)::text as visitors
           from (select generate_series(current_date - interval '6 days', current_date, interval '1 day')::date as day) d
           left join (select day, sum(views)::int as views from traffic_daily group by day) v on v.day = d.day
           left join (select day, count(*)::int as visitors from traffic_visitors group by day) u on u.day = d.day
          order by d.day`,
      );
      const pages = await query<{ path: string; views: string }>(
        `select path, sum(views)::text as views from traffic_daily
          where day >= current_date - interval '6 days'
          group by path order by sum(views) desc limit 12`,
      );
      const referrers = await query<{ referrer: string; views: string }>(
        `select referrer, sum(views)::text as views from traffic_daily
          where day >= current_date - interval '6 days'
          group by referrer order by sum(views) desc limit 8`,
      );
      const list = days.map((row) => ({
        day: row.day,
        views: Number(row.views ?? 0),
        visitors: Number(row.visitors ?? 0),
      }));
      const last = list[list.length - 1];
      const prev = list[list.length - 2];
      return {
        today: last?.views ?? 0,
        yesterday: prev?.views ?? 0,
        last7: list.reduce((sum, row) => sum + row.views, 0),
        visitorsToday: last?.visitors ?? 0,
        visitors7: list.reduce((sum, row) => sum + row.visitors, 0),
        days: list,
        pages: pages.map((row) => ({ path: row.path, views: Number(row.views ?? 0) })),
        referrers: referrers.map((row) => ({ referrer: row.referrer, views: Number(row.views ?? 0) })),
        source: "db",
      };
    } catch (error) {
      console.warn("[traffic] db read failed", (error as Error).message);
    }
  }

  // file fallback (local)
  const store = fileStore();
  const byDay = new Map<string, number>();
  const byPage = new Map<string, number>();
  const byRef = new Map<string, number>();
  for (const [key, value] of Object.entries(store)) {
    const [day = "", path = ""] = key.split("|");
    byDay.set(day, (byDay.get(day) ?? 0) + value.views);
    byPage.set(path, (byPage.get(path) ?? 0) + value.views);
    byRef.set(value.referrer ?? "direct", (byRef.get(value.referrer ?? "direct") ?? 0) + value.views);
  }
  const days = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([day, views]) => ({ day, views, visitors: 0 }));
  return {
    today: days[days.length - 1]?.views ?? 0,
    yesterday: days[days.length - 2]?.views ?? 0,
    last7: days.reduce((sum, row) => sum + row.views, 0),
    visitorsToday: 0,
    visitors7: 0,
    days,
    pages: [...byPage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([path, views]) => ({ path, views })),
    referrers: [...byRef.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([referrer, views]) => ({ referrer, views })),
    source: "file",
  };
}
