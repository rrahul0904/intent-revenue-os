"use client";

import { useMemo, useState } from "react";
import {
  approveDraft,
  authorizeExactDraftSend,
  generateEvidenceLinkedDraft,
  rankProspects,
  reviseDraft,
  skipDraft,
} from "@/domain/distribution/distribution";
import {
  demoDistributionAgent,
  syntheticProspects,
} from "@/domain/distribution/fixtures";
import type {
  OutreachDraft,
  SendReceipt,
} from "@/domain/distribution/types";

const rankedReceipts = rankProspects(
  demoDistributionAgent,
  syntheticProspects,
);

function buildInitialDrafts(): Record<string, OutreachDraft> {
  const eligible = rankedReceipts
    .filter((receipt) => receipt.decision === "draft")
    .slice(0, demoDistributionAgent.policy.maxDraftsPerRun);

  return Object.fromEntries(
    eligible.map((receipt) => {
      const prospect = syntheticProspects.find(
        (item) => item.id === receipt.prospectId,
      );
      if (!prospect) throw new Error("fixture prospect missing");
      const draft = generateEvidenceLinkedDraft(
        demoDistributionAgent,
        prospect,
        receipt,
      );
      return [draft.id, draft];
    }),
  );
}

function decisionTone(decision: "draft" | "observe" | "skip") {
  if (decision === "draft") return "border-emerald-800 bg-emerald-950/40 text-emerald-300";
  if (decision === "observe") return "border-amber-800 bg-amber-950/40 text-amber-300";
  return "border-slate-700 bg-slate-900 text-slate-400";
}

export function DistributionWorkspace() {
  const [selectedProspectId, setSelectedProspectId] = useState(
    rankedReceipts[0]?.prospectId ?? "",
  );
  const [drafts, setDrafts] =
    useState<Record<string, OutreachDraft>>(buildInitialDrafts);
  const [editBuffer, setEditBuffer] = useState<Record<string, string>>({});
  const [sendReceipt, setSendReceipt] = useState<SendReceipt | null>(null);
  const [notice, setNotice] = useState(
    "Local simulation only. No provider writes or anonymous scraping are enabled.",
  );

  const selectedFit = rankedReceipts.find(
    (receipt) => receipt.prospectId === selectedProspectId,
  );
  const selectedProspect = syntheticProspects.find(
    (prospect) => prospect.id === selectedProspectId,
  );
  const selectedDraft = Object.values(drafts).find(
    (draft) => draft.prospectId === selectedProspectId,
  );

  const draftBody = selectedDraft
    ? (editBuffer[selectedDraft.id] ?? selectedDraft.body)
    : "";

  const counts = useMemo(
    () => ({
      draft: rankedReceipts.filter((item) => item.decision === "draft").length,
      observe: rankedReceipts.filter((item) => item.decision === "observe").length,
      skip: rankedReceipts.filter((item) => item.decision === "skip").length,
    }),
    [],
  );

  function saveRevision() {
    if (!selectedDraft) return;
    const nextBody = draftBody.trim();
    if (!nextBody || nextBody === selectedDraft.body) {
      setNotice("No draft change to save.");
      return;
    }

    const result = reviseDraft(selectedDraft, nextBody, "local-founder");
    setDrafts((current) => ({
      ...current,
      [result.draft.id]: result.draft,
    }));
    setEditBuffer((current) => ({
      ...current,
      [result.draft.id]: result.draft.body,
    }));
    setSendReceipt(null);
    setNotice(
      result.revision.approvalInvalidated
        ? `Saved revision ${result.draft.revision}; prior approval was invalidated.`
        : `Saved revision ${result.draft.revision}.`,
    );
  }

  function approveSelected() {
    if (!selectedDraft) return;
    const approved = approveDraft(selectedDraft, "local-founder");
    setDrafts((current) => ({ ...current, [approved.id]: approved }));
    setSendReceipt(null);
    setNotice(
      `Revision ${approved.revision} approved. Approval does not send or authorize any provider write.`,
    );
  }

  function skipSelected() {
    if (!selectedDraft) return;
    const skipped = skipDraft(selectedDraft);
    setDrafts((current) => ({ ...current, [skipped.id]: skipped }));
    setSendReceipt(null);
    setNotice("Draft skipped and any approval cleared.");
  }

  function authorizeSelected() {
    if (!selectedDraft) return;
    const receipt = authorizeExactDraftSend(
      demoDistributionAgent,
      selectedDraft,
      {
        draftId: selectedDraft.id,
        revision: selectedDraft.revision,
        authorizedBy: "local-founder",
      },
    );
    setSendReceipt(receipt);
    setNotice(receipt.reason);
  }

  return (
    <main className="min-h-screen bg-[#080b10] px-4 py-6 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">
              RE-349 · Phase A/B local slice
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Distribution workspace
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Deterministic prospect ranking and review-first outreach over
              synthetic/public-safe fixtures. Public content is treated as
              untrusted data; provider writes remain disabled.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-900 bg-emerald-950/40 px-3 py-1.5 text-emerald-300">
              Review required
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-300">
              No blast action
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-300">
              Anonymous scraping off
            </span>
          </div>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Draft</p>
            <strong className="mt-2 block text-2xl">{counts.draft}</strong>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Observe</p>
            <strong className="mt-2 block text-2xl">{counts.observe}</strong>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Skip</p>
            <strong className="mt-2 block text-2xl">{counts.skip}</strong>
          </article>
        </section>

        <div className="mb-5 rounded-lg border border-violet-900/70 bg-violet-950/30 px-4 py-3 text-sm text-violet-200">
          {notice}
        </div>

        <section className="grid overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
          <div className="border-b border-slate-800 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-800 px-4 py-4">
              <h2 className="font-semibold">Ranked prospect queue</h2>
              <p className="mt-1 text-xs text-slate-500">
                Stable score ordering with policy checks before drafting.
              </p>
            </div>
            <div>
              {rankedReceipts.map((fit, index) => {
                const prospect = syntheticProspects.find(
                  (item) => item.id === fit.prospectId,
                );
                if (!prospect) return null;

                return (
                  <button
                    key={fit.id}
                    onClick={() => {
                      setSelectedProspectId(fit.prospectId);
                      setSendReceipt(null);
                    }}
                    className={[
                      "grid w-full grid-cols-[44px_1fr_auto] gap-3 border-b border-slate-800 px-4 py-4 text-left transition",
                      selectedProspectId === fit.prospectId
                        ? "bg-slate-900"
                        : "hover:bg-slate-900/60",
                    ].join(" ")}
                  >
                    <div className="grid h-11 w-11 place-items-center rounded-lg border border-slate-700 bg-slate-900 font-mono text-sm">
                      {fit.score}
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
                        <span>#{index + 1}</span>
                        <span>{prospect.platform}</span>
                        <span>{prospect.handle}</span>
                      </div>
                      <strong className="block text-sm">{prospect.contextTitle}</strong>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {prospect.contextBody}
                      </p>
                    </div>
                    <span
                      className={`self-start rounded-md border px-2 py-1 text-[10px] font-semibold uppercase ${decisionTone(fit.decision)}`}
                    >
                      {fit.decision}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5">
            {selectedFit && selectedProspect ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      {selectedProspect.platform} · {selectedProspect.handle}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">
                      {selectedProspect.contextTitle}
                    </h2>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-right">
                    <span className="block text-[10px] uppercase text-slate-500">
                      Fit score
                    </span>
                    <strong className="font-mono text-lg">{selectedFit.score}</strong>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {Object.entries(selectedFit.policyChecks).map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                    >
                      <span className="block text-[10px] uppercase tracking-wide text-slate-500">
                        {key.replace(/([A-Z])/g, " $1")}
                      </span>
                      <strong className={value ? "text-emerald-300" : "text-rose-300"}>
                        {value ? "pass" : "fail"}
                      </strong>
                    </div>
                  ))}
                </div>

                <section className="mt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Evidence
                  </h3>
                  <div className="mt-2 grid gap-2">
                    {selectedProspect.evidence.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-lg border border-slate-800 bg-slate-900/50 p-3"
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] uppercase text-slate-500">
                          <span>{item.kind}</span>
                          <span>{item.id}</span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-300">
                          “{item.text}”
                        </p>
                      </article>
                    ))}
                  </div>
                </section>

                {selectedDraft ? (
                  <section className="mt-5 border-t border-slate-800 pt-5">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">Outreach draft</h3>
                        <p className="text-xs text-slate-500">
                          {selectedDraft.channel.replace("_", " ")} · revision{" "}
                          {selectedDraft.revision}
                        </p>
                      </div>
                      <span
                        className={[
                          "rounded-full border px-2.5 py-1 text-[10px] uppercase",
                          selectedDraft.approval
                            ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                            : "border-slate-700 bg-slate-900 text-slate-400",
                        ].join(" ")}
                      >
                        {selectedDraft.approval
                          ? `approved r${selectedDraft.approval.approvedRevision}`
                          : "not approved"}
                      </span>
                    </div>

                    <textarea
                      value={draftBody}
                      onChange={(event) =>
                        setEditBuffer((current) => ({
                          ...current,
                          [selectedDraft.id]: event.target.value,
                        }))
                      }
                      className="min-h-40 w-full rounded-xl border border-slate-700 bg-[#090d13] p-3 text-sm leading-6 text-slate-200 outline-none focus:border-violet-500"
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      Evidence refs: {selectedDraft.evidenceIds.join(", ")}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={saveRevision}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800"
                      >
                        Save revision
                      </button>
                      <button
                        onClick={approveSelected}
                        disabled={selectedDraft.skipped}
                        className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Approve exact revision
                      </button>
                      <button
                        onClick={skipSelected}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800"
                      >
                        Skip
                      </button>
                      <button
                        onClick={authorizeSelected}
                        className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300"
                      >
                        Authorize exact draft
                      </button>
                    </div>

                    {sendReceipt && (
                      <div
                        className={[
                          "mt-4 rounded-lg border p-3 text-sm",
                          sendReceipt.status === "authorized_simulation"
                            ? "border-emerald-800 bg-emerald-950/30 text-emerald-200"
                            : "border-rose-900 bg-rose-950/30 text-rose-200",
                        ].join(" ")}
                      >
                        <strong className="block">
                          {sendReceipt.status.replace("_", " ")}
                        </strong>
                        <span className="mt-1 block text-xs leading-5 opacity-80">
                          {sendReceipt.reason}
                        </span>
                        <span className="mt-1 block text-xs">
                          providerWrite: {String(sendReceipt.providerWrite)}
                        </span>
                      </div>
                    )}
                  </section>
                ) : (
                  <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
                    No draft is created for this prospect. Decision:{" "}
                    <strong className="text-slate-200">{selectedFit.decision}</strong>.
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400">No synthetic prospect selected.</p>
            )}
          </div>
        </section>

        <footer className="mt-5 text-xs leading-5 text-slate-500">
          This slice demonstrates local deterministic ranking, evidence linkage,
          revision-aware approval, and exact-draft authorization. It does not
          claim live provider writes, spam-safety, revenue impact, deployment,
          or production readiness.
        </footer>
      </div>
    </main>
  );
}
