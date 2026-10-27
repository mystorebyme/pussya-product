import Link from "next/link";
import { getCollections, getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function CollectionsPage() {
  const collections = getCollections();
  const products = getProducts();

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Collections</h1>
          <p>Storefront navigation inhi collections se banti hai</p>
        </div>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Collection</th>
              <th>Handle</th>
              <th>Products</th>
              <th className="right">Storefront</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => {
              const count = products.filter((product) => product.collections.includes(collection.handle)).length;
              return (
                <tr key={collection.handle}>
                  <td>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="thumb" src={`${collection.image}?width=120`} alt="" />
                      <div>
                        <strong>{collection.title}</strong>
                        <div className="small muted">{collection.subtitle}</div>
                      </div>
                    </div>
                  </td>
                  <td className="mono small">{collection.handle}</td>
                  <td>{count}</td>
                  <td className="right">
                    <Link className="btn btn-sm" href={`/products?q=&stock=all`}>
                      View products
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="small muted">
        Collection order `database/seeds/catalog.json` me `sortOrder` se aata hai — badalne ke liye seed
        script chalaayein (`npm run catalog:build`).
      </p>
    </>
  );
}
