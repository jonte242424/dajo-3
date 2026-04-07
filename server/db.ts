import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const { Pool } = pg;

// Railway interna adresser använder .internal — SSL behövs inte där
const isRailwayInternal = process.env.DATABASE_URL?.includes(".railway.internal");

export const db = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isRailwayInternal ? false : (process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false),
    })
  : null;
