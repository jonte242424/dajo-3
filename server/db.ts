import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const { Pool } = pg;

// Railway interna adresser använder .internal — SSL behövs inte där
const isRailwayInternal = process.env.DATABASE_URL?.includes(".railway.internal");

let pool: any = null;
let connectionError: Error | null = null;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isRailwayInternal ? false : (process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false),
      // Test connection immediately
    });

    // Don't wait for connection - just prepare it
    pool.on('error', (err: Error) => {
      console.error('Database pool error:', err.message);
      connectionError = err;
    });
  } catch (err) {
    console.error('Failed to create database pool:', err);
    connectionError = err instanceof Error ? err : new Error(String(err));
  }
}

export const db = pool;
export const dbError = connectionError;
