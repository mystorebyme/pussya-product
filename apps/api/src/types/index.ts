export type RequestUser = {
  id: string;
  role: "admin" | "staff" | "customer";
  name: string;
};

export type ListQuery = {
  page?: number;
  perPage?: number;
  q?: string;
};
