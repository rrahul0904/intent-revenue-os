import { calculateLeadScore } from "@/lib/scoring";
import type { Lead, ProductProfile, ScoreBreakdown } from "@/lib/types";

export const demoProduct: ProductProfile = {
  name: "FlowSignal",
  url: "https://flowsignal.example",
  summary: "AI workflow intelligence for small operations teams that are outgrowing spreadsheets.",
  idealCustomer: "Operations leaders at 20-500 person SaaS and services companies",
  pains: ["manual intake", "spreadsheet overload", "missed follow-ups", "poor workflow visibility"],
  buyingSignals: ["looking for a tool", "alternative to", "open to paying", "outgrowing spreadsheets"],
  competitors: ["Airtable", "Notion", "Monday.com"],
};

function lead(input: Omit<Lead, "score"> & { breakdown: ScoreBreakdown }): Lead {
  return { ...input, score: calculateLeadScore(input.breakdown) };
}

export const demoLeads: Lead[] = [
  lead({
    id: "lead_001",
    platform: "reddit",
    community: "r/operations",
    author: "ops_builder",
    title: "Our request spreadsheet is falling apart — what are teams using?",
    body: "We are at roughly 40 requests a week and the spreadsheet workflow is breaking. Open to paying for something simple if it handles intake and follow-up without becoming another huge system.",
    url: "https://reddit.com/r/operations/example-1",
    createdAt: "2026-09-03T22:18:00-04:00",
    status: "new",
    rationale: "Direct problem statement, explicit volume, purchase willingness, and a strong fit with the product's core workflow.",
    evidence: "Open to paying for something simple if it handles intake and follow-up.",
    recommendedAction: "public_reply",
    draftReply: "At that volume, I’d focus less on replacing the spreadsheet with another generic database and more on the intake → ownership → follow-up loop. A lightweight workflow layer can keep the process simple while making every request traceable.",
    breakdown: { problemMatch: 98, buyingIntent: 96, productFit: 94, switchingIntent: 88, urgency: 84, freshness: 100 },
  }),
  lead({
    id: "lead_002",
    platform: "linkedin",
    community: "Operations Leadership",
    author: "Maya Chen",
    title: "Considering alternatives to Monday for customer onboarding",
    body: "We have grown past our current setup and are evaluating a few lighter tools before renewing next month.",
    url: "https://linkedin.com/posts/example-2",
    createdAt: "2026-09-03T20:40:00-04:00",
    status: "new",
    rationale: "Competitor displacement plus a renewal deadline creates a concrete switching window.",
    evidence: "evaluating a few lighter tools before renewing next month",
    recommendedAction: "public_reply",
    draftReply: "The renewal window is a good moment to separate what your team actually needs from the features you accumulated over time. I’d map the onboarding steps, handoffs, and exceptions first, then compare tools against that smaller operating model.",
    breakdown: { problemMatch: 84, buyingIntent: 91, productFit: 88, switchingIntent: 98, urgency: 89, freshness: 96 },
  }),
  lead({
    id: "lead_003",
    platform: "x",
    community: "#buildinpublic",
    author: "@founderloop",
    title: "Need a better way to track partner requests",
    body: "Not sure we need software yet, but our shared doc is getting messy and things are starting to slip.",
    url: "https://x.com/founderloop/status/example-3",
    createdAt: "2026-09-03T18:15:00-04:00",
    status: "new",
    rationale: "Clear pain and relevance, but buying intent is still exploratory.",
    evidence: "our shared doc is getting messy and things are starting to slip",
    recommendedAction: "observe",
    draftReply: "A useful first step is to identify which requests are actually being missed and why. If the issue is ownership or follow-up rather than volume, you may be able to fix the process before adding another tool.",
    breakdown: { problemMatch: 87, buyingIntent: 48, productFit: 79, switchingIntent: 32, urgency: 62, freshness: 90 },
  }),
];
