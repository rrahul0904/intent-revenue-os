import { count, desc, eq } from "drizzle-orm";
import { getDb, getSql } from "@/db/client";
import { queueJobs } from "@/db/schema";
import { requireWorkspaceMembership } from "@/repositories/workspaces";

export type QueueJobStatus =
  | "queued"
  | "running"
  | "retry"
  | "succeeded"
  | "dead_letter";

export interface ClaimedQueueJob {
  id: string;
  workspaceId: string;
  type: string;
  payload: unknown;
  status: QueueJobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  leaseOwner: string | null;
}

type QueueJobRow = {
  id: string;
  workspace_id: string;
  type: string;
  payload: unknown;
  status: QueueJobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  lease_owner: string | null;
};

function mapJob(row: QueueJobRow): ClaimedQueueJob {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: row.type,
    payload: row.payload,
    status: row.status,
    priority: row.priority,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    leaseOwner: row.lease_owner,
  };
}

export function calculateRetryDelaySeconds(attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(3600, 15 * 2 ** exponent);
}

export async function enqueueJob(input: {
  workspaceId: string;
  type: string;
  payload: unknown;
  idempotencyKey: string;
  priority?: number;
  maxAttempts?: number;
  availableAt?: Date;
}) {
  const db = getDb();
  const inserted = await db
    .insert(queueJobs)
    .values({
      workspaceId: input.workspaceId,
      type: input.type,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
      priority: input.priority ?? 50,
      maxAttempts: input.maxAttempts ?? 5,
      availableAt: input.availableAt ?? new Date(),
    })
    .onConflictDoNothing({ target: queueJobs.idempotencyKey })
    .returning();

  if (inserted[0]) {
    return { job: inserted[0], created: true };
  }

  const [existing] = await db
    .select()
    .from(queueJobs)
    .where(eq(queueJobs.idempotencyKey, input.idempotencyKey))
    .limit(1);

  if (!existing) {
    throw new Error("Unable to read idempotent queue job");
  }

  return { job: existing, created: false };
}

export async function claimNextJob(
  workerId: string,
  leaseSeconds = 120,
): Promise<ClaimedQueueJob | null> {
  const sql = getSql();
  const safeLeaseSeconds = Math.min(Math.max(Math.floor(leaseSeconds), 15), 900);
  const query =
    "WITH candidate AS (" +
    " SELECT id FROM queue_jobs" +
    " WHERE status IN ('queued', 'retry')" +
    " AND available_at <= now()" +
    " AND (leased_until IS NULL OR leased_until < now())" +
    " ORDER BY priority DESC, created_at ASC" +
    " FOR UPDATE SKIP LOCKED LIMIT 1" +
    ") UPDATE queue_jobs AS job" +
    " SET status = 'running'," +
    " lease_owner = $1," +
    " leased_until = now() + make_interval(secs => $2::int)," +
    " attempts = job.attempts + 1," +
    " updated_at = now()" +
    " FROM candidate" +
    " WHERE job.id = candidate.id" +
    " RETURNING job.id, job.workspace_id, job.type, job.payload," +
    " job.status, job.priority, job.attempts, job.max_attempts, job.lease_owner";

  const rows = (await sql.unsafe(query, [
    workerId,
    safeLeaseSeconds,
  ])) as unknown as QueueJobRow[];

  return rows[0] ? mapJob(rows[0]) : null;
}

export async function completeJob(jobId: string, workerId: string) {
  const sql = getSql();
  await sql.unsafe(
    "UPDATE queue_jobs" +
      " SET status = 'succeeded', lease_owner = NULL, leased_until = NULL," +
      " last_error = NULL, updated_at = now()" +
      " WHERE id = $1::uuid AND lease_owner = $2",
    [jobId, workerId],
  );
}

export async function failJob(input: {
  job: ClaimedQueueJob;
  workerId: string;
  error: string;
  retryable: boolean;
  retryAfterSeconds?: number;
}) {
  const sql = getSql();
  const terminal =
    !input.retryable || input.job.attempts >= input.job.maxAttempts;

  if (terminal) {
    await sql.unsafe(
      "UPDATE queue_jobs" +
        " SET status = 'dead_letter', lease_owner = NULL, leased_until = NULL," +
        " last_error = $1, updated_at = now()" +
        " WHERE id = $2::uuid AND lease_owner = $3",
      [input.error.slice(0, 4000), input.job.id, input.workerId],
    );
    return "dead_letter" as const;
  }

  const delay = Math.min(
    3600,
    Math.max(
      1,
      Math.floor(
        input.retryAfterSeconds ??
          calculateRetryDelaySeconds(input.job.attempts),
      ),
    ),
  );

  await sql.unsafe(
    "UPDATE queue_jobs" +
      " SET status = 'retry'," +
      " available_at = now() + make_interval(secs => $1::int)," +
      " lease_owner = NULL, leased_until = NULL," +
      " last_error = $2, updated_at = now()" +
      " WHERE id = $3::uuid AND lease_owner = $4",
    [delay, input.error.slice(0, 4000), input.job.id, input.workerId],
  );

  return "retry" as const;
}

export async function listQueueJobsForActor(
  userId: string,
  workspaceId: string,
  limit = 50,
) {
  await requireWorkspaceMembership(userId, workspaceId);
  const db = getDb();

  return db
    .select()
    .from(queueJobs)
    .where(eq(queueJobs.workspaceId, workspaceId))
    .orderBy(desc(queueJobs.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}

export async function getQueueSummaryForActor(
  userId: string,
  workspaceId: string,
) {
  await requireWorkspaceMembership(userId, workspaceId);
  const db = getDb();

  const rows = await db
    .select({
      status: queueJobs.status,
      value: count(),
    })
    .from(queueJobs)
    .where(eq(queueJobs.workspaceId, workspaceId))
    .groupBy(queueJobs.status);

  return rows.reduce<Record<QueueJobStatus, number>>(
    (summary, row) => {
      summary[row.status] = Number(row.value);
      return summary;
    },
    {
      queued: 0,
      running: 0,
      retry: 0,
      succeeded: 0,
      dead_letter: 0,
    },
  );
}
