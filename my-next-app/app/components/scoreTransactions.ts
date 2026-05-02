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

// ─── Business Health Dashboard Types ──────────────────────────────────────

export type BusinessHealthMetrics = {
  revenuePatterns: {
    totalRevenue: number;
    averageTransaction: number;
    revenueTrend: 'increasing' | 'decreasing' | 'stable';
    seasonalPatterns: string[];
  };
  expenseAnalysis: {
    totalExpenses: number;
    expenseCategories: Record<string, number>;
    unusualExpenses: Array<{
      category: string;
      amount: number;
      percentageAboveNormal: number;
      period: string;
    }>;
  };
  cashFlowRisk: {
    riskLevel: 'low' | 'medium' | 'high';
    riskScore: number;
    predictions: string[];
    recommendations: string[];
  };
  supplierAnalysis: {
    topSuppliers: Array<{
      name: string;
      totalSpent: number;
      transactionCount: number;
      reliabilityScore: number;
      paymentPattern: 'reliable' | 'irregular' | 'late';
    }>;
  };
};

// ─── Risk Prediction Engine Types ─────────────────────────────────────────

export type RiskPrediction = {
  vendorPredictions: Array<{
    vendorName: string;
    expectedTransactions: number;
    confidence: number;
    timeFrame: string;
    reasoning: string;
  }>;
  customerInsights: Array<{
    customerName: string;
    paymentPattern: 'reliable' | 'usually_late' | 'irregular';
    averageDelay: number;
    riskFlags: string[];
  }>;
  patternAlerts: Array<{
    type: 'seasonal' | 'vendor' | 'amount' | 'frequency';
    message: string;
    severity: 'low' | 'medium' | 'high';
    confidence: number;
  }>;
};

// ─── Visual Transaction Stories Types ─────────────────────────────────────

export type TransactionStory = {
  category: string;
  totalAmount: number;
  transactionCount: number;
  timeSpan: string;
  narrative: string;
  insights: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
};

export type VisualAnalytics = {
  stories: TransactionStory[];
  trendData: Array<{
    period: string;
    revenue: number;
    expenses: number;
    riskScore: number;
    transactionCount: number;
  }>;
  categoryBreakdown: Record<string, {
    amount: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
    riskContribution: number;
  }>;
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

  // 14. High-frequency transactions from same person within short time period
  (tx, allTx) => {
    if (!tx.dateTime || !tx.name) return null;
    
    // Get all transactions from this person
    const personTxs = allTx.filter(
      (t) => t.name.trim().toLowerCase() === tx.name.trim().toLowerCase() && t.dateTime
    ).sort((a, b) => a.dateTime!.getTime() - b.dateTime!.getTime());
    
    if (personTxs.length < 3) return null;
    
    // Check for any 3 transactions within 7 days
    for (let i = 0; i <= personTxs.length - 3; i++) {
      const windowStart = personTxs[i].dateTime!;
      const windowEnd = new Date(windowStart.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later
      
      let countInWindow = 0;
      for (let j = i; j < personTxs.length; j++) {
        if (personTxs[j].dateTime! <= windowEnd) {
          countInWindow++;
        } else {
          break;
        }
      }
      
      if (countInWindow >= 3) {
        const daysSpan = Math.ceil((personTxs[i + countInWindow - 1].dateTime!.getTime() - windowStart.getTime()) / (24 * 60 * 60 * 1000));
        return {
          points: 25,
          flag: `High-frequency activity: ${countInWindow} transactions in ${daysSpan} days`,
        };
      }
    }
    
    return null;
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

// ─── Business Health Dashboard Functions ──────────────────────────────────

export function analyzeBusinessHealth(transactions: Transaction[]): BusinessHealthMetrics {
  const validTxs = transactions.filter(tx => tx.amount !== null && tx.dateTime);
  
  // Revenue Patterns
  const revenueTxs = validTxs.filter(tx => tx.amount! > 0);
  const totalRevenue = revenueTxs.reduce((sum, tx) => sum + tx.amount!, 0);
  const averageTransaction = totalRevenue / revenueTxs.length || 0;
  
  // Simple trend analysis (comparing first half vs second half)
  const sortedTxs = [...validTxs].sort((a, b) => a.dateTime!.getTime() - b.dateTime!.getTime());
  const midPoint = Math.floor(sortedTxs.length / 2);
  const firstHalf = sortedTxs.slice(0, midPoint);
  const secondHalf = sortedTxs.slice(midPoint);
  const firstHalfAvg = firstHalf.reduce((sum, tx) => sum + (tx.amount || 0), 0) / firstHalf.length || 0;
  const secondHalfAvg = secondHalf.reduce((sum, tx) => sum + (tx.amount || 0), 0) / secondHalf.length || 0;
  const revenueTrend = secondHalfAvg > firstHalfAvg * 1.1 ? 'increasing' : 
                      secondHalfAvg < firstHalfAvg * 0.9 ? 'decreasing' : 'stable';
  
  // Expense Analysis
  const expenseTxs = validTxs.filter(tx => tx.amount! < 0);
  const totalExpenses = Math.abs(expenseTxs.reduce((sum, tx) => sum + tx.amount!, 0));
  
  // Categorize expenses by extracting keywords from names
  const expenseCategories: Record<string, number> = {};
  expenseTxs.forEach(tx => {
    const name = tx.name.toLowerCase();
    let category = 'other';
    if (name.includes('office') || name.includes('supply')) category = 'office_supplies';
    else if (name.includes('marketing') || name.includes('advertis')) category = 'marketing';
    else if (name.includes('software') || name.includes('subscription')) category = 'software';
    else if (name.includes('travel') || name.includes('hotel') || name.includes('flight')) category = 'travel';
    else if (name.includes('salary') || name.includes('payroll')) category = 'payroll';
    else if (name.includes('rent') || name.includes('lease')) category = 'rent';
    else if (name.includes('utility') || name.includes('electric')) category = 'utilities';
    
    expenseCategories[category] = (expenseCategories[category] || 0) + Math.abs(tx.amount!);
  });
  
  // Cash Flow Risk Analysis
  const monthlyCashFlow: Record<string, number> = {};
  validTxs.forEach(tx => {
    const month = tx.dateTime!.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    monthlyCashFlow[month] = (monthlyCashFlow[month] || 0) + (tx.amount || 0);
  });
  
  const cashFlowValues = Object.values(monthlyCashFlow);
  const avgCashFlow = cashFlowValues.reduce((sum, val) => sum + val, 0) / cashFlowValues.length;
  const cashFlowVolatility = Math.sqrt(
    cashFlowValues.reduce((sum, val) => sum + Math.pow(val - avgCashFlow, 2), 0) / cashFlowValues.length
  );
  
  const cashFlowRiskScore = Math.min(100, (cashFlowVolatility / Math.abs(avgCashFlow)) * 50);
  const cashFlowRiskLevel = cashFlowRiskScore > 70 ? 'high' : cashFlowRiskScore > 40 ? 'medium' : 'low';
  
  // Supplier Analysis
  const supplierStats: Record<string, { total: number; count: number; dates: Date[] }> = {};
  expenseTxs.forEach(tx => {
    const supplier = tx.name;
    if (!supplierStats[supplier]) {
      supplierStats[supplier] = { total: 0, count: 0, dates: [] };
    }
    supplierStats[supplier].total += Math.abs(tx.amount!);
    supplierStats[supplier].count += 1;
    supplierStats[supplier].dates.push(tx.dateTime!);
  });
  
  const topSuppliers = Object.entries(supplierStats)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5)
    .map(([name, stats]) => {
      // Calculate reliability based on transaction frequency and consistency
      const avgInterval = stats.dates.length > 1 ? 
        (stats.dates[stats.dates.length - 1].getTime() - stats.dates[0].getTime()) / (stats.dates.length - 1) / (24 * 60 * 60 * 1000) : 0;
      const reliabilityScore = Math.min(100, (stats.count / 12) * 50 + (avgInterval > 0 ? Math.min(50, 30 / avgInterval) : 0));
      
      return {
        name,
        totalSpent: stats.total,
        transactionCount: stats.count,
        reliabilityScore,
        paymentPattern: reliabilityScore > 80 ? 'reliable' : reliabilityScore > 60 ? 'irregular' : 'late' as const
      };
    });
  
  return {
    revenuePatterns: {
      totalRevenue,
      averageTransaction,
      revenueTrend,
      seasonalPatterns: [] // Could be enhanced with more sophisticated seasonal analysis
    },
    expenseAnalysis: {
      totalExpenses,
      expenseCategories,
      unusualExpenses: [] // Could be enhanced with historical comparison
    },
    cashFlowRisk: {
      riskLevel: cashFlowRiskLevel,
      riskScore: cashFlowRiskScore,
      predictions: [
        cashFlowRiskLevel === 'high' ? 'High cash flow volatility detected - consider building cash reserves' : 
        cashFlowRiskLevel === 'medium' ? 'Moderate cash flow fluctuations - monitor closely' :
        'Stable cash flow pattern - good financial health'
      ],
      recommendations: [
        'Maintain 3-6 months of operating expenses in cash reserves',
        'Consider diversifying revenue streams to reduce volatility'
      ]
    },
    supplierAnalysis: {
      topSuppliers
    }
  };
}

// ─── Risk Prediction Engine Functions ─────────────────────────────────────

export function predictFutureRisks(transactions: Transaction[]): RiskPrediction {
  const validTxs = transactions.filter(tx => tx.dateTime);
  
  // Vendor Predictions
  const vendorStats: Record<string, { transactions: Transaction[]; frequency: number }> = {};
  validTxs.forEach(tx => {
    const vendor = tx.name;
    if (!vendorStats[vendor]) {
      vendorStats[vendor] = { transactions: [], frequency: 0 };
    }
    vendorStats[vendor].transactions.push(tx);
  });
  
  // Calculate transaction frequency for each vendor
  Object.values(vendorStats).forEach(stats => {
    if (stats.transactions.length > 1) {
      const sorted = stats.transactions.sort((a, b) => a.dateTime!.getTime() - b.dateTime!.getTime());
      const timeSpan = sorted[sorted.length - 1].dateTime!.getTime() - sorted[0].dateTime!.getTime();
      const days = timeSpan / (24 * 60 * 60 * 1000);
      stats.frequency = stats.transactions.length / (days / 30); // transactions per month
    }
  });
  
  const vendorPredictions = Object.entries(vendorStats)
    .filter(([, stats]) => stats.frequency > 0)
    .sort(([, a], [, b]) => b.frequency - a.frequency)
    .slice(0, 3)
    .map(([vendorName, stats]) => ({
      vendorName,
      expectedTransactions: Math.round(stats.frequency),
      confidence: Math.min(90, stats.transactions.length * 10 + 50),
      timeFrame: 'next month',
      reasoning: `Based on ${stats.transactions.length} transactions over time period`
    }));
  
  // Customer Insights (for positive transactions)
  const customerStats: Record<string, { transactions: Transaction[]; delays: number[] }> = {};
  validTxs.filter(tx => tx.amount! > 0).forEach(tx => {
    const customer = tx.name;
    if (!customerStats[customer]) {
      customerStats[customer] = { transactions: [], delays: [] };
    }
    customerStats[customer].transactions.push(tx);
  });
  
  const customerInsights = Object.entries(customerStats)
    .filter(([, stats]) => stats.transactions.length > 1)
    .map(([customerName, stats]) => {
      const avgDelay = stats.delays.length > 0 ? 
        stats.delays.reduce((sum, delay) => sum + delay, 0) / stats.delays.length : 0;
      
      let paymentPattern: 'reliable' | 'usually_late' | 'irregular' = 'reliable';
      let riskFlags: string[] = [];
      
      if (avgDelay > 30) {
        paymentPattern = 'usually_late';
        riskFlags.push('Frequently pays late');
      } else if (avgDelay > 15) {
        paymentPattern = 'irregular';
        riskFlags.push('Inconsistent payment timing');
      }
      
      return {
        customerName,
        paymentPattern,
        averageDelay: avgDelay,
        riskFlags
      };
    })
    .filter(insight => insight.riskFlags.length > 0)
    .slice(0, 5);
  
  // Pattern Alerts
  const patternAlerts = [];
  
  // Check for seasonal patterns
  const monthlyCounts: Record<string, number> = {};
  validTxs.forEach(tx => {
    const month = tx.dateTime!.getMonth();
    monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
  });
  
  const avgMonthly = Object.values(monthlyCounts).reduce((sum, count) => sum + count, 0) / 12;
  const seasonalMonths = Object.entries(monthlyCounts)
    .filter(([, count]) => count > avgMonthly * 1.5)
    .map(([month]) => parseInt(month));
    
  if (seasonalMonths.length > 0) {
    patternAlerts.push({
      type: 'seasonal' as const,
      message: `Seasonal transaction spike detected in months: ${seasonalMonths.map(m => new Date(2000, m).toLocaleString('default', { month: 'long' })).join(', ')}`,
      severity: 'low' as const,
      confidence: 75
    });
  }
  
  return {
    vendorPredictions,
    customerInsights,
    patternAlerts
  };
}

// ─── Visual Transaction Stories Functions ──────────────────────────────────

export function createTransactionStories(transactions: Transaction[]): VisualAnalytics {
  const validTxs = transactions.filter(tx => tx.amount !== null && tx.dateTime);
  
  // Group transactions by category
  const categoryGroups: Record<string, Transaction[]> = {};
  validTxs.forEach(tx => {
    const name = tx.name.toLowerCase();
    let category = 'other';
    if (name.includes('marketing') || name.includes('advertis') || name.includes('google') || name.includes('facebook')) category = 'marketing';
    else if (name.includes('office') || name.includes('supply') || name.includes('amazon') || name.includes('staples')) category = 'office_supplies';
    else if (name.includes('software') || name.includes('subscription') || name.includes('adobe') || name.includes('microsoft')) category = 'software';
    else if (name.includes('travel') || name.includes('hotel') || name.includes('uber') || name.includes('lyft')) category = 'travel';
    else if (name.includes('salary') || name.includes('payroll') || name.includes('gusto')) category = 'payroll';
    else if (name.includes('rent') || name.includes('lease')) category = 'rent';
    else if (name.includes('utility') || name.includes('electric') || name.includes('internet')) category = 'utilities';
    else if (name.includes('insurance')) category = 'insurance';
    else if (tx.amount! > 0) category = 'revenue';
    
    if (!categoryGroups[category]) categoryGroups[category] = [];
    categoryGroups[category].push(tx);
  });
  
  // Create stories for each category
  const stories: TransactionStory[] = Object.entries(categoryGroups)
    .filter(([, txs]) => txs.length > 0)
    .map(([category, txs]) => {
      const totalAmount = txs.reduce((sum, tx) => sum + Math.abs(tx.amount!), 0);
      const sortedTxs = txs.sort((a, b) => a.dateTime!.getTime() - b.dateTime!.getTime());
      const timeSpan = sortedTxs.length > 1 ? 
        `${sortedTxs[0].dateTime!.toLocaleDateString()} - ${sortedTxs[sortedTxs.length - 1].dateTime!.toLocaleDateString()}` :
        sortedTxs[0].dateTime!.toLocaleDateString();
      
      // Generate narrative based on category
      let narrative = '';
      let insights: string[] = [];
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      let recommendations: string[] = [];
      
      switch (category) {
        case 'marketing':
          narrative = `Your business invested $${totalAmount.toLocaleString()} in marketing across ${txs.length} transactions.`;
          insights = [
            `Average marketing spend: $${(totalAmount / txs.length).toFixed(2)} per transaction`,
            txs.length > 10 ? 'High marketing activity - potential for optimization' : 'Moderate marketing investment'
          ];
          if (totalAmount > 5000) riskLevel = 'medium';
          recommendations = ['Consider tracking ROI for marketing campaigns', 'Explore cost-effective digital marketing options'];
          break;
          
        case 'office_supplies':
          narrative = `Office supplies cost your business $${totalAmount.toLocaleString()} over this period.`;
          insights = [
            `Monthly average: $${(totalAmount / 3).toFixed(2)}`, // Assuming 3 months of data
            totalAmount > 2000 ? 'Above-average office supply spending' : 'Reasonable office supply costs'
          ];
          recommendations = ['Consider bulk purchasing for cost savings', 'Review subscription services'];
          break;
          
        case 'software':
          narrative = `Software and subscriptions totaled $${totalAmount.toLocaleString()}.`;
          insights = [
            `Monthly recurring cost: $${(totalAmount / 3).toFixed(2)}`,
            'Essential for business operations'
          ];
          recommendations = ['Audit unused subscriptions', 'Negotiate better terms with vendors'];
          break;
          
        case 'revenue':
          narrative = `Your business generated $${totalAmount.toLocaleString()} in revenue from ${txs.length} transactions.`;
          insights = [
            `Average transaction value: $${(totalAmount / txs.length).toFixed(2)}`,
            `Revenue trend: ${totalAmount > 10000 ? 'Strong' : 'Moderate'}`
          ];
          riskLevel = 'low';
          recommendations = ['Consider diversifying revenue streams', 'Focus on high-value customers'];
          break;
          
        default:
          narrative = `The "${category}" category accounted for $${totalAmount.toLocaleString()} in ${txs.length} transactions.`;
          insights = [`Monitor this category for unusual patterns`];
          recommendations = ['Categorize transactions more specifically for better insights'];
      }
      
      return {
        category: category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        totalAmount,
        transactionCount: txs.length,
        timeSpan,
        narrative,
        insights,
        riskLevel,
        recommendations
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);
  
  // Generate trend data (monthly)
  const monthlyData: Record<string, { revenue: number; expenses: number; count: number; riskSum: number }> = {};
  validTxs.forEach(tx => {
    const month = tx.dateTime!.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    if (!monthlyData[month]) {
      monthlyData[month] = { revenue: 0, expenses: 0, count: 0, riskSum: 0 };
    }
    monthlyData[month].count += 1;
    if (tx.amount! > 0) {
      monthlyData[month].revenue += tx.amount!;
    } else {
      monthlyData[month].expenses += Math.abs(tx.amount!);
    }
  });
  
  const trendData = Object.entries(monthlyData)
    .sort(([a], [b]) => new Date(a + ' 1').getTime() - new Date(b + ' 1').getTime())
    .map(([period, data]) => ({
      period,
      revenue: data.revenue,
      expenses: data.expenses,
      riskScore: data.riskSum / data.count || 0,
      transactionCount: data.count
    }));
  
  // Category breakdown
  const totalSpending = Object.values(categoryGroups)
    .filter(txs => txs[0]?.amount! < 0)
    .reduce((sum, txs) => sum + txs.reduce((catSum, tx) => catSum + Math.abs(tx.amount!), 0), 0);
  
  const categoryBreakdown: Record<string, { amount: number; percentage: number; trend: 'up' | 'down' | 'stable'; riskContribution: number }> = {};
  Object.entries(categoryGroups).forEach(([category, txs]) => {
    const amount = txs.reduce((sum, tx) => sum + Math.abs(tx.amount!), 0);
    const percentage = totalSpending > 0 ? (amount / totalSpending) * 100 : 0;
    
    // Simple trend calculation (could be enhanced)
    const midPoint = Math.floor(txs.length / 2);
    const firstHalf = txs.slice(0, midPoint).reduce((sum, tx) => sum + Math.abs(tx.amount!), 0);
    const secondHalf = txs.slice(midPoint).reduce((sum, tx) => sum + Math.abs(tx.amount!), 0);
    const trend = secondHalf > firstHalf * 1.1 ? 'up' : secondHalf < firstHalf * 0.9 ? 'down' : 'stable';
    
    categoryBreakdown[category] = {
      amount,
      percentage,
      trend,
      riskContribution: 0 // Could be calculated based on risk scores
    };
  });
  
  return {
    stories,
    trendData,
    categoryBreakdown
  };
}