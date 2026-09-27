import type { DailyBar } from "./yahoo";

export type AssetId = "SPX" | "VIX" | "TLT" | "US10Y";
export type Signal = "bullish" | "bearish" | "none";

export type AssetConfig = {
  id: AssetId;
  label: string;
  yahooSymbol: string;
  /**
   * breakout_up: close above prior high = bullish (SPX).
   * breakout_down: close below prior low = bullish (VIX, TLT, US 10Y yield).
   */
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
  {
    id: "US10Y",
    label: "US 10-Year Treasury Yield",
    yahooSymbol: "^TNX",
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
  // breakout_down (VIX, TLT, US 10Y): close below prior low = bullish; above prior high = bearish
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

export function summarizeSignals(signals: Signal[]) {
  return {
    bullish: signals.filter((s) => s === "bullish").length,
    bearish: signals.filter((s) => s === "bearish").length,
    none: signals.filter((s) => s === "none").length,
  };
}
