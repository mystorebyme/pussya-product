import Link from "next/link";
import { getProducts } from "@/lib/data";
import { inr } from "@/lib/format";
import { updateStockAction } from "@/app/actions";
import { getSession } from "@/lib/session";
import { ReadOnlyNotice } from "@/components/read-only-notice";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stock?: string; page?: string }>;
}) {
  const { q = "", stock = "all", page = "1" } = await searchParams;
  const session = await getSession();
  const term = q.trim().toLowerCase();
  const perPage = 20;
  const currentPage = Math.max(1, Number(page) || 1);

  const all = getProducts()
    .filter((product) =>
      term
        ? `${product.title} ${product.handle} ${product.fabric} ${product.color}`.toLowerCase().includes(term)
        : true,
    )
    .filter((product) => (stock === "out" ? !product.inStock : stock === "live" ? product.inStock : true));

  const totalPages = Math.max(1, Math.ceil(all.length / perPage));
  const rows = all.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <>
      <ReadOnlyNotice what="Product edits" />

      <div className="topbar">
        <div>
          <h1>Products</h1>
          <p>{all.length} products · price aur stock yahin se manage hota hai</p>
        </div>
        <div className="actions">
          <Link className="btn btn-primary" href="/products/new" data-testid="new-product">
            + Add product
          </Link>
          <form className="actions" action="/products">
          <input name="q" defaultValue={q} placeholder="Search title, SKU, fabric" style={{ width: 240 }} />
          <select name="stock" defaultValue={stock} style={{ width: 130 }}>
            <option value="all">All stock</option>
            <option value="live">In stock</option>
            <option value="out">Out of stock</option>
          </select>
            <button className="btn" type="submit">
              Filter
            </button>
          </form>
        </div>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>MRP</th>
              <th>Stock</th>
              <th className="right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <tr key={product.handle}>
                <td>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="thumb" src={`${product.images[0]}?width=120`} alt="" />
                    <div>
                      <Link href={`/products/${product.handle}`} style={{ fontWeight: 500 }}>
                        {product.title}
                      </Link>
                      <div className="small muted mono">{product.handle.slice(0, 42)}</div>
                    </div>
                  </div>
                </td>
                <td className="muted">{product.category}</td>
                <td>{inr(product.price)}</td>
                <td className="muted">{product.compareAtPrice ? inr(product.compareAtPrice) : "—"}</td>
                <td>
                  <span className={`badge ${product.inStock ? "badge-success" : "badge-danger"}`}>
                    {product.inStock ? "In stock" : "Out of stock"}
                  </span>
                </td>
                <td className="right">
                  <form action={updateStockAction} style={{ display: "inline" }}>
                    <input type="hidden" name="handle" value={product.handle} />
                    <input type="hidden" name="inStock" value={product.inStock ? "false" : "true"} />
                    <input type="hidden" name="actor" value={session?.email ?? "admin"} />
                    <button className="btn btn-sm" type="submit">
                      {product.inStock ? "Mark out" : "Restock"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <div className="empty">Koi product nahi mila.</div> : null}
      </div>

      <div className="actions" style={{ marginTop: 14, justifyContent: "space-between" }}>
        <span className="small muted">
          Page {currentPage} of {totalPages}
        </span>
        <span className="actions">
          {currentPage > 1 ? (
            <Link className="btn btn-sm" href={`/products?q=${encodeURIComponent(q)}&stock=${stock}&page=${currentPage - 1}`}>
              ← Previous
            </Link>
          ) : null}
          {currentPage < totalPages ? (
            <Link className="btn btn-sm" href={`/products?q=${encodeURIComponent(q)}&stock=${stock}&page=${currentPage + 1}`}>
              Next →
            </Link>
          ) : null}
        </span>
      </div>
    </>
  );
}
