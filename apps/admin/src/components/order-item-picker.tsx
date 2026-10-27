"use client";

import { useState } from "react";

type PickerProduct = { handle: string; title: string; price: number; sizes: string[] };

/**
 * Manual order ka item picker — product chunne par sirf usi ke sizes dikhte hain,
 * isliye galat size kabhi order me nahi jaata.
 */
export function OrderItemPicker({
  products,
  initialHandle,
}: {
  products: PickerProduct[];
  initialHandle?: string;
}) {
  const first = products.find((product) => product.handle === initialHandle) ?? products[0];
  const [handle, setHandle] = useState(first?.handle ?? "");
  const [size, setSize] = useState(first?.sizes?.[0] ?? "");
  const current = products.find((product) => product.handle === handle);

  return (
    <>
      <div className="field">
        <label htmlFor="handle">Product</label>
        <select
          id="handle"
          name="handle"
          required
          value={handle}
          onChange={(event) => {
            setHandle(event.target.value);
            const next = products.find((product) => product.handle === event.target.value);
            setSize(next?.sizes?.[0] ?? "");
          }}
        >
          {products.map((product) => (
            <option key={product.handle} value={product.handle}>
              {product.title} — ₹{Math.round(product.price / 100)}
            </option>
          ))}
        </select>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="size">Size</label>
          <select id="size" name="size" required value={size} onChange={(event) => setSize(event.target.value)}>
            {(current?.sizes ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="quantity">Quantity</label>
          <input id="quantity" name="quantity" type="number" min={1} max={10} defaultValue={1} required />
        </div>
        <div className="field">
          <label htmlFor="reference">Payment reference / UTR (optional)</label>
          <input id="reference" name="reference" placeholder="412345678901" />
        </div>
      </div>
    </>
  );
}
