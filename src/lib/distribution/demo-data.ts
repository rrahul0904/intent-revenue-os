import {
  createFitReceipt,
  rankProspects,
} from "@/lib/distribution/workflow";
import type {
  DistributionAgent,
  FitBreakdown,
  Prospect,
  ProspectEvidence,
  RecommendedTouch,
  DistributionChannel,
  ProspectEligibility,
} from "@/lib/distribution/types";

export const demoDistributionAgent: DistributionAgent = {
  id: "agent_founder_distribution",
  name: "Founder intent agent",
  productName: "SignalOS",
  productUrl: "https://signalos.example",
  idealCustomer:
    "Founders and growth leads who need to find high-intent public conversations without mass outreach",
  proofPoints: [
    "evidence-backed opportunity scoring",
    "review-first outreach",
    "source-linked intent receipts",
  ],
  channels: ["reddit", "x", "linkedin", "email"],
  dailyCap: 20,
  approvalMode: "review_required",
  status: "active",
  revision: 1,
  voice: {
    tone: "concise, useful, peer-to-peer",
    principles: [
      "help before pitching",
      "reference the actual conversation",
      "make uncertainty visible",
    ],
    avoidPhrases: [
      "game changer",
      "guaranteed growth",
      "just circling back",
    ],
  },
};

function prospect(input: {
  id: string;
  channel: DistributionChannel;
  identity: string;
  handle: string;
  community: string;
  title: string;
  context: string;
  sourceUrl: string;
  eligibility: ProspectEligibility;
  eligibilityReason: string;
  recommendedTouch: RecommendedTouch;
  breakdown: FitBreakdown;
  rationale: string;
  evidence: ProspectEvidence[];
}): Prospect {
  return {
    ...input,
    fit: createFitReceipt({
      breakdown: input.breakdown,
      rationale: input.rationale,
      evidence: input.evidence,
      evaluatedAt: "2026-09-30T16:20:00Z",
    }),
  };
}

export const demoProspects: Prospect[] = rankProspects([
  prospect({
    id: "prospect_reddit_01",
    channel: "reddit",
    identity: "Solo SaaS founder",
    handle: "u/quietbuilder",
    community: "r/SaaS",
    title: "How are you finding your first users after launch?",
    context:
      "The founder has a working product but says distribution is taking more time than building and asks for a repeatable way to find relevant conversations.",
    sourceUrl: "https://reddit.com/r/SaaS/example-quietbuilder",
    eligibility: "eligible",
    eligibilityReason: "Established public account; outreach remains review-only.",
    recommendedTouch: "public_reply",
    breakdown: {
      problemMatch: 98,
      personaFit: 96,
      buyingIntent: 82,
      timing: 95,
      trustContext: 88,
      freshness: 100,
    },
    rationale:
      "Direct founder persona, explicit distribution pain, active search for a repeatable workflow, and a fresh public thread where a useful reply is appropriate.",
    evidence: [
      {
        id: "ev_r1",
        label: "explicit pain",
        excerpt:
          "Distribution is taking more time than building and I cannot keep searching every community manually.",
        sourceUrl: "https://reddit.com/r/SaaS/example-quietbuilder",
      },
    ],
  }),
  prospect({
    id: "prospect_linkedin_01",
    channel: "linkedin",
    identity: "Head of Growth",
    handle: "Dana Lee",
    community: "B2B SaaS",
    title: "Outbound replies are down; warm intent is working better",
    context:
      "A growth leader says cold sequences are underperforming and asks what teams are doing to identify warmer intent before outreach.",
    sourceUrl: "https://linkedin.com/posts/example-dana",
    eligibility: "eligible",
    eligibilityReason: "Public professional post with a relevant business question.",
    recommendedTouch: "dm",
    breakdown: {
      problemMatch: 92,
      personaFit: 94,
      buyingIntent: 76,
      timing: 86,
      trustContext: 90,
      freshness: 96,
    },
    rationale:
      "Strong ICP fit and a timely problem statement. A private follow-up can be appropriate after a useful public interaction, but remains human-reviewed.",
    evidence: [
      {
        id: "ev_l1",
        label: "channel shift",
        excerpt:
          "Cold reply rates dropped again. Warm conversations are outperforming our sequences, but finding them is manual.",
        sourceUrl: "https://linkedin.com/posts/example-dana",
      },
    ],
  }),
  prospect({
    id: "prospect_x_01",
    channel: "x",
    identity: "Indie founder",
    handle: "@shipdaily",
    community: "#buildinpublic",
    title: "Launching this week and still unsure where to find users",
    context:
      "A founder is launching this week and asks which communities are worth monitoring without turning the launch into spam.",
    sourceUrl: "https://x.com/shipdaily/status/example",
    eligibility: "eligible",
    eligibilityReason: "Public post; no private action is taken without approval.",
    recommendedTouch: "public_reply",
    breakdown: {
      problemMatch: 94,
      personaFit: 90,
      buyingIntent: 68,
      timing: 100,
      trustContext: 82,
      freshness: 100,
    },
    rationale:
      "Very fresh launch timing and explicit concern about spam make an evidence-backed public reply more appropriate than a cold DM.",
    evidence: [
      {
        id: "ev_x1",
        label: "launch urgency",
        excerpt:
          "I launch Friday. I need distribution, but I do not want to carpet-bomb communities with generic posts.",
        sourceUrl: "https://x.com/shipdaily/status/example",
      },
    ],
  }),
  prospect({
    id: "prospect_reddit_02",
    channel: "reddit",
    identity: "Operations founder",
    handle: "u/processmess",
    community: "r/startups",
    title: "Spreadsheet-based lead research is getting messy",
    context:
      "The founder describes a manual workflow for copying public signals into a spreadsheet and wants a lighter system.",
    sourceUrl: "https://reddit.com/r/startups/example-processmess",
    eligibility: "eligible",
    eligibilityReason: "Established account; direct outreach still requires review.",
    recommendedTouch: "dm",
    breakdown: {
      problemMatch: 89,
      personaFit: 85,
      buyingIntent: 72,
      timing: 78,
      trustContext: 84,
      freshness: 91,
    },
    rationale:
      "High workflow fit with moderate purchase intent. A short permission-based DM is more appropriate than a product-heavy public reply.",
    evidence: [
      {
        id: "ev_r2",
        label: "manual workflow",
        excerpt:
          "I am copying interesting posts into a spreadsheet, then forgetting why I saved half of them.",
        sourceUrl: "https://reddit.com/r/startups/example-processmess",
      },
    ],
  }),
  prospect({
    id: "prospect_reddit_blocked",
    channel: "reddit",
    identity: "Very new account",
    handle: "u/newaccount123",
    community: "r/startups",
    title: "Need users fast",
    context:
      "A one-day-old account posts a generic request for users with almost no contextual history.",
    sourceUrl: "https://reddit.com/r/startups/example-new",
    eligibility: "account_too_new",
    eligibilityReason:
      "Synthetic policy fixture: account age/context is insufficient for private outreach.",
    recommendedTouch: "observe",
    breakdown: {
      problemMatch: 55,
      personaFit: 45,
      buyingIntent: 35,
      timing: 80,
      trustContext: 10,
      freshness: 100,
    },
    rationale:
      "Freshness alone is not enough. Weak identity context and low trust make this an observe-only signal.",
    evidence: [
      {
        id: "ev_r3",
        label: "low context",
        excerpt: "Need users fast. Any ideas?",
        sourceUrl: "https://reddit.com/r/startups/example-new",
      },
    ],
  }),
]);
