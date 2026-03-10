# Financial Hub — Bitcoin & Macro Monitor

Dashboard de monitoring financier en temps réel pour Bitcoin, ETF, indicateurs macro et géopolitique.

## Démarrage rapide

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000

## APIs gratuites (sans clé)

- **CoinGecko** — Prix BTC, historique 200 jours, RSI, MA200, volume
- **Alternative.me** — Fear & Greed Index (contrarian signal)
- **Mempool.space** — Hashrate, difficulté réseau Bitcoin
- **Yahoo Finance (via proxy CORS)** — ETF: IBIT, FBTC, BITB, ARKB + SPY, GLD, UUP

## APIs avec clé gratuite (optionnel mais recommandé)

| Service | Données | Lien |
|---------|---------|------|
| **FRED** (Federal Reserve) | Fed Rate, CPI, Chômage, Taux 10Y, M2 | https://fred.stlouisfed.org/docs/api/api_key.html |
| **CryptoPanic** | News BTC avec sentiment | https://cryptopanic.com/developers/api/ |

Configurez les clés via le bouton ⚙️ Settings dans l'interface.

## Système de scoring

```
Score Global = BTC(40%) + ETF(20%) + Macro(30%) + News(10%)
```

| Score | Signal | Action |
|-------|--------|--------|
| 80–100 | FORT ACHAT | Accumulation agressive, DCA intensif |
| 65–79 | ACHAT | DCA régulier, accumulation modérée |
| 50–64 | HOLD/WATCH | Maintenir, surveiller |
| 35–49 | PRUDENCE | Réduire exposition, stop-loss |
| 0–34 | VENTE/SORTIE | Capital preservation, risk-off |

### Score Bitcoin (0-100)
- Prix vs MA200 (structure de tendance)
- RSI 14 jours (survendu = signal d'achat contrarian)
- Fear & Greed Index (peur extrême = opportunité)
- Volume vs moyenne 30j
- Hashrate 7j (santé du réseau)
- Variation 24h (momentum)

### Score ETF (0-100)
- Performance 7j des ETF Bitcoin (IBIT, FBTC, BITB, ARKB)
- Largeur du marché (combien d'ETFs positifs)

### Score Macro (0-100)
- Direction du taux Fed (baisse = haussier BTC)
- Tendance inflation CPI (baisse = haussier)
- Taux chômage
- Courbe des taux 10Y-2Y (normale vs inversée)
- Dollar DXY (baisse = haussier BTC)
- S&P 500 (risk-on/off)
- Gold (hedge/inflation signal)

### Score Actualités (0-100)
- Sentiment lexical des headlines BTC/crypto/macro
- Analyse de 15 articles récents

## Architecture

```
src/
├── services/
│   ├── cache.js        — Cache localStorage (TTL 15-60 min)
│   ├── bitcoin.js      — CoinGecko + Mempool.space + Alternative.me
│   ├── etf.js          — Yahoo Finance (IBIT, FBTC, SPY, GLD, UUP)
│   ├── macro.js        — FRED API (Fed, CPI, taux, M2)
│   └── news.js         — CryptoPanic + RSS fallback
├── utils/
│   └── scoring.js      — Algorithme de scoring et signaux
└── components/
    ├── panels/         — Bitcoin, ETF, Macro, News
    ├── ScoreGauge.jsx  — Jauge SVG semi-circulaire
    ├── DecisionPanel.jsx — Workflow de décision en 5 étapes
    ├── Header.jsx
    └── Settings.jsx    — Configuration des clés API
```

## ⚠ Disclaimer

Ce hub est un outil d'aide à la décision. Aucune décision financière ne doit être prise uniquement sur la base de ces indicateurs. Faites vos propres recherches (DYOR).
