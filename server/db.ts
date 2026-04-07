import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const { Pool } = pg;

export const db = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    })
  : null;
