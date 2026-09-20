import type { DailyBar } from "./yahoo";

export type AssetId = "SPX" | "VIX" | "TLT";
export type Signal = "bullish" | "bearish" | "none";

export type AssetConfig = {
  id: AssetId;
  label: string;
  yahooSymbol: string;
  /** SPX breaks above prior high = bullish; VIX/TLT break below prior low = bullish */
  style: "breakout_up" | "breakout_down";
};

export const ASSETS: AssetConfig[] = [
  {
    id: "SPX",
    label: "S&P 500 (SPX)",
    yahooSymbol: "^GSPC",
    style: "breakout_up",
  },
  {
    id: "VIX",
    label: "VIX",
    yahooSymbol: "^VIX",
    style: "breakout_down",
  },
  {
    id: "TLT",
    label: "TLT",
    yahooSymbol: "TLT",
    style: "breakout_down",
  },
];

export type DaySignal = {
  date: string;
  close: number;
  priorClose: number;
  priorHigh: number;
  priorLow: number;
  pctChange: number;
  signal: Signal;
};

export function percentChange(close: number, priorClose: number): number {
  if (!Number.isFinite(priorClose) || priorClose === 0) return 0;
  return ((close - priorClose) / priorClose) * 100;
}

export function computeSignal(
  style: AssetConfig["style"],
  close: number,
  priorHigh: number,
  priorLow: number
): Signal {
  if (style === "breakout_up") {
    if (close > priorHigh) return "bullish";
    if (close < priorLow) return "bearish";
    return "none";
  }
  // breakout_down (VIX, TLT): close below prior low = bullish; above prior high = bearish
  if (close < priorLow) return "bullish";
  if (close > priorHigh) return "bearish";
  return "none";
}

export function buildDaySignals(
  bars: DailyBar[],
  style: AssetConfig["style"]
): DaySignal[] {
  const out: DaySignal[] = [];
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1];
    const cur = bars[i];
    out.push({
      date: cur.date,
      close: cur.close,
      priorClose: prev.close,
      priorHigh: prev.high,
      priorLow: prev.low,
      pctChange: percentChange(cur.close, prev.close),
      signal: computeSignal(style, cur.close, prev.high, prev.low),
    });
  }
  return out;
}

/** Keep roughly the last 3 calendar months of signal rows. */
export function lastThreeMonths(signals: DaySignal[], now = new Date()): DaySignal[] {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 3);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return signals.filter((s) => s.date >= cutoffStr);
}

export function summarizeSignals(latest: {
  SPX: Signal;
  VIX: Signal;
  TLT: Signal;
}) {
  const values = [latest.SPX, latest.VIX, latest.TLT];
  return {
    bullish: values.filter((s) => s === "bullish").length,
    bearish: values.filter((s) => s === "bearish").length,
    none: values.filter((s) => s === "none").length,
  };
}
