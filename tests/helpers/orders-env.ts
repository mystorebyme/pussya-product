import { isolate } from "./env.ts";

export const dataDir = isolate("orders");
