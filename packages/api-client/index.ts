/**
 * @noor/api-client
 * Ek hi typed client — web aur admin dono use karte hain.
 * Browser se relative `/api/...` (proxy), server se absolute API_URL.
 */
import type { Catalog, Order, Paginated, Product, Collection } from "@noor/types";

export interface ClientOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = "api_error",
  ) {
    super(message);
  }
}

export function createApiClient({ baseUrl = "", headers = {} }: ClientOptions = {}) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...headers,
        ...(init.headers as Record<string, string> | undefined),
      },
      cache: "no-store",
    });
    const text = await response.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;
    if (!response.ok) {
      const error = payload as { message?: string; code?: string } | null;
      throw new ApiError(response.status, error?.message ?? "Request failed", error?.code);
    }
    return payload as T;
  }

  return {
    catalog: () => request<Catalog>("/api/v1/catalog"),
    products: (query: string = "") => request<Paginated<Product>>(`/api/v1/products${query}`),
    product: (handle: string) => request<Product>(`/api/v1/products/${handle}`),
    collections: () => request<Collection[]>("/api/v1/collections"),
    createOrder: (body: unknown, idempotencyKey: string) =>
      request<Order>("/api/v1/orders", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(body),
      }),
    order: (orderNumber: string) => request<Order>(`/api/v1/orders/${orderNumber}`),
    orders: (query: string = "") => request<Paginated<Order>>(`/api/v1/orders${query}`),
    health: () => request<{ status: string }>("/api/v1/health"),
  };
}

export type NoorApiClient = ReturnType<typeof createApiClient>;
