import { getAudit } from "@/lib/data";
import { dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const rows = await getAudit(120);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Audit logs</h1>
          <p>Kisne kya badla — admin actions + order lifecycle</p>
        </div>
      </div>

      <div className="panel">
        {rows.length === 0 ? (
          <div className="empty">Abhi koi activity record nahi hui.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Meta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td className="muted small">{dateTime(row.at)}</td>
                  <td>{row.actor}</td>
                  <td>
                    <span className="badge">{row.action}</span>
                  </td>
                  <td className="mono small">{row.target}</td>
                  <td className="small muted">{row.meta ? JSON.stringify(row.meta) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
