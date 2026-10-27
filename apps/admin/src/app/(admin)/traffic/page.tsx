import Link from "next/link";
import { getTraffic } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Traffic — owner ke "pure traffic ka pata chale" ka jawab.
 *
 * Data hamare apne counter se aata hai (website ke `/api/track` par har page view),
 * isliye kisi dashboard toggle par depend nahi karta. Google Search Console +
 * Vercel Analytics saath me chalte hain — teeno milke poora picture dete hain.
 */
const SOURCE_LABEL: Record<string, string> = {
  direct: "Direct (link type kiya / bookmark)",
  google: "Google search",
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  bing: "Bing",
  pinterest: "Pinterest",
  youtube: "YouTube",
  internal: "Site ke andar",
  other: "Doosri site",
};

export default async function TrafficPage() {
  const traffic = await getTraffic();
  const max = Math.max(1, ...traffic.days.map((day) => day.views));
  const change =
    traffic.yesterday > 0
      ? Math.round(((traffic.today - traffic.yesterday) / traffic.yesterday) * 100)
      : null;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Traffic</h1>
          <p>Kitne log aaye, kaunse page dekhe, kahan se aaye — pichhle 7 din</p>
        </div>
        <div className="actions">
          <Link className="btn" href="/reports">
            Sales reports
          </Link>
        </div>
      </div>

      {traffic.last7 === 0 ? (
        <div className="notice" data-testid="traffic-empty">
          <strong>Abhi data nahi aaya.</strong> Counter live hone ke baad har page view yahan
          dikhega. Naya code deploy hone ke baad pehla visitor aane par numbers aa jaayenge.
        </div>
      ) : null}

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="card">
          <p className="muted">Aaj ke views</p>
          <p className="stat">{traffic.today}</p>
          {change !== null ? (
            <p className="muted" style={{ fontSize: 12 }}>
              kal se {change > 0 ? `+${change}%` : `${change}%`}
            </p>
          ) : null}
        </div>
        <div className="card">
          <p className="muted">Aaj ke visitors</p>
          <p className="stat">{traffic.visitorsToday}</p>
        </div>
        <div className="card">
          <p className="muted">7 din ke views</p>
          <p className="stat">{traffic.last7}</p>
        </div>
        <div className="card">
          <p className="muted">7 din ke visitors</p>
          <p className="stat">{traffic.visitors7}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>Roz ka traffic</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {traffic.days.map((day) => (
            <div key={day.day} style={{ display: "grid", gridTemplateColumns: "110px 1fr 90px", gap: 12, alignItems: "center" }}>
              <span className="mono" style={{ fontSize: 12 }}>
                {day.day}
              </span>
              <span
                style={{
                  height: 10,
                  borderRadius: 999,
                  background: "#eee6de",
                  overflow: "hidden",
                  display: "block",
                }}
              >
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${Math.round((day.views / max) * 100)}%`,
                    background: "#862222",
                  }}
                />
              </span>
              <span style={{ fontSize: 12, textAlign: "right" }}>
                {day.views} views · {day.visitors} log
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Sabse zyada dekhe gaye page</h2>
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th style={{ textAlign: "right" }}>Views</th>
              </tr>
            </thead>
            <tbody>
              {traffic.pages.length === 0 ? (
                <tr>
                  <td colSpan={2} className="muted">
                    Abhi kuch nahi
                  </td>
                </tr>
              ) : (
                traffic.pages.map((page) => (
                  <tr key={page.path}>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {page.path}
                    </td>
                    <td style={{ textAlign: "right" }}>{page.views}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Traffic kahan se aaya</h2>
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th style={{ textAlign: "right" }}>Views</th>
              </tr>
            </thead>
            <tbody>
              {traffic.referrers.length === 0 ? (
                <tr>
                  <td colSpan={2} className="muted">
                    Abhi kuch nahi
                  </td>
                </tr>
              ) : (
                traffic.referrers.map((row) => (
                  <tr key={row.referrer}>
                    <td>{SOURCE_LABEL[row.referrer] ?? row.referrer}</td>
                    <td style={{ textAlign: "right" }}>{row.views}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
