import Link from "next/link";
import { AdminOperations } from "@/components/admin-operations";

export const metadata = {
  title: "Operations — SignalOS",
};

export default function AdminPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-violet-400">
            PHASE 1 CONTROL PLANE
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Operations</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Bootstrap the tenant, verify Postgres, create products, and inspect the
            audit trail before live ingestion is enabled.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Back to Intent Radar
        </Link>
      </div>
      <AdminOperations />
    </main>
  );
}
