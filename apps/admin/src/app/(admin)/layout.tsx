import type { ReactNode } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { logoutAction } from "@/app/actions";
import { secretIsDefault } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { getOrders } from "@/lib/data";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const orders = await getOrders();
  const pending = orders.filter((order) => order.status === "placed").length;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          {/* wahi mark jo storefront header me hai */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand-mark.png" alt="Noor Ethnic Wear" className="brand-mark" width={34} height={34} />
          DESIGNER
          <small>CLOTHING · ADMIN</small>
        </div>
        <AdminNav pendingOrders={pending} />
        <div className="foot">
          <p style={{ margin: "0 0 8px" }}>{session.email}</p>
          <form action={logoutAction}>
            <button className="btn btn-sm" type="submit" style={{ width: "100%", justifyContent: "center" }}>
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="content">
        {secretIsDefault() && process.env.NODE_ENV === "production" ? (
          <div className="notice" data-testid="session-secret-warning">
            <strong>Session secret set nahi hai.</strong> Production me <span className="mono">ADMIN_SESSION_SECRET</span>{" "}
            (ya <span className="mono">ADMIN_API_TOKEN</span>) set kariye — warna har deploy par admin ko dobara
            login karna padega.
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
