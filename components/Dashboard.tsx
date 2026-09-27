"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AssetPayload, SignalsResponse } from "@/app/api/signals/route";
import type { DaySignal, Signal, SignalBadge } from "@/lib/signals";

const MARKETS_CACHE_KEY = "spx-vix-tlt-signals-cache-v4";
const COPPER_CACHE_KEY = "copper-signals-cache-v1";

const RANGE_BADGE: SignalBadge = {
  bullish: "BULLISH",
  bearish: "BEARISH",
  none: "—",
  bearTone: "bear",
};

const CHART_PAD = { top: 18, right: 8, bottom: 52, left: 16 };

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type CacheEnvelope = {
  savedAt: string;
  data: SignalsResponse;
};

function formatPrice(n: number, id: string): string {
  if (id === "US10Y") return `${n.toFixed(3)}%`;
  if (id === "VIX") return n.toFixed(2);
  if (id === "HG" || id === "USDCNY") {
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  }
  if (id === "SPREAD") {
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (id === "LME") {
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function formatChange(asset: AssetPayload, row: DaySignal): string {
  if (asset.changeMode === "points") {
    const delta = row.close - row.priorClose;
    const sign = delta > 0 ? "+" : "";
    return `${sign}${formatPrice(delta, asset.id)}`;
  }
  return formatPct(row.pctChange);
}

function badgesFor(asset: AssetPayload): SignalBadge {
  return asset.badges ?? RANGE_BADGE;
}

function signalClass(signal: Signal, asset?: AssetPayload): string {
  if (signal === "bullish") return "signal signal-bull";
  if (signal === "bearish") {
    return badgesFor(asset ?? { badges: RANGE_BADGE } as AssetPayload).bearTone ===
      "orange"
      ? "signal signal-orange"
      : "signal signal-bear";
  }
  return "signal signal-none";
}

function signalLabel(signal: Signal, asset?: AssetPayload): string {
  const badges = asset ? badgesFor(asset) : RANGE_BADGE;
  if (signal === "bullish") return badges.bullish;
  if (signal === "bearish") return badges.bearish;
  return badges.none;
}

function loadCache(key: string): CacheEnvelope | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEnvelope;
  } catch {
    return null;
  }
}

function saveCache(key: string, data: SignalsResponse) {
  try {
    const envelope: CacheEnvelope = {
      savedAt: new Date().toISOString(),
      data,
    };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // ignore quota / private mode
  }
}

function PriceChart({
  history,
  assetId,
  asset,
}: {
  history: DaySignal[];
  assetId: string;
  asset?: AssetPayload;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const chartWidth = size.width;
  const chartHeight = size.height;

  const points = useMemo(() => {
    if (!history.length || chartWidth < 2 || chartHeight < 2) return [];
    const closes = history.map((h) => h.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const innerW = chartWidth - CHART_PAD.left - CHART_PAD.right;
    const innerH = chartHeight - CHART_PAD.top - CHART_PAD.bottom;

    return history.map((h, i) => {
      const x =
        CHART_PAD.left +
        (history.length === 1
          ? innerW / 2
          : (i / (history.length - 1)) * innerW);
      const y = CHART_PAD.top + (1 - (h.close - min) / span) * innerH;
      return { x, y, ...h };
    });
  }, [history, chartWidth, chartHeight]);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const minClose = history.length ? Math.min(...history.map((h) => h.close)) : 0;
  const maxClose = history.length ? Math.max(...history.map((h) => h.close)) : 0;
  const plotBottom = chartHeight - CHART_PAD.bottom;
  const monthMarks: { key: string; label: string; x: number }[] = [];
  let monthStart = 0;
  for (let i = 1; i <= points.length; i++) {
    const monthKey = points[monthStart].date.slice(0, 7);
    const monthEnded =
      i === points.length || points[i].date.slice(0, 7) !== monthKey;
    if (!monthEnded) continue;
    const slice = points.slice(monthStart, i);
    const monthIndex = Number(points[monthStart].date.slice(5, 7)) - 1;
    monthMarks.push({
      key: monthKey,
      label: MONTHS[monthIndex] ?? monthKey,
      x: (slice[0].x + slice[slice.length - 1].x) / 2,
    });
    monthStart = i;
  }

  return (
    <div className="chart-frame" ref={frameRef}>
      {points.length > 0 && (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      className="chart"
      preserveAspectRatio="none"
      role="img"
      aria-label={`${assetId} close prices`}
    >
      <rect
        x={CHART_PAD.left}
        y={CHART_PAD.top}
        width={chartWidth - CHART_PAD.left - CHART_PAD.right}
        height={chartHeight - CHART_PAD.top - CHART_PAD.bottom}
        className="chart-bg"
      />
      <text
        x={CHART_PAD.left}
        y={CHART_PAD.top - 4}
        textAnchor="start"
        className="chart-axis"
      >
        {formatPrice(maxClose, assetId)}
      </text>
      <text
        x={CHART_PAD.left}
        y={chartHeight - CHART_PAD.bottom + 12}
        textAnchor="start"
        className="chart-axis"
      >
        {formatPrice(minClose, assetId)}
      </text>
      {points.map((p) => (
        <line
          key={`grid-${p.date}`}
          x1={p.x}
          x2={p.x}
          y1={CHART_PAD.top}
          y2={chartHeight - CHART_PAD.bottom}
          className="chart-grid"
        />
      ))}
      <path d={line} className="chart-line" fill="none" />
      {points.map((p) =>
        p.signal === "none" ? null : (
          <circle
            key={p.date}
            cx={p.x}
            cy={p.y}
            r={4}
            className={p.signal === "bullish" ? "dot-bull" : "dot-bear"}
          >
            <title>
              {p.date}: {signalLabel(p.signal, asset)} ({formatPrice(p.close, assetId)})
            </title>
          </circle>
        )
      )}
      {points.map((p) => {
        const dayNum = Number(p.date.slice(8, 10));
        return (
          <text
            key={`day-${p.date}`}
            x={p.x}
            y={plotBottom + 26}
            textAnchor="middle"
            className="chart-day"
          >
            {dayNum}
          </text>
        );
      })}
      {monthMarks.map((month) => (
        <text
          key={`month-${month.key}`}
          x={month.x}
          y={chartHeight - 8}
          textAnchor="middle"
          className="chart-month"
        >
          {month.label}
        </text>
      ))}
    </svg>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [markets, setMarkets] = useState<SignalsResponse | null>(null);
  const [copper, setCopper] = useState<SignalsResponse | null>(null);
  const [view, setView] = useState<"markets" | "copper">("markets");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [chartAsset, setChartAsset] = useState("SPX");

  const data = view === "copper" ? copper : markets;

  const fetchSignals = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    const stamp = force ? `?t=${Date.now()}` : "";
    const cacheMode = force ? "no-store" : "default";
    const [marketsResult, copperResult] = await Promise.allSettled([
      fetch(`/api/signals${stamp}`, { cache: cacheMode }).then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `Markets request failed (${res.status})`);
        return json as SignalsResponse;
      }),
      fetch(`/api/copper${stamp}`, { cache: cacheMode }).then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `Copper request failed (${res.status})`);
        return json as SignalsResponse;
      }),
    ]);

    const problems: string[] = [];
    if (marketsResult.status === "fulfilled") {
      setMarkets(marketsResult.value);
      saveCache(MARKETS_CACHE_KEY, marketsResult.value);
    } else {
      const cached = loadCache(MARKETS_CACHE_KEY);
      if (cached) setMarkets(cached.data);
      problems.push(
        marketsResult.reason instanceof Error
          ? marketsResult.reason.message
          : "Markets refresh failed"
      );
    }
    if (copperResult.status === "fulfilled") {
      setCopper(copperResult.value);
      saveCache(COPPER_CACHE_KEY, copperResult.value);
    } else {
      const cached = loadCache(COPPER_CACHE_KEY);
      if (cached) setCopper(cached.data);
      problems.push(
        copperResult.reason instanceof Error
          ? copperResult.reason.message
          : "Copper refresh failed"
      );
    }
    setFromCache(problems.length > 0 && (marketsResult.status === "rejected" || copperResult.status === "rejected"));
    setError(problems.length ? problems.join(" ") : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchSignals(false);
  }, [fetchSignals]);

  const historyByDate = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, Partial<Record<string, DaySignal>>>();
    for (const asset of data.assets) {
      for (const row of asset.history) {
        const key = row.date;
        const existing = map.get(key) ?? {};
        existing[asset.id] = row;
        map.set(key, existing);
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, cols]) => ({ date, ...cols }));
  }, [data]);

  const activeChart = data?.assets.some((asset) => asset.id === chartAsset)
    ? chartAsset
    : (data?.assets[0]?.id ?? chartAsset);
  const chartAssetRecord = data?.assets.find((asset) => asset.id === activeChart);
  const chartHistory = chartAssetRecord?.history ?? [];

  return (
    <div className="page">
      <div className="fold">
      <header className="header">
        <div className="brand">
          <img
            src="/silent-charts-logo.png"
            alt="Silent Charts"
            className="logo"
          />
          <div>
            <p className="eyebrow">
              {view === "copper"
                ? "COMEX close · LME daily settlement"
                : "NYSE · 4:00 PM ET cash close"}
            </p>
            <h1>
              {view === "copper"
                ? "Copper"
                : "SPX / NDX / VIX / TLT / US 10Y Daily Signals"}
            </h1>
            <p className="subtitle">
              {view === "copper"
                ? "USD/CNY, LME curve stress, and warehouse stock"
                : "Range-break signals vs prior session high/low · % change vs prior close"}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <div className="tabs">
            <button
              type="button"
              className={view === "markets" ? "tab active" : "tab"}
              onClick={() => setView("markets")}
            >
              Markets
            </button>
            <button
              type="button"
              className={view === "copper" ? "tab active" : "tab"}
              onClick={() => setView("copper")}
            >
              Copper
            </button>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => void fetchSignals(true)}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {data && (
        <div className="meta-bar">
          <span>
            As of <strong>{data.asOfEt}</strong> (ET session)
          </span>
          <span>Fetched {data.fetchedAt} ET</span>
          <span className="pill">{data.marketNote}</span>
          {fromCache && <span className="pill warn">Cached</span>}
          <span className="pill">
            {view === "copper"
              ? data.assets
                  .map((asset) => `${asset.id} ${signalLabel(asset.latest.signal, asset)}`)
                  .join(" · ")
              : `${data.summary.bullish} bullish / ${data.summary.bearish} bearish / ${data.summary.none} none`}
          </span>
        </div>
      )}

      {error && <div className="banner error">{error}</div>}

      {!data && loading && <p className="muted">Loading market data…</p>}

      {data && (
        <>
          <section className={`cards${data.assets.length === 4 ? " count-4" : ""}`}>
            {data.assets.map((asset) => {
              const { latest } = asset;
              const changeUp =
                asset.changeMode === "points"
                  ? latest.signal === "bullish"
                  : latest.pctChange >= 0;
              const changeDown = asset.changeMode === "points"
                ? latest.signal === "bearish"
                : latest.pctChange < 0;
              const facts = asset.facts ?? [
                { label: "Prior high", value: formatPrice(latest.priorHigh, asset.id) },
                { label: "Prior low", value: formatPrice(latest.priorLow, asset.id) },
                { label: "Prior close", value: formatPrice(latest.priorClose, asset.id) },
                { label: "Session", value: asset.official ? "Official" : "Intraday" },
              ];
              return (
                <article key={asset.id} className="card">
                  <div className="card-top">
                    <div>
                      <h2>{asset.id}</h2>
                      <p className="muted small">{asset.label}</p>
                    </div>
                    <span className={signalClass(latest.signal, asset)}>
                      {signalLabel(latest.signal, asset)}
                    </span>
                  </div>
                  <p className="price">{formatPrice(latest.close, asset.id)}</p>
                  <p
                    className={
                      changeUp
                        ? "pct up"
                        : changeDown
                          ? `pct ${badgesFor(asset).bearTone === "orange" ? "supply" : "down"}`
                          : "pct"
                    }
                  >
                    {formatChange(asset, latest)}{" "}
                    <span className="muted">
                      {asset.changeMode === "points" ? "vs prior" : "vs prior close"}
                    </span>
                  </p>
                  <dl className="stats">
                    {facts.map((fact) => (
                      <div key={fact.label}>
                        <dt>{fact.label}</dt>
                        <dd>{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              );
            })}
          </section>

          <div className="split">
          <section className="panel chart-panel">
            <div className="panel-head">
              <div>
                <h3>~3 month price &amp; signals</h3>
                <p className="legend muted small">
                  {view === "copper"
                    ? "Green is a supportive reading. Red or orange is the other side."
                    : "Green / red dots mark bullish / bearish range-break days."}
                </p>
              </div>
              <div className="tabs">
                {data.assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className={activeChart === asset.id ? "tab active" : "tab"}
                    onClick={() => setChartAsset(asset.id)}
                  >
                    {asset.id}
                  </button>
                ))}
              </div>
            </div>
            <PriceChart
              history={chartHistory}
              assetId={activeChart}
              asset={chartAssetRecord}
            />
          </section>

          <section className="panel history-fold">
            <div className="panel-head">
              <h3>Session history</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    {data.assets.map((asset) => (
                      <th key={asset.id} colSpan={3}>
                        {asset.id}
                      </th>
                    ))}
                  </tr>
                  <tr className="subhead">
                    <th />
                    {data.assets.map((asset) => (
                      <Fragment key={`${asset.id}-sub`}>
                        <th>{asset.valueLabel ?? (asset.id === "US10Y" ? "Yield" : "Close")}</th>
                        <th>{asset.changeMode === "points" ? "Chg" : "%"}</th>
                        <th>Sig</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyByDate.map((row) => (
                    <tr key={row.date}>
                      <td className="date">{row.date}</td>
                      {data.assets.map((asset) => {
                        const cell = row[asset.id];
                        if (!cell) {
                          return (
                            <Fragment key={`${row.date}-${asset.id}`}>
                              <td className="muted">—</td>
                              <td className="muted">—</td>
                              <td className="muted">—</td>
                            </Fragment>
                          );
                        }
                        const changeClass =
                          asset.changeMode === "points"
                            ? cell.signal === "bullish"
                              ? "up"
                              : cell.signal === "bearish"
                                ? badgesFor(asset).bearTone === "orange"
                                  ? "supply"
                                  : "down"
                                : ""
                            : cell.pctChange >= 0
                              ? "up"
                              : "down";
                        return (
                          <Fragment key={`${row.date}-${asset.id}`}>
                            <td>{formatPrice(cell.close, asset.id)}</td>
                            <td className={changeClass}>{formatChange(asset, cell)}</td>
                            <td>
                              <span className={signalClass(cell.signal, asset)}>
                                {signalLabel(cell.signal, asset)}
                              </span>
                            </td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          </div>
        </>
      )}
      </div>

      {data && (
        <section className="panel rules">
          <h3>Signal rules</h3>
          {view === "copper" ? (
            <ul>
              <li>
                <strong>HG:</strong> COMEX copper. Bullish if the close is above
                the prior day high; bearish if it is below the prior day low.
              </li>
              <li>
                <strong>USD/CNY:</strong> bullish if the close is below the prior
                day low (dollar weaker, yuan stronger). Bearish if the close is
                above the prior day high.
              </li>
              <li>
                <strong>LME spread:</strong> cash settlement minus the 3-month
                forward. HIGH is backwardation (cash above 3-month). LOW is
                contango (3-month above cash).
              </li>
              <li>
                <strong>LME stock:</strong> a fall is scarcity (green). A rise is
                abundance (orange).
              </li>
              <li>
                SHFE and COMEX warehouse totals, and the Fed hike/cut probability
                gauge, are not on a public daily feed this page can record. A cut
                leaning is low stress for copper; a hike leaning is high stress.
              </li>
            </ul>
          ) : (
            <ul>
              <li>
                <strong>SPX / NDX:</strong> bullish if close &gt; prior day high;
                bearish if close &lt; prior day low; else none.
              </li>
              <li>
                <strong>VIX / TLT / US 10Y yield:</strong> bullish if close
                &lt; prior day low; bearish if close &gt; prior day high; else
                none.
              </li>
              <li>
                Prices use regular-session daily OHLC (4:00 PM ET cash close).
                The 10-year series is the CBOE yield (`^TNX`), shown in percent.
              </li>
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
