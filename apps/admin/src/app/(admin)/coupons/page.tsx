import { COUPONS } from "@noor/validation";
import { inr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function CouponsPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <h1>Coupons</h1>
          <p>Active discount codes (shared validation package se)</p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(COUPONS).length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <strong>Koi active coupon nahi.</strong> Festive sale me final price already ₹499–₹699 hai —
                  extra percentage coupon price ko is range se neeche le jaata, isliye band rakhe hain.
                </td>
              </tr>
            ) : null}
            {Object.entries(COUPONS).map(([code, percent]) => (
              <tr key={code}>
                <td className="mono">{code}</td>
                <td>
                  {percent}% off · max {inr(200000)}
                </td>
                <td>
                  <span className="badge badge-success">Active</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="notice">
        Coupon rules <span className="mono">packages/validation/index.ts</span> me hain — ek hi jagah badalne se
        storefront aur API dono update ho jaate hain. Sale price hi final price hai, isliye abhi koi code active
        nahi. Naya offer dena ho to <span className="mono">scripts/lib/sale-pricing.mjs</span> me final price
        badlo (₹499–₹699 ka set).
      </div>
    </>
  );
}
