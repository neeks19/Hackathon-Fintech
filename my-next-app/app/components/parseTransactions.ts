export type Transaction = {
  transactionID: string;
  name: string;
  amount: number | null;
  country: string;
  dateTime: Date | null;
};

// ─── Internal helpers ──────────────────────────────────────────────────────

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function normaliseHeader(raw: string): string {
  return raw.trim().replace(/^"|"$/g, "").toLowerCase();
}

function stripQuotes(value: string): string {
  return value.trim().replace(/^"|"$/g, "");
}

// Maps CSV column names → canonical field keys (case-insensitive)
const COLUMN_MAP: Record<string, keyof Transaction> = {
  transactionid: "transactionID",
  name:          "name",
  amount:        "amount",
  country:       "country",
  datetime:      "dateTime",
  date:          "dateTime",
};

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

function parseDateTime(raw: string): Date | null {
  if (!raw) return null;

  // Try native parsing first (handles ISO 8601, RFC 2822, etc.)
  const native = new Date(raw);
  if (!isNaN(native.getTime())) return native;

  // Try DD/MM/YYYY or DD/MM/YYYY HH:MM:SS
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)/);
  if (dmy) {
    const iso = `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}${dmy[4]}`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

// ─── Main export ───────────────────────────────────────────────────────────

export async function parseTransactionFile(file: File): Promise<Transaction[]> {
  const text = await file.text();
  return parseTransactionCSV(text);
}

export function parseTransactionCSV(csvText: string): Transaction[] {
  const lines = csvText.trim().split(/\r?\n/);

  if (lines.length < 2) {
    throw new Error("CSV must contain a header row and at least one data row.");
  }

  const headers = lines[0].split(",").map(normaliseHeader);
  const indices: Partial<Record<keyof Transaction, number>> = {};

  headers.forEach((col, i) => {
    const canonical = COLUMN_MAP[col];
    if (canonical && indices[canonical] === undefined) {
      indices[canonical] = i;
    }
  });

  const required = ["transactionID", "name", "amount", "country", "dateTime"] as const;
  const missing = required.filter((k) => indices[k] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `Missing required columns: ${missing.join(", ")}.\nFound headers: ${headers.join(", ")}`
    );
  }

  const transactions: Transaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = splitCSVLine(line).map(stripQuotes);

    const transactionID = fields[indices.transactionID!] ?? "";
    const name = fields[indices.name!] ?? "";
    const amount = parseAmount(fields[indices.amount!] ?? "");
    const country = fields[indices.country!] ?? "";
    const dateTime = parseDateTime(fields[indices.dateTime!] ?? "");

    transactions.push({ transactionID, name, amount, country, dateTime });
  }

  return transactions;
}