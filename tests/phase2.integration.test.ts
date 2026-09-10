import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { getSql } from "../src/db/client";
import {
  claimNextJob,
  completeJob,
  enqueueJob,
} from "../src/repositories/jobs";
import { upsertSourcePost } from "../src/repositories/source-posts";

const integration = process.env.DATABASE_URL ? describe : describe.skip;
const workspaceIds: string[] = [];
const sourceExternalIds: string[] = [];

afterEach(async () => {
  if (!process.env.DATABASE_URL) return;
  const sql = getSql();

  for (const externalId of sourceExternalIds.splice(0)) {
    await sql.unsafe(
      "delete from source_posts where platform = 'reddit' and external_id = $1",
      [externalId],
    );
  }

  for (const workspaceId of workspaceIds.splice(0)) {
    await sql.unsafe("delete from workspaces where id = $1::uuid", [workspaceId]);
  }
});

integration("Phase 2 Postgres integration", () => {
  it("enforces queue idempotency and completes a leased job", async () => {
    const sql = getSql();
    const workspaceId = randomUUID();
    workspaceIds.push(workspaceId);

    await sql.unsafe(
      "insert into workspaces (id, name, slug) values ($1::uuid, $2, $3)",
      [workspaceId, "Integration Workspace", "integration-" + workspaceId.slice(0, 8)],
    );

    const key = "integration-job:" + randomUUID();
    const first = await enqueueJob({
      workspaceId,
      type: "TEST_JOB",
      payload: { ok: true },
      idempotencyKey: key,
      priority: 99,
    });
    const second = await enqueueJob({
      workspaceId,
      type: "TEST_JOB",
      payload: { ok: true },
      idempotencyKey: key,
      priority: 99,
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.job.id).toBe(first.job.id);

    const workerId = "integration-worker";
    const claimed = await claimNextJob(workerId, 30);
    expect(claimed?.id).toBe(first.job.id);
    expect(claimed?.attempts).toBe(1);

    await completeJob(first.job.id, workerId);
    const rows = await sql.unsafe(
      "select status, lease_owner from queue_jobs where id = $1::uuid",
      [first.job.id],
    );

    expect(rows[0]?.status).toBe("succeeded");
    expect(rows[0]?.lease_owner).toBeNull();
  });

  it("deduplicates canonical source posts", async () => {
    const externalId = "integration-" + randomUUID();
    sourceExternalIds.push(externalId);
    const record = {
      platform: "reddit" as const,
      externalId,
      community: "testing",
      author: "integration",
      title: "Need an operations tool",
      body: "Looking for a better workflow.",
      url: "https://www.reddit.com/comments/" + externalId,
      publishedAt: new Date("2026-09-10T00:00:00Z"),
      contentHash: "a".repeat(64),
      rawPayload: { id: externalId },
    };

    const first = await upsertSourcePost(record);
    const second = await upsertSourcePost({
      ...record,
      body: "Looking for a better workflow. Updated.",
      contentHash: "b".repeat(64),
    });

    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    expect(second.id).toBe(first.id);

    const sql = getSql();
    const rows = await sql.unsafe(
      "select count(*)::int as count, body from source_posts " +
        "where platform = 'reddit' and external_id = $1 group by body",
      [externalId],
    );

    expect(Number(rows[0]?.count)).toBe(1);
    expect(rows[0]?.body).toContain("Updated");
  });
});
