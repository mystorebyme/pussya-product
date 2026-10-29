import Link from "next/link";
import { NewProductForm } from "@/components/new-product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Add product</h1>
          <p>Product + 10 photos upload kariye — publish par website par live</p>
        </div>
        <div className="actions">
          <Link className="btn" href="/products">
            All products
          </Link>
        </div>
      </div>
      <NewProductForm error={error} />
    </>
  );
}
