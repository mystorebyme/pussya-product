import Link from "next/link";
import { getMessages } from "@/lib/data";
import { markMessageHandledAction, setMessageReplyAction } from "@/app/actions";
import { dateTime } from "@/lib/format";
import { PhoneLinks } from "@/components/contact-links";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

/**
 * Website ke "Send us a message" form se aaye messages.
 * Storefront API (Postgres) se aate hain — koi message kho nahi jaata.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const messages = await getMessages(100);
  const open = messages.filter((message) => !message.handled);
  const replied = messages.filter((message) => message.replied);

  /**
   * "New" default view — owner ko sabse pehle wahi dikhna chahiye jo abhi tak
   * dekha nahi gaya. Pehle sab messages ek hi list me the, isliye naya message
   * purane 50 ke neeche chhup jaata tha.
   */
  const view = filter === "all" || filter === "replied" ? filter : open.length > 0 ? "new" : "all";
  const shown = view === "new" ? open : view === "replied" ? replied : messages;
  const TABS = [
    { key: "new", label: "New", count: open.length },
    { key: "replied", label: "Replied", count: replied.length },
    { key: "all", label: "All", count: messages.length },
  ] as const;

  return (
    <>
      {/* naya message aaye to list khud update ho jaye */}
      <AutoRefresh seconds={15} />
      <div className="topbar">
        <div>
          <h1>Messages</h1>
          <p>
            Website ke contact form se — {messages.length} total, <strong>{open.length} new</strong>,{" "}
            {replied.length} replied
          </p>
        </div>
      </div>

      <nav className="tabs" data-testid="message-tabs" style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/messages?filter=${tab.key}`}
            className={`btn btn-sm${view === tab.key ? "" : " btn-ghost"}`}
            data-testid={`message-tab-${tab.key}`}
            style={view === tab.key ? { fontWeight: 600 } : { opacity: 0.75 }}
          >
            {tab.label} <span className="small muted">({tab.count})</span>
          </Link>
        ))}
      </nav>

      <div className="panel">
        <div className="panel-head">
          <h2>{view === "new" ? "New messages" : view === "replied" ? "Replied" : "All messages"}</h2>
          <span className="badge">{open.length} new</span>
        </div>
        <div className="panel-body">
          {shown.length === 0 ? (
            <p className="muted">
              {messages.length === 0
                ? "Abhi koi message nahi aaya. Contact page se bheja gaya message yahan turant dikhta hai."
                : view === "new"
                  ? "Naya message nahi hai — sab dekh liye. Purane dekhne ke liye “All” dabaiye."
                  : "Is list me koi message nahi hai."}
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>From</th>
                  <th>Subject</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((message) => (
                  <tr key={message.id}>
                    <td className="small muted">{dateTime(message.createdAt)}</td>
                    <td className="small">
                      {/* customer ka naam → uski detail (orders + total spend + edit) */}
                      {message.phone ? (
                        <Link
                          href={`/customers?phone=${encodeURIComponent(message.phone)}`}
                          data-testid="message-customer-link"
                        >
                          <strong>{message.name}</strong>
                        </Link>
                      ) : (
                        <strong>{message.name}</strong>
                      )}
                      <br />
                      <a href={`mailto:${message.email}`}>{message.email}</a>
                      {message.phone ? (
                        <>
                          <br />
                          <PhoneLinks phone={message.phone} />
                        </>
                      ) : null}
                    </td>
                    <td className="small">{message.subject ?? "—"}</td>
                    <td className="small" style={{ maxWidth: 420 }}>
                      {/* poori baat padhne ke liye kholiye (list chhoti rehti hai) */}
                      <details data-testid="message-detail">
                        <summary style={{ cursor: "pointer" }}>
                          {message.message.length > 90 ? `${message.message.slice(0, 90)}…` : message.message}
                        </summary>
                        <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{message.message}</div>
                      </details>
                    </td>
                    <td>
                      {message.replied ? (
                        <span className="badge badge-success">Replied</span>
                      ) : message.handled ? (
                        <span className="badge">Handled</span>
                      ) : (
                        <span className="badge badge-warning">New</span>
                      )}
                      {message.repliedAt ? (
                        <div className="small muted">{dateTime(message.repliedAt)}</div>
                      ) : null}
                    </td>
                    <td>
                      <div className="small" style={{ display: "grid", gap: 6 }}>
                        {message.replied ? (
                          <form action={setMessageReplyAction}>
                            <input type="hidden" name="id" value={message.id} />
                            <input type="hidden" name="replied" value="false" />
                            <button className="btn btn-sm" type="submit">
                              Undo replied
                            </button>
                          </form>
                        ) : (
                          <form action={setMessageReplyAction}>
                            <input type="hidden" name="id" value={message.id} />
                            <input type="hidden" name="replied" value="true" />
                            <button className="btn btn-sm" type="submit">
                              Mark replied
                            </button>
                          </form>
                        )}
                        {message.handled ? (
                          <span className="muted">{message.handledBy ?? "—"}</span>
                        ) : (
                          <form action={markMessageHandledAction}>
                            <input type="hidden" name="id" value={message.id} />
                            <button className="btn btn-sm" type="submit">
                              Mark handled
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
