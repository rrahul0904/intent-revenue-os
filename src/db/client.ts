import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let sqlClient: ReturnType<typeof postgres> | undefined;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!sqlClient) {
    sqlClient = postgres(process.env.DATABASE_URL, {
      max: 8,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }

  return sqlClient;
}

export function getDb() {
  return drizzle(getSql());
}

export async function pingDatabase(): Promise<number> {
  const started = Date.now();
  await getSql().unsafe("select 1");
  return Date.now() - started;
}
