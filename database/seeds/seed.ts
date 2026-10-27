/**
 * Seed script — catalogue JSON ko Prisma/Postgres me daalta hai.
 * Phase 1 me iski zaroorat nahi (storefront build-time JSON padhta hai),
 * Phase 2 me DB par shift karte waqt use hota hai.
 *
 * Run: DATABASE_URL=... npx tsx database/seeds/seed.ts
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import type { Catalog } from "@liksha/types";

const prisma = new PrismaClient();

async function main() {
  const file = path.join(import.meta.dirname, "catalog.json");
  const catalog = JSON.parse(fs.readFileSync(file, "utf8")) as Catalog;
  console.log(`Seeding ${catalog.products.length} products…`);

  for (const collection of catalog.collections) {
    await prisma.collection.upsert({
      where: { handle: collection.handle },
      update: { title: collection.title, subtitle: collection.subtitle, imageUrl: collection.image, sortOrder: collection.sortOrder },
      create: {
        handle: collection.handle,
        title: collection.title,
        subtitle: collection.subtitle,
        imageUrl: collection.image,
        sortOrder: collection.sortOrder,
      },
    });
  }

  for (const product of catalog.products) {
    const record = await prisma.product.upsert({
      where: { handle: product.handle },
      update: {
        title: product.title,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        inStock: product.inStock,
        featured: product.featured,
      },
      create: {
        handle: product.handle,
        title: product.title,
        description: product.description,
        category: product.category,
        fabric: product.fabric,
        color: product.color,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        rating: product.rating,
        reviewCount: product.reviewCount,
        inStock: product.inStock,
        featured: product.featured,
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: record.id } });
    await prisma.productImage.createMany({
      data: product.images.map((url, index) => ({ productId: record.id, url, position: index })),
    });

    await prisma.productVariant.deleteMany({ where: { productId: record.id } });
    await prisma.productVariant.createMany({
      data: product.sizes.map((size) => ({
        productId: record.id,
        sku: `${product.handle}-${size}`.slice(0, 60),
        size,
        price: product.price,
        stock: product.inStock ? 5 : 0,
      })),
    });

    await prisma.product.update({
      where: { id: record.id },
      data: { collections: { connect: product.collections.map((handle) => ({ handle })) } },
    });
  }

  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL ?? "admin@likshaclothing.com" },
    update: { role: "OWNER" },
    create: {
      email: process.env.ADMIN_EMAIL ?? "admin@likshaclothing.com",
      name: "Store Owner",
      role: "OWNER",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
