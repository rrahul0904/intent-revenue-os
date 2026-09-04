import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run migrations");
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
});

await sql.unsafe(`
  create table if not exists schema_migrations (
    id bigserial primary key,
    filename text not null unique,
    checksum text not null,
    applied_at timestamptz not null default now()
  )
`);

const migrationDir = path.join(process.cwd(), "drizzle");
const files = (await readdir(migrationDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const filename of files) {
  const fullPath = path.join(migrationDir, filename);
  const content = await readFile(fullPath, "utf8");
  const checksum = createHash("sha256").update(content).digest("hex");
  const rows = await sql`
    select filename, checksum
    from schema_migrations
    where filename = ${filename}
    limit 1
  `;

  if (rows.length > 0) {
    if (rows[0].checksum !== checksum) {
      throw new Error(`Migration ${filename} was modified after it was applied`);
    }
    continue;
  }

  const statements = content
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  await sql.begin(async (tx) => {
    for (const statement of statements) {
      await tx.unsafe(statement);
    }

    await tx`
      insert into schema_migrations (filename, checksum)
      values (${filename}, ${checksum})
    `;
  });

  console.log(`Applied ${filename}`);
}

await sql.end();
