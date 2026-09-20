# SPX / VIX / TLT Daily Signals

Single-page Next.js dashboard that records NYSE **4:00 PM ET** daily closes for **SPX**, **VIX**, and **TLT**, shows percent change vs the prior close, and emits range-break bullish / bearish / none signals.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. In [Vercel](https://vercel.com/new), **Import** the repository.
3. Framework preset: **Next.js**. Leave env vars empty (no API keys).
4. Deploy.

Market data is fetched server-side from Yahoo Finance via `/api/signals` (cached ~5 minutes).

## Signal rules

| Asset | Bullish | Bearish |
| --- | --- | --- |
| SPX | Close &gt; prior day high | Close &lt; prior day low |
| VIX | Close &lt; prior day low | Close &gt; prior day high |
| TLT | Close &lt; prior day low | Close &gt; prior day high |

Otherwise: **no signal**. Prices use regular-session daily OHLC (cash close).
