import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
});

const requiredTables = [
  "workspaces",
  "memberships",
  "products",
  "product_profiles",
  "website_snapshots",
  "source_queries",
  "source_posts",
  "source_candidates",
  "ingestion_runs",
  "queue_jobs",
  "audit_events",
];

for (const table of requiredTables) {
  const rows = await sql.unsafe(
    "select to_regclass($1) as relation",
    ["public." + table],
  );

  if (!rows[0]?.relation) {
    throw new Error("Missing required table: " + table);
  }
}

const queueColumns = await sql.unsafe(
  "select column_name from information_schema.columns " +
    "where table_schema = 'public' and table_name = 'queue_jobs'",
);

const queueColumnNames = new Set(queueColumns.map((row) => row.column_name));
for (const column of [
  "status",
  "available_at",
  "leased_until",
  "attempts",
  "max_attempts",
]) {
  if (!queueColumnNames.has(column)) {
    throw new Error("queue_jobs is missing " + column);
  }
}

console.log("Database schema verification passed");
await sql.end();
