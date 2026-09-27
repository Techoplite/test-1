export type LmeCopperRow = {
  date: string;
  cash: number;
  threeMonth: number;
  stock: number;
};

const MONTHS: Record<string, string> = {
  January: "01",
  February: "02",
  March: "03",
  April: "04",
  May: "05",
  June: "06",
  July: "07",
  August: "08",
  September: "09",
  October: "10",
  November: "11",
  December: "12",
};

function parseNumber(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

export function parseLmeCopperHtml(html: string): LmeCopperRow[] {
  const rowRe =
    /<tr>\s*<td[^>]*>\s*(\d{1,2})\.\s+([A-Za-z]+)\s+(\d{4})\s*<\/td>\s*<td[^>]*>\s*([\d,]+\.\d+)\s*<\/td>\s*<td[^>]*>\s*([\d,]+\.\d+)\s*<\/td>\s*<td[^>]*>\s*([\d,]+)\s*<\/td>\s*<\/tr>/g;
  const rows: LmeCopperRow[] = [];
  for (const match of html.matchAll(rowRe)) {
    const month = MONTHS[match[2]];
    if (!month) continue;
    const cash = parseNumber(match[4]);
    const threeMonth = parseNumber(match[5]);
    const stock = parseNumber(match[6]);
    if (![cash, threeMonth, stock].every(Number.isFinite)) continue;
    rows.push({
      date: `${match[3]}-${month}-${match[1].padStart(2, "0")}`,
      cash,
      threeMonth,
      stock,
    });
  }
  const byDate = new Map(rows.map((row) => [row.date, row]));
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchYear(year: number): Promise<LmeCopperRow[]> {
  const url = `https://www.westmetall.com/en/markdaten.php?action=table&field=LME_Cu_cash&year=${year}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SilentCharts/1.0)",
      Accept: "text/html",
    },
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`Westmetall copper table failed for ${year} (${res.status})`);
  }
  return parseLmeCopperHtml(await res.text());
}

export async function fetchLmeCopper(now = new Date()): Promise<LmeCopperRow[]> {
  const year = now.getUTCFullYear();
  const [current, previous] = await Promise.all([
    fetchYear(year),
    fetchYear(year - 1),
  ]);
  const byDate = new Map<string, LmeCopperRow>();
  for (const row of [...previous, ...current]) byDate.set(row.date, row);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
