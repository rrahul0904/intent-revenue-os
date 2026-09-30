import type { Metadata } from "next";
import { DistributionWorkspace } from "@/components/distribution-workspace";

export const metadata: Metadata = {
  title: "Founder Distribution | SignalOS",
  description:
    "Approval-first prospect discovery and outreach review workspace for SignalOS.",
};

export default function DistributionPage() {
  return <DistributionWorkspace />;
}
