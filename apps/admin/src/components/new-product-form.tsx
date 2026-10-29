"use client";

import { useState } from "react";
import { createProductAction } from "@/app/actions";

/**
 * Naya product + uski 10 photos.
 * Har photo ka URL daaliye — turant preview dikhta hai, galat link turant pakda jaata hai.
 * (Shopify CDN / koi bhi direct .jpg/.png/.webp link chalega.)
 */

const SLOTS = 10;

const PRICES = [
  { value: "499", label: "₹499" },
  { value: "549", label: "₹549" },
  { value: "599", label: "₹599" },
  { value: "649", label: "₹649" },
  { value: "699", label: "₹699" },
];

const COLLECTIONS = [
  { value: "new-arrivals", label: "New Arrivals" },
  { value: "party-wear-gown", label: "Anarkali Suit" },
  { value: "lehnga-choli", label: "Lehenga Choli" },
  { value: "printed-suit-set", label: "Printed Suit Set" },
  { value: "trending", label: "Trending" },
  { value: "weddin-collection", label: "Wedding Collection" },
  { value: "sale", label: "Sale" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"];

export function NewProductForm({ error }: { error?: string }) {
  const [images, setImages] = useState<string[]>(Array(SLOTS).fill(""));
  const [title, setTitle] = useState("");

  const handle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const filled = images.filter(Boolean).length;

  return (
    <form action={createProductAction}>
      {error ? <div className="notice warn">{error}</div> : null}

      <div className="panel">
        <div className="panel-head">
          <h2>Product details</h2>
          <span className="badge">step 1</span>
        </div>
        <div className="panel-body">
          <div className="field">
            <label htmlFor="title">Product name</label>
            <input id="title" name="title" required value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="handle">URL handle</label>
              <input id="handle" name="handle" placeholder={handle || "auto"} defaultValue="" />
              <span className="small muted">Khali chhodiye — naam se apne aap ban jayega ({handle || "…"}).</span>
            </div>
            <div className="field">
              <label htmlFor="price">Final price (sale ladder)</label>
              <select id="price" name="price" required defaultValue="499">
                {PRICES.map((price) => (
                  <option key={price.value} value={price.value}>
                    {price.label}
                  </option>
                ))}
              </select>
              <span className="small muted">MRP (70%/60% strikethrough) build khud calculate karta hai.</span>
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <select id="category" name="category" defaultValue="anarkali">
                <option value="anarkali">Anarkali</option>
                <option value="lehnga">Lehenga</option>
                <option value="printed">Printed suit set</option>
                <option value="gown">Gown</option>
                <option value="sharara">Sharara</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="fabric">Fabric</label>
              <input id="fabric" name="fabric" placeholder="Vichitra silk" />
            </div>
            <div className="field">
              <label htmlFor="color">Colour</label>
              <input id="color" name="color" placeholder="Maroon" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={4} placeholder="Anarkali with dupatta, hand work…" />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Photos ({filled}/{SLOTS})</h2>
          <span className="badge">step 2</span>
        </div>
        <div className="panel-body">
          <p className="small muted" style={{ marginTop: 0 }}>
            Har slot me direct image link daaliye (.jpg / .png / .webp). Pehli photo card par dikhti hai, baaki
            gallery me. Ek hi image do products par nahi lag sakti.
          </p>
          <div className="photo-grid">
            {images.map((image, index) => (
              <div className="photo-slot" key={index}>
                <div className="photo-preview">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={`Photo ${index + 1} preview`} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <input
                  name="image"
                  value={image}
                  placeholder={`Photo ${index + 1} URL`}
                  inputMode="url"
                  onChange={(event) =>
                    setImages((current) => current.map((value, i) => (i === index ? event.target.value.trim() : value)))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Collections &amp; sizes</h2>
          <span className="badge">step 3</span>
        </div>
        <div className="panel-body">
          <div className="field">
            <label>Collections</label>
            <div className="chip-row">
              {COLLECTIONS.map((collection) => (
                <label className="chip" key={collection.value}>
                  <input type="checkbox" name="collections" value={collection.value} defaultChecked={collection.value === "new-arrivals"} />
                  {collection.label}
                </label>
              ))}
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Sizes</label>
            <div className="chip-row">
              {SIZES.map((size) => (
                <label className="chip" key={size}>
                  <input type="checkbox" name="sizes" value={size} defaultChecked={["S", "M", "L", "XL"].includes(size)} />
                  {size}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="panel-body">
          <button className="btn btn-primary" type="submit">
            Save + publish product
          </button>
          <span className="small muted" style={{ marginLeft: 10 }}>
            Publish par catalogue rebuild hota hai — website turant naya product dikhane lagti hai.
          </span>
        </div>
      </div>
    </form>
  );
}
