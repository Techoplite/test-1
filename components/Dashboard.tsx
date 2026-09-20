"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { SignalsResponse } from "@/app/api/signals/route";
import type { DaySignal, Signal } from "@/lib/signals";

const CACHE_KEY = "spx-vix-tlt-signals-cache-v1";

const CHART_WIDTH = 720;
const CHART_HEIGHT = 240;
const CHART_PAD = { top: 16, right: 16, bottom: 40, left: 52 };

type CacheEnvelope = {
  savedAt: string;
  data: SignalsResponse;
};

function formatPrice(n: number, id: string): string {
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
  const points = useMemo(() => {
    if (!history.length) return [];
    const closes = history.map((h) => h.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const innerW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
    const innerH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;

    return history.map((h, i) => {
      const x =
        CHART_PAD.left +
        (history.length === 1
          ? innerW / 2
          : (i / (history.length - 1)) * innerW);
      const y = CHART_PAD.top + (1 - (h.close - min) / span) * innerH;
      return { x, y, ...h };
    });
  }, [history]);

  if (!points.length) {
    return <p className="muted">No chart data.</p>;
  }

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const minClose = Math.min(...history.map((h) => h.close));
  const maxClose = Math.max(...history.map((h) => h.close));

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="chart"
      role="img"
      aria-label={`${assetId} close prices`}
    >
      <rect
        x={CHART_PAD.left}
        y={CHART_PAD.top}
        width={CHART_WIDTH - CHART_PAD.left - CHART_PAD.right}
        height={CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom}
        className="chart-bg"
      />
      <text
        x={CHART_PAD.left - 8}
        y={CHART_PAD.top + 4}
        textAnchor="end"
        className="chart-axis"
      >
        {formatPrice(maxClose, assetId)}
      </text>
      <text
        x={CHART_PAD.left - 8}
        y={CHART_HEIGHT - CHART_PAD.bottom}
        textAnchor="end"
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
          y2={CHART_HEIGHT - CHART_PAD.bottom}
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
            y={CHART_HEIGHT - 10}
            textAnchor="middle"
            className="chart-day"
          >
            {dayNum}
          </text>
        );
      })}
    </svg>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<SignalsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [chartAsset, setChartAsset] = useState<"SPX" | "VIX" | "TLT">("SPX");

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
    const map = new Map<
      string,
      Partial<Record<"SPX" | "VIX" | "TLT", DaySignal>>
    >();
    for (const asset of data.assets) {
      for (const row of asset.history) {
        const key = row.date;
        const existing = map.get(key) ?? {};
        existing[asset.id as "SPX" | "VIX" | "TLT"] = row;
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
      <header className="header">
        <div>
          <p className="eyebrow">NYSE · 4:00 PM ET cash close</p>
          <h1>SPX / VIX / TLT Daily Signals</h1>
          <p className="subtitle">
            Range-break signals vs prior session high/low · % change vs prior
            close
          </p>
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

          <section className="panel">
            <div className="panel-head">
              <h3>~3 month price &amp; signals</h3>
              <div className="tabs">
                {(["SPX", "VIX", "TLT"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={chartAsset === id ? "tab active" : "tab"}
                    onClick={() => setChartAsset(id)}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
            <PriceChart history={chartHistory} assetId={chartAsset} />
            <p className="legend muted small">
              Green / red dots mark bullish / bearish range-break days for the
              selected asset.
            </p>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Session history</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th colSpan={3}>SPX</th>
                    <th colSpan={3}>VIX</th>
                    <th colSpan={3}>TLT</th>
                  </tr>
                  <tr className="subhead">
                    <th />
                    <th>Close</th>
                    <th>%</th>
                    <th>Sig</th>
                    <th>Close</th>
                    <th>%</th>
                    <th>Sig</th>
                    <th>Close</th>
                    <th>%</th>
                    <th>Sig</th>
                  </tr>
                </thead>
                <tbody>
                  {historyByDate.map((row) => (
                    <tr key={row.date}>
                      <td className="date">{row.date}</td>
                      {(["SPX", "VIX", "TLT"] as const).map((id) => {
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
                <strong>SPX:</strong> bullish if close &gt; prior day high;
                bearish if close &lt; prior day low; else none.
              </li>
              <li>
                <strong>VIX / TLT:</strong> bullish if close &lt; prior day low;
                bearish if close &gt; prior day high; else none.
              </li>
              <li>
                Prices use regular-session daily OHLC (4:00 PM ET cash close).
              </li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
