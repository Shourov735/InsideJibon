import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getEnv } from "@/lib/env";

let _db: ReturnType<typeof drizzle> | undefined;

/**
 * Lazy singleton database client. The Neon HTTP driver is fetch-based,
 * so it works on Node (dev) and Cloudflare Workers (production).
 */
export function getDb() {
  if (!_db) {
    _db = drizzle(neon(getEnv().DATABASE_URL));
  }
  return _db;
}