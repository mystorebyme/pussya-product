import Link from "next/link";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Storefront ka top area: announcement bar + home hero banner.
 * Announcement yahin se badla ja sakta hai (turant site par — store settings API).
 * Hero image abhi catalogue/brand asset hai, isliye uski current state yahan dikhti hai.
 */
/** Storefront ke home hero ke teen device-specific posters (owner-supplied creative) */
const HERO_IMAGES = [
  { label: "Desktop / laptop (≥1024px)", path: "/images/banners/banner-desktop.webp" },
  { label: "Tablet (768–1023px)", path: "/images/banners/banner-tablet.webp" },
  { label: "Mobile (<768px)", path: "/images/banners/banner-mobile.webp" },
];
const HERO_HREF = "/collections/sale";

export default async function BannersPage() {
  const settings = await getSettings();
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3000";

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Banners</h1>
          <p>Announcement bar aur home hero — jo live site par dikh raha hai</p>
        </div>
        <div className="actions">
          <Link className="btn" href="/settings">
            Edit announcement
          </Link>
          <a className="btn" href={storeUrl} target="_blank" rel="noreferrer">
            View site
          </a>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Announcement bar</h2>
          <span className={settings.announcement ? "badge badge-success" : "badge"}>
            {settings.announcement ? "live" : "default copy"}
          </span>
        </div>
        <div className="panel-body">
          <p className="small">{settings.announcement ?? "Storefront apni default announcements dikha raha hai."}</p>
          <p className="small muted">
            Settings page se change kariye — save karte hi website ke header par wahi text dikhne lagta hai.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Home hero</h2>
        </div>
        <div className="panel-body">
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {HERO_IMAGES.map((image) => (
              <figure key={image.path} style={{ margin: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${storeUrl}${image.path}`}
                  alt={`Home hero — ${image.label}`}
                  style={{ width: "100%", border: "1px solid #e5dbd0", display: "block" }}
                />
                <figcaption className="small muted" style={{ marginTop: 6 }}>
                  {image.label}
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="small" style={{ marginTop: 10 }}>
            Hero link: <span className="mono">{HERO_HREF}</span>
          </p>
          <p className="small muted">
            Teen device-specific files yahin se aati hain (<span className="mono">apps/web/public/images/banners/</span>)
            — phone par portrait, tablet par 4:3, desktop par wide. Sab me flat 70% OFF, final price ₹499–₹699.
            Nayi creative chahiye to wahi files replace karke deploy karo
            (<span className="mono">node scripts/brand/build-responsive-assets.mjs</span>);
            announcement text Settings (ya Google Sheet) se turant badalta hai.
          </p>
        </div>
      </div>
    </>
  );
}
