import {
  claimNextJob,
  completeJob,
  failJob,
} from "@/repositories/jobs";
import {
  classifyJobError,
  handleQueueJob,
} from "@/workers/job-handlers";
import { scheduleDueSourceQueries } from "@/services/scheduler";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processOneJob(workerId: string): Promise<boolean> {
  const leaseSeconds = Math.min(
    Math.max(
      Number.parseInt(process.env.WORKER_LEASE_SECONDS || "120", 10) || 120,
      15,
    ),
    900,
  );
  const job = await claimNextJob(workerId, leaseSeconds);
  if (!job) return false;

  try {
    await handleQueueJob(job);
    await completeJob(job.id, workerId);
  } catch (error) {
    const failure = classifyJobError(error);
    await failJob({
      job,
      workerId,
      error: failure.message,
      retryable: failure.retryable,
      retryAfterSeconds: failure.retryAfterSeconds,
    });

    console.error(
      JSON.stringify({
        event: "queue_job_failed",
        jobId: job.id,
        type: job.type,
        attempts: job.attempts,
        retryable: failure.retryable,
        message: failure.message,
      }),
    );
  }

  return true;
}

export async function processWorkerBatch(
  workerId: string,
  maxJobs = 25,
) {
  let processed = 0;

  while (processed < maxJobs) {
    const claimed = await processOneJob(workerId);
    if (!claimed) break;
    processed += 1;
  }

  return processed;
}

export async function runWorkerLoop(input: {
  workerId: string;
  once?: boolean;
  shouldStop?: () => boolean;
}) {
  const pollMs = Math.min(
    Math.max(Number.parseInt(process.env.WORKER_POLL_MS || "2000", 10) || 2000, 250),
    30000,
  );
  const maxJobs = Math.min(
    Math.max(
      Number.parseInt(process.env.WORKER_MAX_JOBS_PER_LOOP || "25", 10) || 25,
      1,
    ),
    250,
  );

  do {
    const scheduler = await scheduleDueSourceQueries(maxJobs);
    const processed = await processWorkerBatch(input.workerId, maxJobs);

    if (input.once) {
      return { processed, scheduler };
    }

    if (processed === 0) {
      await sleep(pollMs);
    }
  } while (!input.shouldStop?.());

  return { processed: 0, scheduler: null };
}
