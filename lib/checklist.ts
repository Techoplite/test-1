import { percentChange, type DaySignal } from "@/lib/signals";

export const CHECKLIST_TOTAL = 21;
export const CHECKLIST_STORAGE_KEY = "decision-matrix-v1";

export type ScoreValue = 1 | 0 | -1;

export type ChecklistItem = {
  id: string;
  badge: string;
  title: string;
  record: string;
  question: string;
};

export type ChecklistSection = {
  id: string;
  title: string;
  tone: "tone-1" | "tone-2" | "tone-3" | "tone-4" | "tone-5";
  items: ChecklistItem[];
};

export const CHECKLIST: ChecklistSection[] = [
  {
    id: "macro",
    title: "1) Macro Fundamental",
    tone: "tone-1",
    items: [
      {
        id: "s1A",
        badge: "A",
        title: "Interest Rate Sentiment",
        record:
          "Most recent interest rate change (cut/hike + date) and next-month rate sentiment based on FedWatch data.",
        question: "How cheap is it to borrow money now and next month?",
      },
      {
        id: "s1B",
        badge: "B",
        title: "Inflation — CPI & PPI",
        record:
          "CPI and PPI MoM, including data releases for the current and next month.",
        question: "Is the economy growing, and so is the cost of goods?",
      },
      {
        id: "s1C",
        badge: "C",
        title: "Building Permits",
        record:
          "Building permits MoM, including data releases for the current and next month.",
        question:
          "Is the economy growing, and so the housing market and investor/consumer spending?",
      },
      {
        id: "s1D",
        badge: "D",
        title: "Unemployment",
        record:
          "Unemployment MoM, including data releases for the current and next month.",
        question: "Is the workforce needed now and in the next month?",
      },
      {
        id: "s1E",
        badge: "E",
        title: "10-Yr Bonds Trend",
        record:
          "3-month, 1-month and 1-week chart trend with % change for each timeframe, plus a small price chart visual.",
        question:
          "How risky is it to invest in risk-averse assets, and how healthy is the current and future overall market?",
      },
      {
        id: "s1F",
        badge: "F",
        title: "USD Trend",
        record:
          "3-month, 1-month and 1-week chart trend with % change for each timeframe, plus a small price chart visual.",
        question:
          "How cheap is it to buy/sell goods, and how much money is available in the economy?",
      },
      {
        id: "s1G",
        badge: "G",
        title: "Oil Trend",
        record:
          "3-month, 1-month and 1-week chart trend with % change for each timeframe, plus a small price chart visual.",
        question: "Is there any energy shock driving inflation up?",
      },
      {
        id: "s1H",
        badge: "H",
        title: "Gold Trend",
        record:
          "3-month, 1-month and 1-week chart trend with % change for each timeframe, plus a small price chart visual.",
        question:
          "How risky do investors feel the market is, versus storing wealth in a safe-haven asset that pays no dividend or interest?",
      },
    ],
  },
  {
    id: "asset",
    title: "2) Asset Fundamental",
    tone: "tone-2",
    items: [
      {
        id: "s2A",
        badge: "A",
        title: "Substantial Holders Filings",
        record:
          "Forms 603, 604, 605 and Change of Director's Interest Notice — include date/time of release, entity name, share size and voting power.",
        question: "Who is putting money on the line, and how much?",
      },
      {
        id: "s2B",
        badge: "B",
        title: "Sensitive News",
        record:
          "Progress reports, periodic reports, contract awards, results/reporting date notifications, plus one short plain-English paragraph on the most recent investor webinar or call.",
        question: "Is there any critical backdrop to know that may affect the price?",
      },
      {
        id: "s2C",
        badge: "C",
        title: "Statement & Earning",
        record:
          "Most recent Revenue and Earnings figures (Estimate, Reported, and Surprise).",
        question: "Is there a potential PEAD edge for the next 90 days?",
      },
    ],
  },
  {
    id: "rotation",
    title: "3) Market Rotation",
    tone: "tone-3",
    items: [
      {
        id: "s3A",
        badge: "A",
        title: "Rotation Quadrants",
        record:
          "Market Rotation graph from relativestrength.com.au — list indices that are Leading, Weakening, Lagging, Improving across the 4 quadrants.",
        question:
          "Current overall performance of each sector vs the benchmark? Where is capital allocation leading, weakening, lagging, improving?",
      },
      {
        id: "s3B",
        badge: "B",
        title: "Market Breadth",
        record:
          "GICS Industry Groups Market Breadth from relativestrength.com.au — list themes currently Weak, Neutral, Strong.",
        question:
          "How strong is momentum within a sector? Are institutions accumulating/distributing in oversold/overbought territories with weak/strong momentum?",
      },
    ],
  },
  {
    id: "technical",
    title: "4) Asset Technical",
    tone: "tone-4",
    items: [
      {
        id: "s4A",
        badge: "A",
        title: "Supply & Demand",
        record: "Chart zones, imbalances and institutional footprint.",
        question:
          "Where and when have institutions bought or sold their inventories? Are imbalances visible to identify institutional activity? Do they match Notices of Substantial Holders?",
      },
      {
        id: "s4B",
        badge: "B",
        title: "Big Brother + Small Brother",
        record: "HTF zone vs LTF imbalance alignment.",
        question:
          "Is there a LTF demand/supply imbalance within an HTF imbalance demand/supply zone?",
      },
      {
        id: "s4C",
        badge: "C",
        title: "Zone Freshness & Originality",
        record: "How many times the zone has been tested / mitigated.",
        question: "What is the quality of the imbalance? High quality or low quality?",
      },
      {
        id: "s4D",
        badge: "D",
        title: "Volume Profile / VSA",
        record: "Volume profile, CVD and delta vs price action.",
        question:
          "Is there any visible divergence between price action and aggressive/passive order execution? CVD divergence? Delta volume diverges with price? What's the relationship between volume and price action?",
      },
    ],
  },
  {
    id: "risk",
    title: "5) Risk Management",
    tone: "tone-5",
    items: [
      {
        id: "s5A",
        badge: "A",
        title: "Risk-to-Reward Ratio",
        record: "Minimum 1:2, preferred 1:3, excellent 1:4, exceptional above 1:5.",
        question: "Is the risk worth the investment?",
      },
      {
        id: "s5B",
        badge: "B",
        title: "Diversification",
        record: "Sector/theme exposure already owned.",
        question:
          "What is my risk of ruin based on this decision? How much of this sector/theme do I already own?",
      },
      {
        id: "s5C",
        badge: "C",
        title: "Position Sizing",
        record: "Risk unit = 0.25% of portfolio.",
        question: "What is my risk of drawdown based on this decision?",
      },
      {
        id: "s5D",
        badge: "D",
        title: "Position Management",
        record:
          "Plan to cap potential loss to a minimum and benefit most from the investment's profit potential.",
        question:
          "How can I cap my potential loss to a minimum and benefit the most from this investment's potential profit?",
      },
    ],
  },
];

export type ChecklistDraft = {
  assetName: string;
  scores: Partial<Record<string, ScoreValue>>;
  notes: Partial<Record<string, string>>;
};

export type VerdictTone = "none" | "progress" | "good" | "mid" | "bad";

export type ChecklistTally = {
  positive: number;
  neutral: number;
  negative: number;
  marked: number;
  net: number;
  text: string;
  tone: VerdictTone;
};

const EMPTY_DRAFT: ChecklistDraft = { assetName: "", scores: {}, notes: {} };

function isScore(value: unknown): value is ScoreValue {
  return value === 1 || value === 0 || value === -1;
}

export function parseDraft(raw: string | null): ChecklistDraft {
  if (!raw) return EMPTY_DRAFT;
  try {
    const data = JSON.parse(raw) as Partial<ChecklistDraft>;
    const scores: ChecklistDraft["scores"] = {};
    if (data.scores && typeof data.scores === "object") {
      for (const [id, value] of Object.entries(data.scores)) {
        if (isScore(value)) scores[id] = value;
      }
    }
    const notes: ChecklistDraft["notes"] = {};
    if (data.notes && typeof data.notes === "object") {
      for (const [id, value] of Object.entries(data.notes)) {
        if (typeof value === "string") notes[id] = value;
      }
    }
    return {
      assetName: typeof data.assetName === "string" ? data.assetName : "",
      scores,
      notes,
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function tallyScores(
  scores: Partial<Record<string, ScoreValue>>
): ChecklistTally {
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  for (const value of Object.values(scores)) {
    if (value === 1) positive += 1;
    else if (value === 0) neutral += 1;
    else if (value === -1) negative += 1;
  }
  const marked = positive + neutral + negative;
  const net = positive - negative;
  if (marked === 0) {
    return {
      positive,
      neutral,
      negative,
      marked,
      net,
      text: "Not assessed yet",
      tone: "none",
    };
  }
  if (marked < CHECKLIST_TOTAL) {
    const left = CHECKLIST_TOTAL - marked;
    return {
      positive,
      neutral,
      negative,
      marked,
      net,
      text: `In progress — ${left} item${left === 1 ? "" : "s"} left`,
      tone: "progress",
    };
  }
  if (net >= 8) {
    return {
      positive,
      neutral,
      negative,
      marked,
      net,
      text: `STRONG CASE — score +${net}`,
      tone: "good",
    };
  }
  if (net >= 2) {
    return {
      positive,
      neutral,
      negative,
      marked,
      net,
      text: `LEAN POSITIVE — score +${net}`,
      tone: "good",
    };
  }
  if (net >= -2) {
    return {
      positive,
      neutral,
      negative,
      marked,
      net,
      text: `MIXED / STAND ASIDE — score ${net}`,
      tone: "mid",
    };
  }
  return {
    positive,
    neutral,
    negative,
    marked,
    net,
    text: `LEAN NEGATIVE — score ${net}`,
    tone: "bad",
  };
}

/** Percent change from `sessionsBack` trading days ago to the latest close. */
export function lookbackChange(
  history: DaySignal[],
  sessionsBack: number
): number | null {
  if (sessionsBack < 1 || history.length <= sessionsBack) return null;
  const last = history[history.length - 1];
  const base = history[history.length - 1 - sessionsBack];
  return percentChange(last.close, base.close);
}
