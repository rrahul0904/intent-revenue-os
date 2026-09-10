import { enqueueJob } from "@/repositories/jobs";
import { listUnclassifiedCandidates } from "@/repositories/source-candidates";

export async function scheduleUnclassifiedCandidateClassifications(
  limit = 100,
) {
  const classifierVersion = process.env.CLASSIFIER_VERSION || "phase3-v1";
  const candidates = await listUnclassifiedCandidates(classifierVersion, limit);
  let scheduled = 0;

  for (const candidate of candidates) {
    const result = await enqueueJob({
      workspaceId: candidate.workspaceId,
      type: "CANDIDATE_CLASSIFY",
      payload: {
        candidateId: candidate.id,
        classifierVersion,
      },
      idempotencyKey:
        "candidate-classify:" + candidate.id + ":" + classifierVersion,
      priority: 90,
      maxAttempts: 2,
    });

    if (result.created) scheduled += 1;
  }

  return {
    classifierVersion,
    candidates: candidates.length,
    scheduled,
  };
}
