"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/orders", label: "Orders", badge: true },
  { href: "/products", label: "Products" },
  { href: "/inventory", label: "Inventory" },
  { href: "/collections", label: "Collections" },
  { href: "/invoices", label: "Invoices" },
  { href: "/payments", label: "Payments" },
  { href: "/delivery", label: "Delivery" },
  { href: "/customers", label: "Customers" },
  { href: "/messages", label: "Messages" },
  { href: "/traffic", label: "Traffic" },
  { href: "/reports", label: "Reports" },
  { href: "/coupons", label: "Coupons" },
  { href: "/reviews", label: "Reviews" },
  { href: "/sheet", label: "Google Sheet" },
  { href: "/settings", label: "Settings" },
  { href: "/audit-logs", label: "Audit logs" },
  { href: "/staff", label: "Staff & roles" },
];

export function AdminNav({ pendingOrders }: { pendingOrders: number }) {
  const pathname = usePathname();
  return (
    <nav>
      {links.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} className={active ? "active" : undefined}>
            <span>{link.label}</span>
            {link.badge && pendingOrders > 0 ? <span className="badge badge-warning">{pendingOrders}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
