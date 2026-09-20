import { NextResponse } from "next/server";
import {
  ASSETS,
  buildDaySignals,
  lastThreeMonths,
  summarizeSignals,
  type DaySignal,
} from "@/lib/signals";
import {
  fetchDailyBars,
  formatEtTimestamp,
  isSessionOfficial,
  nowInEtParts,
} from "@/lib/yahoo";

export const revalidate = 300;

export type AssetPayload = {
  id: string;
  label: string;
  yahooSymbol: string;
  latest: DaySignal;
  history: DaySignal[];
  official: boolean;
};

export type SignalsResponse = {
  asOfEt: string;
  fetchedAt: string;
  etDate: string;
  marketNote: string;
  summary: { bullish: number; bearish: number; none: number };
  assets: AssetPayload[];
};

export async function GET() {
  try {
    const now = new Date();
    const et = nowInEtParts(now);

    const results = await Promise.all(
      ASSETS.map(async (asset) => {
        const bars = await fetchDailyBars(asset.yahooSymbol, "4mo");
        const allSignals = buildDaySignals(bars, asset.style);
        const history = lastThreeMonths(allSignals, now);
        const latest = history[history.length - 1] ?? allSignals[allSignals.length - 1];
        if (!latest) {
          throw new Error(`Insufficient history for ${asset.id}`);
        }
        const official = isSessionOfficial(latest.date, now);
        return {
          id: asset.id,
          label: asset.label,
          yahooSymbol: asset.yahooSymbol,
          latest,
          history,
          official,
        } satisfies AssetPayload;
      })
    );

    const anyUnofficial = results.some((r) => !r.official);
    const summary = summarizeSignals({
      SPX: results.find((r) => r.id === "SPX")!.latest.signal,
      VIX: results.find((r) => r.id === "VIX")!.latest.signal,
      TLT: results.find((r) => r.id === "TLT")!.latest.signal,
    });

    const body: SignalsResponse = {
      asOfEt: results[0]?.latest.date ?? et.date,
      fetchedAt: formatEtTimestamp(now),
      etDate: et.date,
      marketNote: anyUnofficial
        ? "Latest bar is intraday / unofficial until the 4:00 PM ET cash close."
        : "Showing last completed regular session (4:00 PM ET close).",
      summary,
      assets: results,
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
