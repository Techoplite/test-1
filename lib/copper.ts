import type { AssetPayload } from "@/app/api/signals/route";
import {
  buildDaySignals,
  lastThreeMonths,
  percentChange,
  type DaySignal,
  type Signal,
  type SignalBadge,
} from "@/lib/signals";
import { fetchLmeCopper } from "@/lib/westmetall";
import { fetchDailyBars, isSessionOfficial } from "@/lib/yahoo";

const RANGE_BADGE: SignalBadge = {
  bullish: "BULLISH",
  bearish: "BEARISH",
  none: "—",
  bearTone: "bear",
};

const CURVE_BADGE: SignalBadge = {
  bullish: "LOW",
  bearish: "HIGH",
  none: "FLAT",
  bearTone: "bear",
};

const STOCK_BADGE: SignalBadge = {
  bullish: "SCARCITY",
  bearish: "ABUNDANCE",
  none: "—",
  bearTone: "orange",
};

function money(n: number, digits = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function curveSignal(spread: number): Signal {
  if (spread > 0) return "bearish";
  if (spread < 0) return "bullish";
  return "none";
}

function stockSignal(stock: number, prior: number): Signal {
  if (stock < prior) return "bullish";
  if (stock > prior) return "bearish";
  return "none";
}

function fromRows(
  id: string,
  label: string,
  rows: { date: string; close: number; signal: Signal; priorHigh: number; priorLow: number }[],
  badges: SignalBadge,
  extra: Partial<AssetPayload>
): AssetPayload {
  const history = lastThreeMonths(
    rows.map((row, index) => {
      const prior = rows[index - 1];
      return {
        date: row.date,
        close: row.close,
        priorClose: prior?.close ?? row.close,
        priorHigh: row.priorHigh,
        priorLow: row.priorLow,
        pctChange: percentChange(row.close, prior?.close ?? row.close),
        signal: row.signal,
      } satisfies DaySignal;
    }).filter((_, index) => index > 0)
  );
  const latest = history[history.length - 1];
  if (!latest) throw new Error(`Insufficient history for ${id}`);
  return {
    id,
    label,
    yahooSymbol: "LME",
    latest,
    history,
    official: true,
    badges,
    ...extra,
  };
}

export async function buildCopperAssets(now = new Date()): Promise<AssetPayload[]> {
  const [copperBars, fxBars, lme] = await Promise.all([
    fetchDailyBars("HG=F", "4mo"),
    fetchDailyBars("CNY=X", "4mo"),
    fetchLmeCopper(now),
  ]);

  const copperHistory = lastThreeMonths(buildDaySignals(copperBars, "breakout_up"), now);
  const fxHistory = lastThreeMonths(buildDaySignals(fxBars, "breakout_down"), now);
  const copperLatest = copperHistory[copperHistory.length - 1];
  const fxLatest = fxHistory[fxHistory.length - 1];
  if (!copperLatest || !fxLatest) {
    throw new Error("Insufficient COMEX copper or USD/CNY history");
  }

  const levelRows = lme.map((row, index) => {
    const prior = lme[index - 1];
    const spread = row.cash - row.threeMonth;
    return {
      date: row.date,
      cash: row.cash,
      threeMonth: row.threeMonth,
      stock: row.stock,
      spread,
      priorStock: prior?.stock ?? row.stock,
      priorSpread: prior ? prior.cash - prior.threeMonth : spread,
    };
  });

  const spreadAsset = fromRows(
    "SPREAD",
    "LME cash minus 3-month",
    levelRows.map((row) => ({
      date: row.date,
      close: row.spread,
      signal: curveSignal(row.spread),
      priorHigh: row.cash,
      priorLow: row.threeMonth,
    })),
    CURVE_BADGE,
    {
      changeMode: "points",
      decimals: 2,
      valueLabel: "Spread",
    }
  );
  const latestLme = levelRows[levelRows.length - 1];
  spreadAsset.facts = [
    { label: "Cash", value: money(latestLme.cash) },
    { label: "3-month", value: money(latestLme.threeMonth) },
    { label: "Prior spread", value: money(latestLme.priorSpread) },
    { label: "Session", value: "LME settlement" },
  ];

  const stockAsset = fromRows(
    "LME",
    "LME copper warehouse stock",
    levelRows.map((row) => ({
      date: row.date,
      close: row.stock,
      signal: stockSignal(row.stock, row.priorStock),
      priorHigh: row.priorStock,
      priorLow: row.stock - row.priorStock,
    })),
    STOCK_BADGE,
    {
      changeMode: "percent",
      decimals: 0,
      valueLabel: "Stock",
    }
  );
  const stockChange = latestLme.stock - latestLme.priorStock;
  stockAsset.facts = [
    { label: "Prior stock", value: money(latestLme.priorStock, 0) },
    {
      label: "Change",
      value: `${stockChange > 0 ? "+" : ""}${money(stockChange, 0)} t`,
    },
    { label: "Unit", value: "tonnes" },
    { label: "Session", value: "LME settlement" },
  ];

  return [
    {
      id: "HG",
      label: "COMEX copper",
      yahooSymbol: "HG=F",
      latest: copperLatest,
      history: copperHistory,
      official: isSessionOfficial(copperLatest.date, now),
      badges: RANGE_BADGE,
      decimals: 4,
      valueLabel: "Price",
    },
    {
      id: "USDCNY",
      label: "USD / Chinese yuan",
      yahooSymbol: "CNY=X",
      latest: fxLatest,
      history: fxHistory,
      official: isSessionOfficial(fxLatest.date, now),
      badges: RANGE_BADGE,
      decimals: 4,
      valueLabel: "Close",
    },
    spreadAsset,
    stockAsset,
  ];
}
