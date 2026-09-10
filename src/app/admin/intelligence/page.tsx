import Link from "next/link";
import { IntelligenceOperations } from "@/components/intelligence-operations";

export const metadata = {
  title: "Intelligence Ingestion — SignalOS",
};

export default function IntelligenceAdminPage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-violet-400">
            PHASE 2 CONTROL PLANE
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Intelligence ingestion
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Refresh product intelligence, inspect generated search signals, enqueue
            compliant source collection, and review queue and ingestion evidence.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Operations
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Intent Radar
          </Link>
        </div>
      </div>
      <IntelligenceOperations />
    </main>
  );
}
