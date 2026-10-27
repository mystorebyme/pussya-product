"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/http-json";
import { apiUrl } from "@/lib/api-base";
import { useStoreSettings } from "@/components/store-settings-provider";
import { whatsappNumber } from "@/lib/phone";

const FALLBACK_WHATSAPP = "";

/**
 * Server fail ho to bhi customer atke nahi — poori baat WhatsApp par (owner rule:
 * site par support email kahin nahi dikhta, sirf WhatsApp).
 */
function whatsappFallbackHref(
  form: { name: string; email: string; phone: string; subject: string; message: string },
  supportWhatsapp: string,
) {
  const body = [
    `Subject: ${form.subject}`,
    `Name: ${form.name}`,
    form.phone ? `Phone: ${form.phone}` : "",
    "",
    form.message,
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${whatsappNumber(supportWhatsapp)}?text=${encodeURIComponent(body)}`;
}

export function ContactForm() {
  const router = useRouter();
  const { whatsapp } = useStoreSettings();
  const SUPPORT_WHATSAPP = whatsapp || FALLBACK_WHATSAPP;
  /** Number sirf sheet/owner settings se aata hai — khaali ho to WhatsApp UI dikhta hi nahi. */
  const HAS_WHATSAPP = Boolean(whatsappNumber(SUPPORT_WHATSAPP));
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "Order enquiry", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      // Pages preview par API live store par jaata hai (apiUrl base add karta hai)
      const result = await postJson<{ error?: string; ok?: boolean }>(apiUrl("/api/contact"), form);
      if (result.error || !result.data) {
        setError(result.data?.error ?? result.error ?? "Could not send your message.");
        setStatus("error");
        return;
      }
      setStatus("done");
      setForm({ name: "", email: "", phone: "", subject: "Order enquiry", message: "" });
      // page state turant update ho jaye (owner ask: "send karne ke baad update ho")
      router.refresh();
    } catch {
      setError("Network error, please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="border border-[#d6e8d9] bg-[#f2f8f3] p-6 text-center" data-testid="contact-success">
        <p className="font-display text-[21px] text-[#2f7a3f]">Message received!</p>
        <p className="mt-1 text-[12.5px] text-[#5c534b]">
          Our team will reply within 24 hours.
          {HAS_WHATSAPP ? ` For an instant reply, WhatsApp us on ${SUPPORT_WHATSAPP}.` : ""}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {HAS_WHATSAPP ? (
            <a
              href={`https://wa.me/${whatsappNumber(SUPPORT_WHATSAPP)}?text=${encodeURIComponent("Hi Noor Ethnic Wear, I sent a message from the website.")}`}
              target="_blank"
              rel="noreferrer"
              className="bg-[#25d366] px-4 py-2 text-[11px] font-semibold tracking-[.12em] text-white uppercase"
            >
              WhatsApp us
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="border border-[#c9bfb4] px-4 py-2 text-[11px] font-semibold tracking-[.12em] text-[#5c534b] uppercase"
            data-testid="contact-again"
          >
            Send another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-[#eee6de] bg-[#faf8f5] p-5 sm:p-6">
      <h2 className="font-display text-[21px] font-medium text-[#862222]">Send us a message</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          required
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="Your name *"
          className="h-11 w-full border border-[#ddd2c6] bg-white px-3 text-[13px] outline-none focus:border-[#862222]"
        />
        <input
          required
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          placeholder="Email *"
          className="h-11 w-full border border-[#ddd2c6] bg-white px-3 text-[13px] outline-none focus:border-[#862222]"
        />
        <input
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          placeholder="Phone / WhatsApp"
          className="h-11 w-full border border-[#ddd2c6] bg-white px-3 text-[13px] outline-none focus:border-[#862222]"
        />
        <select
          value={form.subject}
          onChange={(event) => setForm({ ...form, subject: event.target.value })}
          className="h-11 w-full border border-[#ddd2c6] bg-white px-3 text-[13px] outline-none focus:border-[#862222]"
        >
          {["Order enquiry", "Sizing help", "Replacement request", "Bulk / wholesale", "Other"].map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <textarea
          required
          rows={4}
          value={form.message}
          onChange={(event) => setForm({ ...form, message: event.target.value })}
          placeholder="How can we help? *"
          className="w-full border border-[#ddd2c6] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#862222] sm:col-span-2"
        />
      </div>
      {error ? (
        <div className="mt-2 text-[11.5px] text-[#b3261e]" role="alert">
          <p>{error}</p>
          {/* honest fallback — static preview / server down par message kho na jaye */}
          {HAS_WHATSAPP ? (
            <p className="mt-1 text-[#5c534b]">
              Aap seedha WhatsApp par bhi bhej sakte hain:{" "}
              <a
                href={`https://wa.me/${whatsappNumber(SUPPORT_WHATSAPP)}?text=${encodeURIComponent(
                  `Hi Noor Ethnic Wear! ${form.subject}\nName: ${form.name}\n${form.message}`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                WhatsApp {SUPPORT_WHATSAPP}
              </a>
              .
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status === "loading"}
          data-testid="contact-submit"
          className="bg-[#862222] px-7 py-3 text-[11px] font-semibold tracking-[.16em] text-white uppercase disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Send message"}
        </button>
        {HAS_WHATSAPP ? (
          <a
            href={whatsappFallbackHref(form, SUPPORT_WHATSAPP)}
            target="_blank"
            rel="noreferrer"
            data-testid="contact-whatsapp"
            className="text-[11.5px] text-[#5c534b] underline decoration-[#c9b9a8] underline-offset-4 hover:text-[#862222]"
          >
            ya WhatsApp {SUPPORT_WHATSAPP} par bhejein
          </a>
        ) : null}
      </div>
    </form>
  );
}
