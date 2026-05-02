import type { Transaction } from "./parseTransactions";

// ─── Types ─────────────────────────────────────────────────────────────────

export type RiskLevel = "high_risk" | "risky" | "low_risk" | "safe";

export type ScoredTransaction = Transaction & {
  score: number;        // 0–100, higher = more suspicious
  riskLevel: RiskLevel;
  flags: string[];      // human-readable reasons that contributed to the score
};

export type RiskGroups = {
  high_risk: ScoredTransaction[]; // score 76–100
  risky:     ScoredTransaction[]; // score 51–75
  low_risk:  ScoredTransaction[]; // score 26–50
  safe:      ScoredTransaction[]; // score  0–25
};

// ─── Config ────────────────────────────────────────────────────────────────

/**
 * Countries considered high-risk for fraud based on common compliance
 * watch-lists (FATF high-risk / grey-list jurisdictions).
 */
const HIGH_RISK_COUNTRIES = new Set([
  "AF", "AFGHANISTAN",
  "KP", "NORTH KOREA",
  "IR", "IRAN",
  "YE", "YEMEN",
  "MM", "MYANMAR",
  "LY", "LIBYA",
  "SS", "SOUTH SUDAN",
  "SY", "SYRIA",
  "SO", "SOMALIA",
  "VE", "VENEZUELA",
  "CU", "CUBA",
  "SD", "SUDAN",
  "BY", "BELARUS",
  "RU", "RUSSIA",
  "NG", "NIGERIA",
  "PK", "PAKISTAN",
]);

const MEDIUM_RISK_COUNTRIES = new Set([
  "CN", "CHINA",
  "UA", "UKRAINE",
  "MX", "MEXICO",
  "PH", "PHILIPPINES",
  "TH", "THAILAND",
  "EG", "EGYPT",
  "MA", "MOROCCO",
  "ID", "INDONESIA",
]);

/** Transactions above this amount get progressively higher scores. */
const LARGE_AMOUNT_THRESHOLD = 10_000;
const VERY_LARGE_AMOUNT_THRESHOLD = 50_000;

/** Structuring: transactions just under round-number thresholds (e.g. $9,999) */
const STRUCTURING_THRESHOLDS = [10_000, 5_000, 3_000, 1_000];
const STRUCTURING_TOLERANCE = 0.05; // within 5% below the threshold

/** Off-hours window considered suspicious (midnight–5 AM local) */
const OFF_HOURS_START = 0;
const OFF_HOURS_END = 5;

/** Any name matching one of these words scores +10 per matched keyword. */
const SUSPICIOUS_NAME_KEYWORDS = [
  "shell", "offshore", "nominee", "holdings", "anonymous", "anon",
  "unknown", "undisclosed", "cash", "misc", "bitcoin", "btc",
  "ethereum", "crypto", "wallet", "monero", "usdt", "casino",
  "betting", "gambling", "lottery", "hawala", "remittance", "forex",
  "payday", "cartel", "narco", "urgent", "rush",
];

// ─── Scoring rules ─────────────────────────────────────────────────────────

type Rule = (tx: Transaction, allTx: Transaction[]) => { points: number; flag: string } | null;

const rules: Rule[] = [

  // 1. Negative or zero amount
  (tx) => {
    if (tx.amount !== null && tx.amount <= 0) {
      return { points: 20, flag: "Non-positive amount (reversal or zero-value transaction)" };
    }
    return null;
  },

  // 2. Missing amount
  (tx) => {
    if (tx.amount === null) {
      return { points: 30, flag: "Amount could not be parsed" };
    }
    return null;
  },

  // 3. Very large transaction
  (tx) => {
    if (tx.amount !== null && tx.amount >= VERY_LARGE_AMOUNT_THRESHOLD) {
      return { points: 35, flag: `Very large transaction (≥ $${VERY_LARGE_AMOUNT_THRESHOLD.toLocaleString()})` };
    }
    if (tx.amount !== null && tx.amount >= LARGE_AMOUNT_THRESHOLD) {
      return { points: 20, flag: `Large transaction (≥ $${LARGE_AMOUNT_THRESHOLD.toLocaleString()})` };
    }
    return null;
  },

  // 4. Structuring — amount just below a known reporting threshold
  (tx) => {
    if (tx.amount === null || tx.amount <= 0) return null;
    for (const threshold of STRUCTURING_THRESHOLDS) {
      const lower = threshold * (1 - STRUCTURING_TOLERANCE);
      if (tx.amount >= lower && tx.amount < threshold) {
        return {
          points: 25,
          flag: `Possible structuring — amount ($${tx.amount.toFixed(2)}) just below $${threshold.toLocaleString()}`,
        };
      }
    }
    return null;
  },

  // 5. High-risk country
  (tx) => {
    const c = tx.country.trim().toUpperCase();
    if (HIGH_RISK_COUNTRIES.has(c)) {
      return { points: 35, flag: `High-risk country: ${tx.country}` };
    }
    return null;
  },

  // 6. Medium-risk country
  (tx) => {
    const c = tx.country.trim().toUpperCase();
    if (!HIGH_RISK_COUNTRIES.has(c) && MEDIUM_RISK_COUNTRIES.has(c)) {
      return { points: 15, flag: `Elevated-risk country: ${tx.country}` };
    }
    return null;
  },

  // 7. Missing or unparseable date
  (tx) => {
    if (!tx.dateTime) {
      return { points: 15, flag: "Missing or invalid transaction date" };
    }
    return null;
  },

  // 8. Off-hours transaction (midnight–5 AM)
  (tx) => {
    if (!tx.dateTime) return null;
    const hour = tx.dateTime.getHours();
    if (hour >= OFF_HOURS_START && hour < OFF_HOURS_END) {
      return { points: 15, flag: `Off-hours transaction (${tx.dateTime.toLocaleTimeString()})` };
    }
    return null;
  },

  // 9. Duplicate transactionID within the batch
  (tx, allTx) => {
    const dupes = allTx.filter((t) => t.transactionID === tx.transactionID);
    if (dupes.length > 1) {
      return { points: 40, flag: `Duplicate transactionID: ${tx.transactionID}` };
    }
    return null;
  },

  // 10. Same name appears in many transactions (velocity check)
  (tx, allTx) => {
    const count = allTx.filter(
      (t) => t.name.trim().toLowerCase() === tx.name.trim().toLowerCase()
    ).length;
    if (count >= 10) {
      return { points: 20, flag: `High transaction velocity — name "${tx.name}" appears ${count} times` };
    }
    if (count >= 5) {
      return { points: 10, flag: `Moderate transaction velocity — name "${tx.name}" appears ${count} times` };
    }
    return null;
  },

  // 11. Suspiciously round amount (exactly divisible by 1000, over $5k)
  (tx) => {
    if (tx.amount !== null && tx.amount >= 5_000 && tx.amount % 1_000 === 0) {
      return { points: 10, flag: `Suspiciously round amount: $${tx.amount.toLocaleString()}` };
    }
    return null;
  },

  // 12. Missing name
  (tx) => {
    if (!tx.name || tx.name.trim() === "") {
      return { points: 20, flag: "Missing transaction name / counterparty" };
    }
    return null;
  },

  // 13. Suspicious keywords in name (+10 per matched keyword)
  (tx) => {
    if (!tx.name) return null;
    const hit = SUSPICIOUS_NAME_KEYWORDS.filter((kw) =>
      new RegExp(`\\b${kw}\\b`, "i").test(tx.name)
    );
    if (hit.length === 0) return null;
    return {
      points: hit.length * 10,
      flag: `Suspicious name keyword(s): ${hit.join(", ")}`,
    };
  },
];

// ─── Scorer ────────────────────────────────────────────────────────────────

function scoreTransaction(tx: Transaction, allTx: Transaction[]): ScoredTransaction {
  let total = 0;
  const flags: string[] = [];

  for (const rule of rules) {
    const result = rule(tx, allTx);
    if (result) {
      total += result.points;
      flags.push(result.flag);
    }
  }

  // Clamp to 0–100
  const score = Math.min(100, Math.max(0, total));

  const riskLevel: RiskLevel =
    score >= 76 ? "high_risk" :
    score >= 51 ? "risky" :
    score >= 26 ? "low_risk" :
                  "safe";

  return { ...tx, score, riskLevel, flags };
}

// ─── Main export ───────────────────────────────────────────────────────────

/**
 * Scores every transaction and groups them by risk level.
 *
 * @param transactions  Output of parseTransactionFile / parseTransactionCSV
 * @returns             RiskGroups — four collections ready for display
 */
export function scoreAndGroup(transactions: Transaction[]): RiskGroups {
  const scored = transactions.map((tx) => scoreTransaction(tx, transactions));

  return {
    high_risk: scored.filter((t) => t.riskLevel === "high_risk"),
    risky:     scored.filter((t) => t.riskLevel === "risky"),
    low_risk:  scored.filter((t) => t.riskLevel === "low_risk"),
    safe:      scored.filter((t) => t.riskLevel === "safe"),
  };
}