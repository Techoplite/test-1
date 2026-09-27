import { NextResponse } from "next/server";
import { buildCopperAssets } from "@/lib/copper";
import { summarizeSignals } from "@/lib/signals";
import { formatEtTimestamp, nowInEtParts } from "@/lib/yahoo";

export const revalidate = 300;

export async function GET() {
  try {
    const now = new Date();
    const et = nowInEtParts(now);
    const assets = await buildCopperAssets(now);
    const anyUnofficial = assets.some((asset) => !asset.official);

    return NextResponse.json(
      {
        asOfEt: assets[0]?.latest.date ?? et.date,
        fetchedAt: formatEtTimestamp(now),
        etDate: et.date,
        marketNote: anyUnofficial
          ? "COMEX or USD/CNY is still intraday until the 4:00 PM ET cash close. LME figures are the daily settlement."
          : "COMEX and USD/CNY use the US cash close. LME cash, 3-month, and warehouse stock use the daily settlement.",
        summary: summarizeSignals(assets.map((asset) => asset.latest.signal)),
        assets,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
