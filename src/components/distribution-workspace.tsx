"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  Clock,
  Eye,
  Inbox,
  Lock,
  MessageSquare,
  Play,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import styles from "@/components/distribution-workspace.module.css";
import {
  demoDistributionAgent,
  demoProspects,
} from "@/lib/distribution/demo-data";
import {
  approveDraft,
  authorizeExactSend,
  buildReviewQueue,
  editDraft,
  rankProspects,
  simulateAuthorizedSend,
  skipDraft,
} from "@/lib/distribution/workflow";
import type {
  OutreachDraft,
  Prospect,
  SimulatedSendReceipt,
} from "@/lib/distribution/types";

function scoreClass(score: number) {
  if (score >= 90) return styles.scoreHot;
  if (score >= 75) return styles.scoreStrong;
  if (score >= 55) return styles.scoreWatch;
  return styles.scoreLow;
}

function channelLabel(value: Prospect["channel"]) {
  return value === "x" ? "X" : value[0].toUpperCase() + value.slice(1);
}

export function DistributionWorkspace() {
  const [prospects, setProspects] = useState(() =>
    rankProspects(demoProspects),
  );
  const [drafts, setDrafts] = useState(() =>
    buildReviewQueue(demoDistributionAgent, demoProspects),
  );
  const [selectedProspectId, setSelectedProspectId] = useState(
    prospects[0]?.id ?? "",
  );
  const [editor, setEditor] = useState(
    () => buildReviewQueue(demoDistributionAgent, demoProspects)[0]?.body ?? "",
  );
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState(
    "Demo mode: discovery and send actions are simulated. No provider receives a message.",
  );
  const [receipts, setReceipts] = useState<SimulatedSendReceipt[]>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  const filteredProspects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return prospects;
    return prospects.filter((prospect) =>
      [
        prospect.identity,
        prospect.handle,
        prospect.community,
        prospect.title,
        prospect.context,
        prospect.channel,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [prospects, query]);

  const selectedProspect =
    prospects.find((prospect) => prospect.id === selectedProspectId) ??
    prospects[0];

  const selectedDraft = selectedProspect
    ? drafts.find((draft) => draft.prospectId === selectedProspect.id)
    : undefined;

  const approvedCount = drafts.filter(
    (draft) => draft.status === "approved",
  ).length;
  const eligibleCount = prospects.filter(
    (prospect) => prospect.eligibility === "eligible",
  ).length;

  function replaceDraft(next: OutreachDraft) {
    setDrafts((current) =>
      current.map((draft) => (draft.id === next.id ? next : draft)),
    );
  }

  function selectProspect(prospectId: string) {
    setSelectedProspectId(prospectId);
    const draft = drafts.find((item) => item.prospectId === prospectId);
    setEditor(draft?.body ?? "");
  }

  function runSyntheticDiscovery() {
    const nextProspects = rankProspects(demoProspects);
    const nextDrafts = buildReviewQueue(demoDistributionAgent, nextProspects);
    setProspects(nextProspects);
    setDrafts(nextDrafts);
    setSelectedProspectId(nextProspects[0]?.id ?? "");
    setEditor(nextDrafts[0]?.body ?? "");
    setReceipts([]);
    const stamp = new Date().toISOString();
    setLastRunAt(stamp);
    setNotice(
      `Synthetic discovery run complete: ${nextProspects.length} prospects evaluated, ${nextDrafts.length} review drafts created. No network or social action occurred.`,
    );
  }

  function saveEdit() {
    if (!selectedDraft) return;
    try {
      const next = editDraft(
        selectedDraft,
        editor,
        new Date().toISOString(),
      );
      replaceDraft(next);
      setNotice(
        `Draft saved as revision ${next.revision}. Any earlier approval was invalidated.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save edit");
    }
  }

  function approveSelected() {
    if (!selectedDraft) return;
    try {
      const next = approveDraft(selectedDraft, new Date().toISOString());
      replaceDraft(next);
      setNotice(
        `Revision ${next.revision} approved. Approval does not send anything.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to approve");
    }
  }

  function skipSelected() {
    if (!selectedDraft) return;
    const next = skipDraft(selectedDraft, new Date().toISOString());
    replaceDraft(next);
    setNotice("Draft skipped. No outbound action is authorized.");
  }

  function simulateSend() {
    if (!selectedDraft) return;
    try {
      const now = new Date().toISOString();
      const intent = authorizeExactSend(
        selectedDraft,
        {
          draftId: selectedDraft.id,
          expectedRevision: selectedDraft.revision,
        },
        now,
      );
      const receipt = simulateAuthorizedSend(intent, now);
      setReceipts((current) => [
        ...current.filter((item) => item.draftId !== receipt.draftId),
        receipt,
      ]);
      setNotice(
        "Send gate passed in demo mode. A receipt was created, but no provider write occurred.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Send authorization failed",
      );
    }
  }

  const selectedReceipt = selectedDraft
    ? receipts.find((receipt) => receipt.draftId === selectedDraft.id)
    : undefined;

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <Sparkles size={16} />
          </div>
          <div>
            <strong>SignalOS</strong>
            <span>Founder Distribution</span>
          </div>
        </div>

        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={15} />
          Intent Radar
        </Link>

        <div className={styles.navGroup}>
          <div className={styles.navActive}>
            <Bot size={16} />
            Distribution Agent
          </div>
          <div className={styles.navItem}>
            <Inbox size={16} />
            Review Queue
          </div>
          <div className={styles.navItem}>
            <Target size={16} />
            ICP Signals
          </div>
        </div>

        <div className={styles.agentCard}>
          <div className={styles.agentHead}>
            <div>
              <small>ACTIVE AGENT</small>
              <strong>{demoDistributionAgent.name}</strong>
            </div>
            <span className={styles.statusDot} />
          </div>
          <p>{demoDistributionAgent.idealCustomer}</p>
          <div className={styles.agentMeta}>
            <span>
              <ShieldCheck size={13} /> Review required
            </span>
            <span>
              <Clock size={13} /> Cap {demoDistributionAgent.dailyCap}/day
            </span>
          </div>
        </div>

        <div className={styles.boundaryCard}>
          <Lock size={15} />
          <div>
            <strong>No live writes</strong>
            <p>
              This preview never posts, DMs, or emails a real account. Provider
              adapters stay disabled until explicit compliant credentials exist.
            </p>
          </div>
        </div>
      </aside>

      <section className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>APPROVAL-FIRST DISTRIBUTION</p>
            <h1>Find the right conversation. Draft the right touch.</h1>
            <p className={styles.subhead}>
              Research, rank, review, then act. The send boundary is separate on
              purpose.
            </p>
          </div>
          <button className={styles.runButton} onClick={runSyntheticDiscovery}>
            <Play size={15} />
            Run demo agent
          </button>
        </header>

        <div className={styles.notice}>
          <ShieldCheck size={15} />
          <span>{notice}</span>
        </div>

        <section className={styles.metrics}>
          <article>
            <span>Prospects evaluated</span>
            <strong>{prospects.length}</strong>
            <small>{eligibleCount} eligible for review</small>
          </article>
          <article>
            <span>Drafts waiting</span>
            <strong>{drafts.filter((draft) => draft.status === "draft").length}</strong>
            <small>Evidence-linked, not sent</small>
          </article>
          <article>
            <span>Approved</span>
            <strong>{approvedCount}</strong>
            <small>Still requires a separate send command</small>
          </article>
          <article>
            <span>Send simulations</span>
            <strong>{receipts.length}</strong>
            <small>{lastRunAt ? "Run refreshed this session" : "No provider writes"}</small>
          </article>
        </section>

        <section className={styles.workspace}>
          <div className={styles.prospectPanel}>
            <div className={styles.panelTop}>
              <div>
                <strong>Prioritized prospects</strong>
                <span>Why they fit before what to send</span>
              </div>
              <label className={styles.search}>
                <Search size={14} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search prospects"
                />
              </label>
            </div>

            <div className={styles.prospectList}>
              {filteredProspects.map((prospect) => {
                const draft = drafts.find(
                  (item) => item.prospectId === prospect.id,
                );
                const active = selectedProspect?.id === prospect.id;
                return (
                  <button
                    className={
                      active
                        ? `${styles.prospectRow} ${styles.selected}`
                        : styles.prospectRow
                    }
                    key={prospect.id}
                    onClick={() => selectProspect(prospect.id)}
                  >
                    <div
                      className={`${styles.score} ${scoreClass(
                        prospect.fit.score,
                      )}`}
                    >
                      {prospect.fit.score}
                    </div>
                    <div className={styles.prospectCopy}>
                      <div className={styles.rowMeta}>
                        <span>{channelLabel(prospect.channel)}</span>
                        <span>{prospect.community}</span>
                        <span>
                          {draft?.status ??
                            (prospect.recommendedTouch === "observe"
                              ? "observe"
                              : prospect.eligibility)}
                        </span>
                      </div>
                      <strong>{prospect.title}</strong>
                      <p>{prospect.fit.rationale}</p>
                    </div>
                    <div className={styles.rowAction}>
                      {prospect.eligibility === "eligible" ? (
                        <MessageSquare size={15} />
                      ) : (
                        <Eye size={15} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className={styles.reviewPanel}>
            {selectedProspect ? (
              <>
                <div className={styles.reviewHead}>
                  <div>
                    <span>{channelLabel(selectedProspect.channel)}</span>
                    <span>{selectedProspect.handle}</span>
                  </div>
                  <div
                    className={`${styles.score} ${scoreClass(
                      selectedProspect.fit.score,
                    )}`}
                  >
                    {selectedProspect.fit.score}
                  </div>
                </div>

                <h2>{selectedProspect.title}</h2>
                <p className={styles.context}>{selectedProspect.context}</p>

                <div className={styles.receipt}>
                  <div className={styles.receiptTitle}>
                    <Target size={14} />
                    Why this prospect fits
                  </div>
                  <p>{selectedProspect.fit.rationale}</p>
                  <div className={styles.evidenceList}>
                    {selectedProspect.fit.evidence.map((evidence) => (
                      <div key={evidence.id}>
                        <span>{evidence.label}</span>
                        <p>“{evidence.excerpt}”</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.eligibility}>
                  {selectedProspect.eligibility === "eligible" ? (
                    <Check size={14} />
                  ) : (
                    <X size={14} />
                  )}
                  <div>
                    <strong>
                      {selectedProspect.eligibility === "eligible"
                        ? "Eligible for review"
                        : "Outreach blocked"}
                    </strong>
                    <p>{selectedProspect.eligibilityReason}</p>
                  </div>
                </div>

                {selectedDraft ? (
                  <div className={styles.draftCard}>
                    <div className={styles.draftHead}>
                      <div>
                        <span>REVIEW DRAFT</span>
                        <strong>
                          {selectedDraft.kind.replace("_", " ")} · revision{" "}
                          {selectedDraft.revision}
                        </strong>
                      </div>
                      <span className={styles.statusChip}>
                        {selectedDraft.status}
                      </span>
                    </div>

                    {selectedDraft.subject ? (
                      <div className={styles.subject}>
                        <span>Subject</span>
                        <strong>{selectedDraft.subject}</strong>
                      </div>
                    ) : null}

                    <textarea
                      value={editor}
                      onChange={(event) => setEditor(event.target.value)}
                      aria-label="Outreach draft"
                    />

                    <div className={styles.editActions}>
                      <button onClick={saveEdit}>Save edit</button>
                      <span>
                        Editing creates a new revision and clears approval.
                      </span>
                    </div>

                    <div className={styles.approvalBar}>
                      <button
                        className={styles.approveButton}
                        onClick={approveSelected}
                      >
                        <Check size={15} />
                        Approve
                      </button>
                      <button
                        className={styles.skipButton}
                        onClick={skipSelected}
                      >
                        Skip
                      </button>
                      <button
                        className={styles.sendButton}
                        onClick={simulateSend}
                        disabled={selectedDraft.status !== "approved"}
                      >
                        <Send size={15} />
                        Simulate exact send
                      </button>
                    </div>

                    <div className={styles.sendBoundary}>
                      <Lock size={14} />
                      <p>
                        Approve only signs off revision{" "}
                        <strong>{selectedDraft.revision}</strong>. The send gate
                        separately checks the exact draft ID and revision.
                      </p>
                    </div>

                    {selectedReceipt ? (
                      <div className={styles.simReceipt}>
                        <strong>Simulation receipt created</strong>
                        <span>{selectedReceipt.idempotencyKey}</span>
                        <small>
                          Provider: {selectedReceipt.provider} · no network write
                        </small>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className={styles.noDraft}>
                    <Eye size={20} />
                    <strong>No outreach draft created</strong>
                    <p>
                      This signal is observe-only or blocked by the eligibility
                      policy, so it never enters the send path.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noDraft}>No prospect selected.</div>
            )}
          </aside>
        </section>
      </section>
    </main>
  );
}
