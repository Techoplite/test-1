"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SignalsResponse } from "@/app/api/signals/route";
import type { AssetId, DaySignal, Signal } from "@/lib/signals";

const CACHE_KEY = "spx-vix-tlt-signals-cache-v4";

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
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function signalClass(signal: Signal): string {
  if (signal === "bullish") return "signal signal-bull";
  if (signal === "bearish") return "signal signal-bear";
  return "signal signal-none";
}

function signalLabel(signal: Signal): string {
  if (signal === "bullish") return "BULLISH";
  if (signal === "bearish") return "BEARISH";
  return "—";
}

function loadCache(): CacheEnvelope | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEnvelope;
  } catch {
    return null;
  }
}

function saveCache(data: SignalsResponse) {
  try {
    const envelope: CacheEnvelope = {
      savedAt: new Date().toISOString(),
      data,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
  } catch {
    // ignore quota / private mode
  }
}

function PriceChart({
  history,
  assetId,
}: {
  history: DaySignal[];
  assetId: string;
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
              {p.date}: {signalLabel(p.signal)} ({formatPrice(p.close, assetId)})
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
  const [data, setData] = useState<SignalsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [chartAsset, setChartAsset] = useState<AssetId>("SPX");

  const fetchSignals = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = force ? `/api/signals?t=${Date.now()}` : "/api/signals";
      const res = await fetch(url, { cache: force ? "no-store" : "default" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }
      const payload = json as SignalsResponse;
      setData(payload);
      setFromCache(false);
      saveCache(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load";
      const cached = loadCache();
      if (cached) {
        setData(cached.data);
        setFromCache(true);
        setError(`${message} — showing cached data from ${cached.savedAt}.`);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSignals(false);
  }, [fetchSignals]);

  const historyByDate = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, Partial<Record<AssetId, DaySignal>>>();
    for (const asset of data.assets) {
      for (const row of asset.history) {
        const key = row.date;
        const existing = map.get(key) ?? {};
        existing[asset.id as AssetId] = row;
        map.set(key, existing);
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, cols]) => ({ date, ...cols }));
  }, [data]);

  const chartHistory =
    data?.assets.find((a) => a.id === chartAsset)?.history ?? [];

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
            <p className="eyebrow">NYSE · 4:00 PM ET cash close</p>
            <h1>SPX / NDX / VIX / TLT / US 10Y Daily Signals</h1>
            <p className="subtitle">
              Range-break signals vs prior session high/low · % change vs prior
              close
            </p>
          </div>
        </div>
        <div className="header-actions">
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
            {data.summary.bullish} bullish / {data.summary.bearish} bearish /{" "}
            {data.summary.none} none
          </span>
        </div>
      )}

      {error && <div className="banner error">{error}</div>}

      {!data && loading && <p className="muted">Loading market data…</p>}

      {data && (
        <>
          <section className="cards">
            {data.assets.map((asset) => {
              const { latest } = asset;
              const up = latest.pctChange >= 0;
              return (
                <article key={asset.id} className="card">
                  <div className="card-top">
                    <div>
                      <h2>{asset.id}</h2>
                      <p className="muted small">{asset.label}</p>
                    </div>
                    <span className={signalClass(latest.signal)}>
                      {signalLabel(latest.signal)}
                    </span>
                  </div>
                  <p className="price">{formatPrice(latest.close, asset.id)}</p>
                  <p className={up ? "pct up" : "pct down"}>
                    {formatPct(latest.pctChange)}{" "}
                    <span className="muted">vs prior close</span>
                  </p>
                  <dl className="stats">
                    <div>
                      <dt>Prior high</dt>
                      <dd>{formatPrice(latest.priorHigh, asset.id)}</dd>
                    </div>
                    <div>
                      <dt>Prior low</dt>
                      <dd>{formatPrice(latest.priorLow, asset.id)}</dd>
                    </div>
                    <div>
                      <dt>Prior close</dt>
                      <dd>{formatPrice(latest.priorClose, asset.id)}</dd>
                    </div>
                    <div>
                      <dt>Session</dt>
                      <dd>{asset.official ? "Official" : "Intraday"}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </section>

          <section className="panel chart-panel">
            <div className="panel-head">
              <div>
                <h3>~3 month price &amp; signals</h3>
                <p className="legend muted small">
                  Green / red dots mark bullish / bearish range-break days.
                </p>
              </div>
              <div className="tabs">
                {data.assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className={chartAsset === asset.id ? "tab active" : "tab"}
                    onClick={() => setChartAsset(asset.id as AssetId)}
                  >
                    {asset.id}
                  </button>
                ))}
              </div>
            </div>
            <PriceChart history={chartHistory} assetId={chartAsset} />
          </section>
        </>
      )}
      </div>

      {data && (
        <>
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
                        <th>{asset.id === "US10Y" ? "Yield" : "Close"}</th>
                        <th>%</th>
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
                        const id = asset.id as AssetId;
                        const cell = row[id];
                        if (!cell) {
                          return (
                            <Fragment key={`${row.date}-${id}`}>
                              <td className="muted">—</td>
                              <td className="muted">—</td>
                              <td className="muted">—</td>
                            </Fragment>
                          );
                        }
                        return (
                          <Fragment key={`${row.date}-${id}`}>
                            <td>{formatPrice(cell.close, id)}</td>
                            <td
                              className={
                                cell.pctChange >= 0 ? "up" : "down"
                              }
                            >
                              {formatPct(cell.pctChange)}
                            </td>
                            <td>
                              <span className={signalClass(cell.signal)}>
                                {signalLabel(cell.signal)}
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

          <section className="panel rules">
            <h3>Signal rules</h3>
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
          </section>
        </>
      )}
    </div>
  );
}
