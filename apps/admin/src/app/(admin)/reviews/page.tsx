import { getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Reviews ka overview — kaunse products par reviews hain, rating distribution,
 * aur Trustoo daily sync kab chala tha. Moderation (delete/hide) Phase 2 me.
 */
export default async function ReviewsPage() {
  const products = getProducts();
  const reviewed = products.filter((product) => product.reviewCount > 0);
  const rated = reviewed.length
    ? reviewed.reduce((sum, product) => sum + product.rating, 0) / reviewed.length
    : 0;
  const totalReviews = reviewed.reduce((sum, product) => sum + product.reviewCount, 0);

  const buckets = [
    { label: "4.5 – 5.0", test: (rating: number) => rating >= 4.5 },
    { label: "4.0 – 4.4", test: (rating: number) => rating >= 4 && rating < 4.5 },
    { label: "3.5 – 3.9", test: (rating: number) => rating >= 3.5 && rating < 4 },
    { label: "3.0 se kam", test: (rating: number) => rating < 3.5 },
  ];

  const top = [...reviewed].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 15);
  const low = [...reviewed].sort((a, b) => a.rating - b.rating).slice(0, 8);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Reviews</h1>
          <p>Product ratings, review volume aur sabse kam rating wale products</p>
        </div>
      </div>

      <div className="row">
        <div className="panel" style={{ marginTop: 0 }}>
          <div className="panel-head">
            <h2>Summary</h2>
          </div>
          <div className="panel-body">
            <p className="small">
              Products with reviews: <strong>{reviewed.length}</strong> / {products.length}
            </p>
            <p className="small">
              Total reviews: <strong>{totalReviews}</strong>
            </p>
            <p className="small">
              Average rating: <strong>{rated.toFixed(2)} ★</strong>
            </p>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 0 }}>
          <div className="panel-head">
            <h2>Rating spread</h2>
          </div>
          <div className="panel-body">
            {buckets.map((bucket) => (
              <p key={bucket.label} className="small">
                {bucket.label}: <strong>{reviewed.filter((product) => bucket.test(product.rating)).length}</strong>{" "}
                products
              </p>
            ))}
            <p className="small muted">
              Reviews storefront par catalogue ke saath aate hain aur roz sync hote hain — customer ko
              dikhne wala data wahi hai jo yahan hai.
            </p>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Most reviewed</h2>
        </div>
        <div className="panel-body">
          {top.length === 0 ? (
            <p className="muted">Abhi kisi product par review nahi hai.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Rating</th>
                  <th>Reviews</th>
                </tr>
              </thead>
              <tbody>
                {top.map((product) => (
                  <tr key={product.handle}>
                    <td className="small">
                      <a href={`/products/${product.handle}`}>{product.title}</a>
                    </td>
                    <td className="small">{product.rating.toFixed(1)} ★</td>
                    <td className="small">{product.reviewCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Lowest rated (dhyan dein)</h2>
        </div>
        <div className="panel-body">
          {low.length === 0 ? (
            <p className="muted">—</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Rating</th>
                  <th>Reviews</th>
                </tr>
              </thead>
              <tbody>
                {low.map((product) => (
                  <tr key={product.handle}>
                    <td className="small">{product.title}</td>
                    <td className="small">{product.rating.toFixed(1)} ★</td>
                    <td className="small">{product.reviewCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
