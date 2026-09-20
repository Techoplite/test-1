export type DailyBar = {
  date: string; // YYYY-MM-DD in America/New_York
  open: number;
  high: number;
  low: number;
  close: number;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      meta?: { timezone?: string; exchangeTimezoneName?: string };
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
        }>;
      };
    }>;
    error?: { description?: string } | null;
  };
};

const ET = "America/New_York";

function formatEtDate(unixSeconds: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ET,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(unixSeconds * 1000));
}

export async function fetchDailyBars(
  symbol: string,
  range = "4mo"
): Promise<DailyBar[]> {
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
  );
  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", range);
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,splits");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SPX-VIX-TLT-Dashboard/1.0; +https://vercel.com)",
      Accept: "application/json",
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance request failed for ${symbol} (${res.status})`);
  }

  const data = (await res.json()) as YahooChartResponse;
  if (data.chart?.error) {
    throw new Error(
      data.chart.error.description ?? `Yahoo Finance error for ${symbol}`
    );
  }

  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];

  if (!timestamps.length || !quote) {
    throw new Error(`No daily bars returned for ${symbol}`);
  }

  const bars: DailyBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    if (
      open == null ||
      high == null ||
      low == null ||
      close == null ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      continue;
    }
    bars.push({
      date: formatEtDate(timestamps[i]),
      open,
      high,
      low,
      close,
    });
  }

  return bars;
}

export function nowInEtParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  const hour = Number(get("hour") === "24" ? "0" : get("hour"));
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour,
    minute: Number(get("minute")),
  };
}

/** Regular session cash close is 4:00 PM ET. */
export function isSessionOfficial(latestBarDate: string, now = new Date()): boolean {
  const et = nowInEtParts(now);
  if (latestBarDate < et.date) return true;
  if (latestBarDate > et.date) return false;
  // Same calendar day in ET: cash close is 4:00 PM — treat as official from 16:00 onward
  return et.hour >= 16;
}

export function formatEtTimestamp(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
