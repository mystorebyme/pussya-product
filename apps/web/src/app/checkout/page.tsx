import { Suspense } from "react";
import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";
import { ShippingNote } from "@/components/shipping-note";

export const metadata: Metadata = { title: "Secure checkout" };

export default function CheckoutPage() {
  return (
    <div className="container-noor py-8 lg:py-12">
      <div className="text-center">
        <h1 className="font-display text-[28px] font-medium tracking-[.03em] sm:text-[34px]">Secure checkout</h1>
        <p className="mt-1 text-[11px] tracking-[.14em] text-[#9c8f82] uppercase">
          <ShippingNote /> · 7 days replacement
        </p>
      </div>
      <div className="mt-7">
        <Suspense fallback={<div className="py-16 text-center text-sm text-[#8a8078]">Loading checkout…</div>}>
          <CheckoutForm />
        </Suspense>
      </div>
    </div>
  );
}
