import Link from "next/link";
import { getProducts } from "@/lib/data";
import { updateStockAction } from "@/app/actions";
import { getSession } from "@/lib/session";
import { ReadOnlyNotice } from "@/components/read-only-notice";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await getSession();
  const products = getProducts();
  const out = products.filter((product) => !product.inStock);
  const live = products.length - out.length;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Inventory</h1>
          <p>Product-level stock · {live} live, {out.length} out of stock</p>
        </div>
      </div>

      <ReadOnlyNotice what="Stock updates" />

      <div className="notice">
        Phase 1 me stock product-level hai (Shopify jaisa). Size-wise stock aur atomic reservation
        Phase 2 me aayega — tab `inventory` module Postgres transaction se decrement karega.
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Out of stock</h2>
          <span className="badge badge-danger">{out.length}</span>
        </div>
        {out.length === 0 ? (
          <div className="empty">Sab kuch stock me hai.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Handle</th>
                <th className="right">Action</th>
              </tr>
            </thead>
            <tbody>
              {out.slice(0, 40).map((product) => (
                <tr key={product.handle}>
                  <td>{product.title}</td>
                  <td className="muted">{product.category}</td>
                  <td className="mono small">{product.handle.slice(0, 34)}</td>
                  <td className="right">
                    <form action={updateStockAction}>
                      <input type="hidden" name="handle" value={product.handle} />
                      <input type="hidden" name="inStock" value="true" />
                      <input type="hidden" name="actor" value={session?.email ?? "admin"} />
                      <button className="btn btn-sm btn-primary" type="submit">
                        Restock
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="small muted">
        <Link href="/products">Product list par jaakar</Link> kisi bhi item ka stock badal sakte hain.
      </p>
    </>
  );
}
