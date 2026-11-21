import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://ubuntu:ubuntu@localhost:5432/app",
  max: 5,
});

export const db = drizzle(pool, { schema });
export { schema };
