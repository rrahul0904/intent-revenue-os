import { describe, expect, it } from "vitest";
import {
  approveDraft,
  authorizeExactDraftSend,
  createFitReceipt,
  generateEvidenceLinkedDraft,
  rankProspects,
  reviseDraft,
  skipDraft,
} from "../src/domain/distribution/distribution";
import {
  demoDistributionAgent,
  syntheticProspects,
} from "../src/domain/distribution/fixtures";

function draftTopProspect() {
  const prospect = syntheticProspects[0];
  const fit = createFitReceipt(demoDistributionAgent, prospect);
  return generateEvidenceLinkedDraft(demoDistributionAgent, prospect, fit);
}

describe("distribution Phase A workflow", () => {
  it("ranks synthetic prospects deterministically and keeps ineligible accounts out of draft decisions", () => {
    const first = rankProspects(demoDistributionAgent, syntheticProspects);
    const second = rankProspects(demoDistributionAgent, syntheticProspects);

    expect(second).toEqual(first);
    expect(first.map((receipt) => receipt.prospectId)).toEqual([
      "prospect_ops_001",
      "prospect_onboarding_002",
      "prospect_watch_003",
      "prospect_ineligible_004",
    ]);
    expect(first[0].score).toBe(92);
    expect(first[3].decision).toBe("skip");
    expect(first[3].policyChecks.accountEligible).toBe(false);
  });

  it("generates a draft linked only to explicit evidence receipts", () => {
    const prospect = syntheticProspects[0];
    const fit = createFitReceipt(demoDistributionAgent, prospect);
    const draft = generateEvidenceLinkedDraft(
      demoDistributionAgent,
      prospect,
      fit,
    );

    expect(draft.fitReceiptId).toBe(fit.id);
    expect(draft.evidenceIds).toEqual([
      "evidence_ops_001_problem",
      "evidence_ops_001_intent",
    ]);
    expect(draft.body).toContain(prospect.evidence[0].text);
    expect(draft.approval).toBeNull();
  });

  it("treats adversarial public content as inert data and refuses to draft an ineligible prospect", () => {
    const prospect = syntheticProspects[3];
    const fit = createFitReceipt(demoDistributionAgent, prospect);

    expect(fit.decision).toBe("skip");
    expect(() =>
      generateEvidenceLinkedDraft(demoDistributionAgent, prospect, fit),
    ).toThrow("prospect is not eligible for drafting");
  });

  it("invalidates approval whenever the approved draft is edited", () => {
    const approved = approveDraft(draftTopProspect(), "founder");
    const result = reviseDraft(
      approved,
      `${approved.body} Added a founder-authored clarification.`,
      "founder",
    );

    expect(result.revision.approvalInvalidated).toBe(true);
    expect(result.draft.revision).toBe(2);
    expect(result.draft.approval).toBeNull();
  });

  it("keeps approval separate from send authorization", () => {
    const approved = approveDraft(draftTopProspect(), "founder");

    expect(approved.approval?.approvedRevision).toBe(1);
    expect("providerWrite" in approved).toBe(false);

    const authorized = authorizeExactDraftSend(
      demoDistributionAgent,
      approved,
      {
        draftId: approved.id,
        revision: approved.revision,
        authorizedBy: "founder",
      },
    );

    expect(authorized.status).toBe("authorized_simulation");
    expect(authorized.providerWrite).toBe(false);
  });

  it("denies send authorization for an unapproved draft", () => {
    const draft = draftTopProspect();
    const receipt = authorizeExactDraftSend(demoDistributionAgent, draft, {
      draftId: draft.id,
      revision: draft.revision,
      authorizedBy: "founder",
    });

    expect(receipt.status).toBe("denied");
    expect(receipt.reason).toContain("not been approved");
    expect(receipt.providerWrite).toBe(false);
  });

  it("denies stale revisions even when an earlier revision was approved", () => {
    const approved = approveDraft(draftTopProspect(), "founder");
    const revised = reviseDraft(
      approved,
      `${approved.body} Revision two.`,
      "founder",
    ).draft;

    const receipt = authorizeExactDraftSend(
      demoDistributionAgent,
      revised,
      {
        draftId: revised.id,
        revision: 1,
        authorizedBy: "founder",
      },
    );

    expect(receipt.status).toBe("denied");
    expect(receipt.reason).toContain("revision is stale");
  });

  it("denies a send request that names a different draft", () => {
    const approved = approveDraft(draftTopProspect(), "founder");
    const receipt = authorizeExactDraftSend(
      demoDistributionAgent,
      approved,
      {
        draftId: "draft:someone-else",
        revision: approved.revision,
        authorizedBy: "founder",
      },
    );

    expect(receipt.status).toBe("denied");
    expect(receipt.reason).toContain("exact draft");
  });

  it("denies skipped drafts and preserves the no-blast local boundary", () => {
    const skipped = skipDraft(draftTopProspect());
    const receipt = authorizeExactDraftSend(
      demoDistributionAgent,
      skipped,
      {
        draftId: skipped.id,
        revision: skipped.revision,
        authorizedBy: "founder",
      },
    );

    expect(demoDistributionAgent.policy.queueWideSend).toBe("disabled");
    expect(demoDistributionAgent.policy.anonymousScraping).toBe("disabled");
    expect(receipt.status).toBe("denied");
    expect(receipt.providerWrite).toBe(false);
  });
});
