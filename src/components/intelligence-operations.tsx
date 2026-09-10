"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Workspace = {
  id: string;
  name: string;
  role: string;
};

type Product = {
  id: string;
  name: string;
  url: string;
  status: string;
};

type SourceQuery = {
  id: string;
  queryType: string;
  queryText: string;
  community: string | null;
  priority: number;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
};

type QueueJob = {
  id: string;
  type: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  createdAt: string;
};

type IngestionRun = {
  id: string;
  platform: string;
  status: string;
  candidatesFound: number;
  insertedPosts: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type IntelligencePayload = {
  persistent: boolean;
  sources: {
    reddit: {
      configured: boolean;
      apiEnabled: boolean;
      commercialAccessApproved: boolean;
      hasAccessToken: boolean;
      hasUserAgent: boolean;
    };
  };
  queue: Record<
    "queued" | "running" | "retry" | "succeeded" | "dead_letter",
    number
  >;
  jobs: QueueJob[];
  runs: IngestionRun[];
};

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "Request failed with " + response.status);
  }

  return payload;
}

export function IntelligenceOperations() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [queries, setQueries] = useState<SourceQuery[]>([]);
  const [intel, setIntel] = useState<IntelligencePayload | null>(null);
  const [message, setMessage] = useState("Loading ingestion control plane…");
  const [busyKey, setBusyKey] = useState("");

  const loadWorkspaces = useCallback(async () => {
    try {
      const payload = await jsonFetch<{ data: Workspace[] }>("/api/workspaces");
      setWorkspaces(payload.data);
      setWorkspaceId((current) => current || payload.data[0]?.id || "");
      setMessage(
        payload.data.length > 0
          ? "Workspace loaded."
          : "Create a workspace from the Operations page first.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load workspaces");
    }
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!workspaceId) {
      setProducts([]);
      setProductId("");
      setIntel(null);
      return;
    }

    try {
      const productUrl =
        "/api/products?workspaceId=" + encodeURIComponent(workspaceId);
      const intelUrl =
        "/api/admin/intelligence?workspaceId=" +
        encodeURIComponent(workspaceId);

      const [productPayload, intelligencePayload] = await Promise.all([
        jsonFetch<{ data: Product[] }>(productUrl),
        jsonFetch<IntelligencePayload>(intelUrl),
      ]);

      setProducts(productPayload.data);
      setProductId((current) => {
        if (productPayload.data.some((product) => product.id === current)) {
          return current;
        }
        return productPayload.data[0]?.id || "";
      });
      setIntel(intelligencePayload);
      setMessage("Intelligence control plane refreshed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load intelligence");
    }
  }, [workspaceId]);

  const loadQueries = useCallback(async () => {
    if (!productId) {
      setQueries([]);
      return;
    }

    try {
      const payload = await jsonFetch<{ data: SourceQuery[] }>(
        "/api/products/" + productId + "/queries",
      );
      setQueries(payload.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load queries");
    }
  }, [productId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadWorkspaces();
    });
    return () => {
      cancelled = true;
    };
  }, [loadWorkspaces]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadWorkspace();
    });
    return () => {
      cancelled = true;
    };
  }, [loadWorkspace]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadQueries();
    });
    return () => {
      cancelled = true;
    };
  }, [loadQueries]);

  async function refreshEverything() {
    await loadWorkspace();
    await loadQueries();
  }

  async function discoverProduct() {
    if (!productId) return;
    setBusyKey("discover");
    try {
      const payload = await jsonFetch<{
        data: { jobId: string; created: boolean; status: string };
      }>("/api/products/" + productId + "/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      setMessage(
        "Website intelligence job " +
          payload.data.jobId.slice(0, 8) +
          " queued. The worker will persist the snapshot and regenerate signals.",
      );
      await loadWorkspace();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to queue discovery");
    } finally {
      setBusyKey("");
    }
  }

  async function runQuery(queryId: string) {
    setBusyKey(queryId);
    try {
      const payload = await jsonFetch<{
        data: { jobId: string; created: boolean; status: string };
      }>("/api/ingestion/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queryId, force: true }),
      });
      setMessage(
        "Source ingestion job " +
          payload.data.jobId.slice(0, 8) +
          " queued.",
      );
      await loadWorkspace();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to queue ingestion");
    } finally {
      setBusyKey("");
    }
  }

  const queueCards = useMemo(
    () => [
      ["Queued", intel?.queue.queued ?? 0],
      ["Running", intel?.queue.running ?? 0],
      ["Retry", intel?.queue.retry ?? 0],
      ["Dead letter", intel?.queue.dead_letter ?? 0],
    ],
    [intel],
  );

  const reddit = intel?.sources.reddit;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-sm text-slate-300">{message}</p>
        <button
          onClick={refreshEverything}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200"
        >
          Refresh
        </button>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        {queueCards.map(([label, value]) => (
          <article key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <strong className="mt-2 block font-mono text-2xl">{value}</strong>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
        <div className="grid content-start gap-5">
          <article className="rounded-xl border border-slate-800 bg-slate-950 p-5">
            <h2 className="font-semibold">Scope</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-xs text-slate-500">
                Workspace
                <select
                  value={workspaceId}
                  onChange={(event) => setWorkspaceId(event.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                >
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-xs text-slate-500">
                Product
                <select
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · {product.status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              onClick={discoverProduct}
              disabled={!productId || busyKey === "discover"}
              className="mt-4 w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Refresh website intelligence
            </button>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-950 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Reddit connector</h2>
              <span
                className={
                  "rounded px-2 py-1 text-[10px] font-semibold uppercase " +
                  (reddit?.configured
                    ? "bg-emerald-950 text-emerald-400"
                    : "bg-amber-950 text-amber-400")
                }
              >
                {reddit?.configured ? "ready" : "disabled"}
              </span>
            </div>
            <div className="mt-4 grid gap-2 text-xs text-slate-400">
              <p>API enabled: {reddit?.apiEnabled ? "yes" : "no"}</p>
              <p>
                Commercial access approved:{" "}
                {reddit?.commercialAccessApproved ? "yes" : "no"}
              </p>
              <p>Access token present: {reddit?.hasAccessToken ? "yes" : "no"}</p>
              <p>User agent present: {reddit?.hasUserAgent ? "yes" : "no"}</p>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-slate-600">
              The worker does not fall back to anonymous scraping. Source jobs remain
              disabled until the deployment explicitly enables approved Reddit API
              access.
            </p>
          </article>
        </div>

        <article className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold">Generated intent queries</h2>
              <p className="mt-1 text-xs text-slate-500">
                Deterministic Phase 2 signals generated from the persisted website snapshot.
              </p>
            </div>
            <span className="font-mono text-xs text-slate-500">
              {queries.length} queries
            </span>
          </div>

          <div className="mt-5 grid gap-2">
            {queries.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-800 p-5 text-sm text-slate-500">
                No generated queries yet. Queue a website intelligence refresh and let
                the worker process it.
              </p>
            ) : (
              queries.map((query) => (
                <div
                  key={query.id}
                  className="grid gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded bg-slate-800 px-2 py-1 text-[10px] uppercase text-slate-400">
                        {query.queryType}
                      </span>
                      <span className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-400">
                        priority {query.priority}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200">{query.queryText}</p>
                    <p className="mt-2 text-[10px] text-slate-600">
                      Last run:{" "}
                      {query.lastRunAt
                        ? new Date(query.lastRunAt).toLocaleString()
                        : "never"}
                    </p>
                  </div>
                  <button
                    onClick={() => runQuery(query.id)}
                    disabled={!reddit?.configured || busyKey === query.id}
                    className="self-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40"
                  >
                    Run now
                  </button>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <h2 className="font-semibold">Recent queue jobs</h2>
          <div className="mt-4 grid gap-2">
            {(intel?.jobs ?? []).slice(0, 12).map((job) => (
              <div
                key={job.id}
                className="rounded-lg border border-slate-800 bg-slate-900/50 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-xs">{job.type}</strong>
                  <span className="font-mono text-[10px] text-slate-500">
                    {job.status}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-600">
                  attempts {job.attempts}/{job.maxAttempts} ·{" "}
                  {new Date(job.createdAt).toLocaleString()}
                </p>
                {job.lastError && (
                  <p className="mt-2 line-clamp-2 text-[11px] text-rose-400">
                    {job.lastError}
                  </p>
                )}
              </div>
            ))}
            {(intel?.jobs.length ?? 0) === 0 && (
              <p className="text-sm text-slate-500">No jobs have been queued yet.</p>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <h2 className="font-semibold">Recent ingestion runs</h2>
          <div className="mt-4 grid gap-2">
            {(intel?.runs ?? []).slice(0, 12).map((run) => (
              <div
                key={run.id}
                className="rounded-lg border border-slate-800 bg-slate-900/50 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-xs uppercase">{run.platform}</strong>
                  <span className="font-mono text-[10px] text-slate-500">
                    {run.status}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-600">
                  candidates {run.candidatesFound} · inserted {run.insertedPosts} ·{" "}
                  {new Date(run.createdAt).toLocaleString()}
                </p>
                {run.errorMessage && (
                  <p className="mt-2 line-clamp-2 text-[11px] text-rose-400">
                    {run.errorCode}: {run.errorMessage}
                  </p>
                )}
              </div>
            ))}
            {(intel?.runs.length ?? 0) === 0 && (
              <p className="text-sm text-slate-500">No source runs recorded yet.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
