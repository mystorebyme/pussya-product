import { catalogWritable } from "@/lib/catalog-admin";

/**
 * Deployed panel (Vercel/Render) ka filesystem read-only hota hai — catalogue edits
 * (title, price, stock, photos, publish) repo checkout par hi chalti hain. Isliye
 * edit forms ke upar saaf message, warna user ko lagega save ho gaya par kuch nahi hua.
 */
export function ReadOnlyNotice({ what = "Catalogue edits" }: { what?: string }) {
  if (catalogWritable()) return null;
  return (
    <div className="notice" data-testid="catalog-readonly">
      <strong>Read-only mode.</strong> {what} (title, price, stock, photos, publish) repo checkout par
      chalte hain — deployed panel me filesystem read-only hai. Orders, payments, notes, tracking,
      delivery rules aur invoices yahan se poore kaam karte hain.
    </div>
  );
}
