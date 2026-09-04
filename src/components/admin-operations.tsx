"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member";
};

type Product = {
  id: string;
  name: string;
  url: string;
  status: "draft" | "active" | "paused";
};

type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
};

type Health = {
  status: string;
  database: {
    configured: boolean;
    reachable: boolean;
    latencyMs?: number;
  };
  auth: {
    mode: string;
    actor: string;
  };
  summary: {
    workspaces: number;
    products: number;
    leads: number;
    auditEvents: number;
  };
};

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "Request failed with " + response.status);
  }

  return payload;
}

export function AdminOperations() {
  const [health, setHealth] = useState<Health | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [message, setMessage] = useState("Loading persistent control plane…");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [healthPayload, workspacePayload] = await Promise.all([
        jsonFetch<Health>("/api/admin/health"),
        jsonFetch<{ data: Workspace[] }>("/api/workspaces"),
      ]);

      setHealth(healthPayload);
      setWorkspaces(workspacePayload.data);

      const selectedId = workspaceId || workspacePayload.data[0]?.id || "";
      setWorkspaceId(selectedId);

      if (selectedId) {
        const productUrlApi =
          "/api/products?workspaceId=" + encodeURIComponent(selectedId);
        const auditUrlApi =
          "/api/admin/audit?workspaceId=" +
          encodeURIComponent(selectedId) +
          "&limit=20";

        const [productPayload, auditPayload] = await Promise.all([
          jsonFetch<{ data: Product[] }>(productUrlApi),
          jsonFetch<{ data: AuditEvent[] }>(auditUrlApi),
        ]);

        setProducts(productPayload.data);
        setAudit(auditPayload.data);
      } else {
        setProducts([]);
        setAudit([]);
      }

      setMessage(
        healthPayload.database.configured
          ? "Persistent control plane connected."
          : "DATABASE_URL is not configured. Start with Docker Compose or provide Postgres.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load operations");
    }
  }, [workspaceId]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void refresh();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function bootstrap() {
    setBusy(true);
    try {
      await jsonFetch("/api/bootstrap", { method: "POST" });
      setMessage("Workspace initialized.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bootstrap failed");
    } finally {
      setBusy(false);
    }
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId || !productUrl.trim()) return;

    setBusy(true);
    try {
      await jsonFetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, url: productUrl.trim() }),
      });
      setProductUrl("");
      setMessage("Product persisted with a version-1 intelligence profile.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create product");
    } finally {
      setBusy(false);
    }
  }

  const metrics: Array<[string, number]> = [
    ["Workspaces", health?.summary.workspaces ?? 0],
    ["Products", health?.summary.products ?? 0],
    ["Leads", health?.summary.leads ?? 0],
    ["Audit events", health?.summary.auditEvents ?? 0],
  ];

  return (
    <div className="grid gap-5">
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
        {message}
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        {metrics.map(([label, value]) => (
          <article key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <strong className="mt-2 block font-mono text-2xl">{value}</strong>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Tenant bootstrap</h2>
              <p className="mt-1 text-xs text-slate-500">
                Auth: {health?.auth.mode ?? "unknown"} · DB latency:{" "}
                {health?.database.latencyMs ?? "—"} ms
              </p>
            </div>
            {workspaces.length === 0 && (
              <button
                onClick={bootstrap}
                disabled={busy}
                className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Initialize workspace
              </button>
            )}
          </div>

          {workspaces.length > 0 ? (
            <>
              <label className="mb-2 block text-xs text-slate-500">Workspace</label>
              <select
                value={workspaceId}
                onChange={(event) => setWorkspaceId(event.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} · {workspace.role}
                  </option>
                ))}
              </select>

              <form onSubmit={createProduct} className="mt-5">
                <label className="mb-2 block text-xs text-slate-500">Add product URL</label>
                <div className="flex gap-2">
                  <input
                    value={productUrl}
                    onChange={(event) => setProductUrl(event.target.value)}
                    placeholder="https://yourproduct.com"
                    className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-violet-500"
                  />
                  <button
                    disabled={busy}
                    className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"
                  >
                    Persist
                  </button>
                </div>
              </form>

              <div className="mt-5 grid gap-2">
                {products.length === 0 ? (
                  <p className="text-sm text-slate-500">No persisted products yet.</p>
                ) : (
                  products.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-sm">{product.name}</strong>
                        <span className="rounded bg-slate-800 px-2 py-1 text-[10px] uppercase text-slate-400">
                          {product.status}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">{product.url}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Initialize the first workspace to begin persistent product onboarding.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <h2 className="font-semibold">Audit trail</h2>
          <p className="mt-1 text-xs text-slate-500">
            Tenant-scoped state changes recorded by the server.
          </p>
          <div className="mt-5 grid gap-2">
            {audit.length === 0 ? (
              <p className="text-sm text-slate-500">No audit events yet.</p>
            ) : (
              audit.map((event) => (
                <div
                  key={event.id}
                  className="grid grid-cols-[1fr_auto] gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-3"
                >
                  <div>
                    <strong className="text-xs">{event.action}</strong>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {event.entityType}
                      {event.entityId ? " · " + event.entityId.slice(0, 8) : ""}
                    </p>
                  </div>
                  <time className="text-[10px] text-slate-600">
                    {new Date(event.createdAt).toLocaleString()}
                  </time>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
