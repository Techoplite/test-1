"use client";

import { useEffect, useMemo, useState } from "react";
import type { AssetPayload, SignalsResponse } from "@/app/api/signals/route";
import ViewTabs from "@/components/ViewTabs";
import {
  CHECKLIST,
  CHECKLIST_STORAGE_KEY,
  CHECKLIST_TOTAL,
  lookbackChange,
  parseDraft,
  tallyScores,
  type ChecklistDraft,
  type ScoreValue,
} from "@/lib/checklist";
import type { Signal } from "@/lib/signals";

const SCORE_OPTIONS: { value: ScoreValue; label: string; tone: string }[] = [
  { value: 1, label: "Positive", tone: "pos" },
  { value: 0, label: "Neutral", tone: "neu" },
  { value: -1, label: "Negative", tone: "neg" },
];

function formatYield(n: number): string {
  return `${n.toFixed(3)}%`;
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

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const width = 280;
  const height = 64;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const line = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = 6 + (1 - (value - min) / span) * (height - 12);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="spark"
      role="img"
      aria-label="US 10-year yield over about three months"
    >
      <path d={line} />
    </svg>
  );
}

function TenYearContext({
  asset,
  loading,
  error,
}: {
  asset: AssetPayload | null;
  loading: boolean;
  error: string | null;
}) {
  const week = asset ? lookbackChange(asset.history, 5) : null;
  const month = asset ? lookbackChange(asset.history, 21) : null;
  const quarter = asset
    ? lookbackChange(asset.history, asset.history.length - 1)
    : null;
  const windows = [
    { label: "1 week", value: week },
    { label: "1 month", value: month },
    { label: "3 month", value: quarter },
  ];

  return (
    <div className="live-context">
      <p className="live-kicker">From Silent Charts</p>
      {loading && <p className="muted small">Loading the 10-year yield…</p>}
      {error && <p className="muted small">{error}</p>}
      {!loading && !error && !asset && (
        <p className="muted small">The 10-year yield is not in this session.</p>
      )}
      {asset && (
        <>
          <div className="live-top">
            <div>
              <p className="live-price">{formatYield(asset.latest.close)}</p>
              <p className="muted small">
                {asset.latest.date} · close below the prior low is bullish
              </p>
            </div>
            <span className={signalClass(asset.latest.signal)}>
              {signalLabel(asset.latest.signal)}
            </span>
          </div>
          <div className="live-windows">
            {windows.map((span) => (
              <div key={span.label}>
                <span className="muted small">{span.label}</span>
                <strong className={span.value == null ? "" : span.value >= 0 ? "up" : "down"}>
                  {span.value == null ? "—" : formatPct(span.value)}
                </strong>
              </div>
            ))}
          </div>
          <Sparkline values={asset.history.map((row) => row.close)} />
          <p className="muted small">
            The yield is context for this row. The Positive / Neutral / Negative
            choice stays yours.
          </p>
        </>
      )}
    </div>
  );
}

export default function Checklist() {
  const [draft, setDraft] = useState<ChecklistDraft>({
    assetName: "",
    scores: {},
    notes: {},
  });
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState({ date: "—", day: "—" });
  const [markets, setMarkets] = useState<SignalsResponse | null>(null);
  const [marketsError, setMarketsError] = useState<string | null>(null);
  const [marketsLoading, setMarketsLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    setToday({
      date: now.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      day: now.toLocaleDateString(undefined, { weekday: "long" }),
    });
    setDraft(parseDraft(localStorage.getItem(CHECKLIST_STORAGE_KEY)));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(draft));
  }, [draft, ready]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/signals")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? `Markets request failed (${res.status})`);
        }
        return json as SignalsResponse;
      })
      .then((json) => {
        if (!cancelled) setMarkets(json);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setMarketsError(
            reason instanceof Error ? reason.message : "Markets request failed"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setMarketsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tally = useMemo(() => tallyScores(draft.scores), [draft.scores]);
  const tenYear = markets?.assets.find((asset) => asset.id === "US10Y") ?? null;

  function setScore(id: string, value: ScoreValue) {
    setDraft((current) => ({
      ...current,
      scores: { ...current.scores, [id]: value },
    }));
  }

  function setNote(id: string, value: string) {
    setDraft((current) => ({
      ...current,
      notes: { ...current.notes, [id]: value },
    }));
  }

  function resetAll() {
    if (!window.confirm("Clear the asset name, scores, and notes?")) return;
    setDraft({ assetName: "", scores: {}, notes: {} });
  }

  return (
    <div className="page page-scroll">
      <header className="header">
        <div className="brand">
          <img src="/silent-charts-logo.png" alt="Silent Charts" className="logo" />
          <div>
            <p className="eyebrow">Decision matrix</p>
            <h1>Investment &amp; Trading Checklist</h1>
            <p className="subtitle">
              Fundamental, technical, and risk review before committing capital
            </p>
          </div>
        </div>
        <div className="header-actions">
          <ViewTabs active="checklist" />
        </div>
      </header>

      <div className="checklist-column">
        <div className="checklist-meta">
          <span>
            Date <strong>{today.date}</strong>
          </span>
          <span>
            Day <strong>{today.day}</strong>
          </span>
          <label className="asset-field">
            <span className="muted small">Asset analysed</span>
            <input
              type="text"
              value={draft.assetName}
              placeholder="Name or ticker"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  assetName: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <div className="checklist-score">
          <span className="chip pos">Positive {tally.positive}</span>
          <span className="chip neu">Neutral {tally.neutral}</span>
          <span className="chip neg">Negative {tally.negative}</span>
          <span className="chip">
            Marked {tally.marked}/{CHECKLIST_TOTAL}
          </span>
          <span className={`verdict ${tally.tone}`}>{tally.text}</span>
          <div className="checklist-actions">
            <button type="button" className="btn" onClick={() => window.print()}>
              Print / Save PDF
            </button>
            <button type="button" className="btn" onClick={resetAll}>
              Reset
            </button>
          </div>
        </div>

        {markets && (
          <p className="muted small session-line">
            Markets session {markets.asOfEt}: {markets.summary.bullish} bullish /{" "}
            {markets.summary.bearish} bearish / {markets.summary.none} none
          </p>
        )}

        {CHECKLIST.map((section) => (
          <section key={section.id} className={`check-section ${section.tone}`}>
            <h2>{section.title}</h2>
            {section.items.map((item) => {
              const score = draft.scores[item.id];
              const state =
                score === 1 ? "state-pos" : score === 0 ? "state-neu" : score === -1 ? "state-neg" : "";
              return (
                <article key={item.id} className={`check-item ${state}`}>
                  <div className="item-head">
                    <span className="badge">{item.badge}</span>
                    <h3>{item.title}</h3>
                  </div>
                  <p className="record">
                    <strong>Record:</strong> {item.record}
                  </p>
                  <p className="question">
                    <span className="q-label">Key evaluation question</span>
                    {item.question}
                  </p>
                  {item.id === "s1E" && (
                    <TenYearContext
                      asset={tenYear}
                      loading={marketsLoading}
                      error={marketsError}
                    />
                  )}
                  <div className="check-assess" role="radiogroup" aria-label={item.title}>
                    {SCORE_OPTIONS.map((option) => (
                      <label key={option.value} className={`check-opt ${option.tone}`}>
                        <input
                          type="radio"
                          name={`score-${item.id}`}
                          value={option.value}
                          checked={score === option.value}
                          onChange={() => setScore(item.id, option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  <textarea
                    className="notes"
                    rows={2}
                    placeholder="Notes / remarks…"
                    value={draft.notes[item.id] ?? ""}
                    onChange={(event) => setNote(item.id, event.target.value)}
                  />
                </article>
              );
            })}
          </section>
        ))}

        <p className="checklist-foot">
          Positive supports the trade. Neutral means the evidence is inconclusive.
          Negative argues against it. Finish Risk Management before any capital
          commitment. Not financial advice.
        </p>
      </div>
    </div>
  );
}
