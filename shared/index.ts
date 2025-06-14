import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "./schema"; // ✅ correct relative import

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

// Configure Neon to use WebSockets
neonConfig.webSocketConstructor = ws;
// Optional: Increase timeout for long-running queries
neonConfig.connectionTimeoutMillis = 60000;

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
