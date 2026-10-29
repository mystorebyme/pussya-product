import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Admin login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand-mark.png" alt="Noor Ethnic Wear" width={64} height={64} style={{ display: "block", margin: "0 auto 6px", borderRadius: 999 }} />
          NOOR ETHNIC WEAR
        </div>
        <div className="sub">CLOTHING · ADMIN</div>
        <LoginForm next={next ?? "/"} />
        <p className="small muted" style={{ marginTop: 16, textAlign: "center" }}>
          Authorised staff only. Har login audit log me record hota hai.
        </p>
      </div>
    </div>
  );
}
