import { redirect } from "next/navigation";

/**
 * `/orders` — bina order number ke koi page nahi tha (404). Log address bar me
 * ya WhatsApp link me se `/orders` kholte hain, isliye yahan se tracking page
 * par bhejte hain (jo order number maangta hai).
 */
export default function OrdersIndexPage() {
  redirect("/track-order");
}
