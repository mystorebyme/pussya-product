"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, {} as { error?: string });

  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" placeholder="admin@noorethnicwear.in" />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <label className="small" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
        <input type="checkbox" name="remember" defaultChecked />
        Keep me signed in (30 days)
      </label>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
