import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
// Neon over HTTPS: works from any host (including restricted networks) and on
// serverless/edge hosts. All queries in this app are single statements.
export function db() {
  if (!process.env.DATABASE_URL) return null;
  return drizzle(neon(process.env.DATABASE_URL), { schema });
}
export type DB = NonNullable<ReturnType<typeof db>>;
