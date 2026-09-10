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
            OPERATIONS CONTROL PLANE
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Operations</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Bootstrap tenants, verify Postgres, manage products, and inspect the
            audit trail. Phase 2 ingestion controls are available in the
            intelligence workspace.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/intelligence"
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Intelligence ingestion
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Intent Radar
          </Link>
        </div>
      </div>
      <AdminOperations />
    </main>
  );
}
