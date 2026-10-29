import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "My wishlist", description: "Noor Ethnic Wear — designer anarkali suits, lehenga choli and suit sets." };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
