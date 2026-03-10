/**
 * FINANCIAL HUB — SCORING ENGINE
 *
 * Global Score = BTC(40%) + ETF(20%) + Macro(30%) + News(10%)
 * Each sub-score is 0-100 (higher = more bullish / favorable for BTC)
 *
 * Decision levels:
 *  80–100 → STRONG BUY  (aggressive accumulation)
 *  65–79  → BUY         (DCA / moderate accumulation)
 *  50–64  → HOLD/WATCH  (no action, monitor)
 *  35–49  → CAUTION     (reduce exposure, hedge)
 *   0–34  → SELL/EXIT   (capital preservation, risk-off)
 */

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v))
}

function avg(arr) {
  const valid = arr.filter((v) => v !== null && !isNaN(v))
  if (!valid.length) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

// ─────────────────────────────────────────────────────────
// BTC Score (0-100)
// Sub-indicators: price vs MA200, RSI, Fear&Greed, volume, hashrate, on-chain
// ─────────────────────────────────────────────────────────
export function scoreBTC(btcData) {
  const { market, history, fearGreed, hashrate, onChain } = btcData || {}
  const scores = []

  // 1. Price vs 200-day MA (trend structure)
  if (market?.price && history?.ma200) {
    const ratio = market.price / history.ma200
    if (ratio > 1.6) scores.push(90)
    else if (ratio > 1.3) scores.push(78)
    else if (ratio > 1.1) scores.push(68)
    else if (ratio > 1.0) scores.push(58)
    else if (ratio > 0.85) scores.push(38)
    else if (ratio > 0.7) scores.push(22)
    else scores.push(10)
  }

  // 2. RSI 14 (contrarian: extreme oversold = buy, overbought = caution)
  if (history?.rsi14 !== null && history?.rsi14 !== undefined) {
    const rsi = history.rsi14
    if (rsi < 20) scores.push(92)
    else if (rsi < 30) scores.push(80)
    else if (rsi < 40) scores.push(68)
    else if (rsi < 50) scores.push(55)
    else if (rsi < 60) scores.push(48)
    else if (rsi < 70) scores.push(35)
    else if (rsi < 80) scores.push(22)
    else scores.push(10)
  }

  // 3. Fear & Greed (contrarian: extreme fear = accumulate)
  if (fearGreed?.current?.value !== undefined) {
    const fg = fearGreed.current.value
    if (fg < 10) scores.push(95)   // Extreme Fear = big buy signal
    else if (fg < 25) scores.push(82)
    else if (fg < 40) scores.push(68)
    else if (fg < 50) scores.push(55)
    else if (fg < 60) scores.push(48)
    else if (fg < 75) scores.push(35)
    else if (fg < 90) scores.push(20)
    else scores.push(8)    // Extreme Greed = sell signal
  }

  // 4. Volume vs 30-day average
  if (market?.volume24h && history?.avgVolume30d) {
    const ratio = market.volume24h / history.avgVolume30d
    if (ratio > 2.5) scores.push(80)
    else if (ratio > 1.5) scores.push(68)
    else if (ratio > 1.0) scores.push(55)
    else if (ratio > 0.7) scores.push(40)
    else scores.push(25)
  }

  // 5. Hashrate 7-day trend (network health)
  if (hashrate?.change7d !== null && hashrate?.change7d !== undefined) {
    const h = hashrate.change7d
    if (h > 5) scores.push(75)
    else if (h > 1) scores.push(62)
    else if (h > -1) scores.push(52)
    else if (h > -5) scores.push(38)
    else scores.push(22)
  }

  // 6. 24h price change (momentum)
  if (market?.change24h !== null && market?.change24h !== undefined) {
    const c = market.change24h
    if (c > 8) scores.push(78)
    else if (c > 3) scores.push(65)
    else if (c > 0) scores.push(55)
    else if (c > -3) scores.push(45)
    else if (c > -8) scores.push(32)
    else scores.push(15)
  }

  // 7. MVRV Z-Score (market value vs realized value)
  //    < 0 = deeply undervalued, > 7 = bubble territory
  if (onChain?.mvrvZscore !== null && onChain?.mvrvZscore !== undefined) {
    const z = onChain.mvrvZscore
    if (z < 0) scores.push(95)
    else if (z < 1) scores.push(78)
    else if (z < 2.5) scores.push(62)
    else if (z < 4) scores.push(48)
    else if (z < 6) scores.push(30)
    else scores.push(10)
  }

  // 8. LTH NUPL (long-term holder net unrealized profit/loss)
  //    < 0 = capitulation (buy), > 0.75 = euphoria (sell)
  if (onChain?.nuplLth !== null && onChain?.nuplLth !== undefined) {
    const n = onChain.nuplLth
    if (n < 0) scores.push(92)
    else if (n < 0.25) scores.push(75)
    else if (n < 0.5) scores.push(58)
    else if (n < 0.75) scores.push(40)
    else scores.push(15)
  }

  // 9. LTH SOPR (long-term holder spent output profit ratio)
  //    < 1 = selling at loss (bottom signal), > 1 = profit taking
  if (onChain?.lthSopr !== null && onChain?.lthSopr !== undefined) {
    const s = onChain.lthSopr
    if (s < 0.95) scores.push(90)
    else if (s < 1.0) scores.push(75)
    else if (s < 1.05) scores.push(55)
    else if (s < 1.2) scores.push(40)
    else scores.push(20)
  }

  const score = avg(scores)
  return {
    score: score !== null ? clamp(Math.round(score)) : null,
    components: {
      priceVsMA200: market?.price && history?.ma200 ? +(market.price / history.ma200).toFixed(3) : null,
      rsi14: history?.rsi14 ? +history.rsi14.toFixed(1) : null,
      fearGreed: fearGreed?.current?.value ?? null,
      fearGreedLabel: fearGreed?.current?.label ?? null,
      volumeRatio: market?.volume24h && history?.avgVolume30d
        ? +(market.volume24h / history.avgVolume30d).toFixed(2) : null,
      hashrateChange7d: hashrate?.change7d ? +hashrate.change7d.toFixed(2) : null,
      change24h: market?.change24h ? +market.change24h.toFixed(2) : null,
      mvrvZscore: onChain?.mvrvZscore ?? null,
      nuplLth: onChain?.nuplLth ?? null,
      lthSopr: onChain?.lthSopr ?? null,
    },
  }
}

// ─────────────────────────────────────────────────────────
// ETF Score (0-100)
// Based on 7-day price trends as flow proxies
// ─────────────────────────────────────────────────────────
export function scoreETF(etfList) {
  if (!etfList?.length) return { score: null, components: {} }

  const valid = etfList.filter((e) => e.data?.change7d !== null && e.data?.change7d !== undefined)
  if (!valid.length) return { score: null, components: {} }

  const avgChange7d = valid.reduce((s, e) => s + e.data.change7d, 0) / valid.length
  const positiveCount = valid.filter((e) => e.data.change7d > 0).length
  const flowDominance = positiveCount / valid.length // 0 to 1

  let score = 50
  // Adjust for average 7d performance
  if (avgChange7d > 15) score += 30
  else if (avgChange7d > 8) score += 20
  else if (avgChange7d > 3) score += 12
  else if (avgChange7d > 0) score += 5
  else if (avgChange7d > -3) score -= 5
  else if (avgChange7d > -8) score -= 15
  else score -= 25

  // Adjust for breadth (how many ETFs positive)
  score += (flowDominance - 0.5) * 20

  return {
    score: clamp(Math.round(score)),
    components: {
      avgChange7d: +avgChange7d.toFixed(2),
      positiveCount,
      totalTracked: valid.length,
      etfs: valid.map((e) => ({
        symbol: e.symbol,
        change7d: +e.data.change7d.toFixed(2),
        change1d: e.data.change1d ? +e.data.change1d.toFixed(2) : null,
        price: e.data.price,
      })),
    },
  }
}

// ─────────────────────────────────────────────────────────
// Macro Score (0-100)
// Fed rate trend, inflation, yield curve, dollar, stocks
// ─────────────────────────────────────────────────────────
export function scoreMacro(macroData, macroAssets) {
  if (!macroData && !macroAssets) return { score: null, components: {} }

  const scores = []

  // 1. Fed rate direction (cutting = bullish for risk assets)
  if (macroData?.fedFunds?.trend) {
    const t = macroData.fedFunds.trend
    if (t === 'falling') scores.push(85)
    else if (t === 'stable') scores.push(50)
    else scores.push(20) // rising = hawkish = bearish
  }

  // 2. Inflation trend (falling = bullish, allows easier monetary policy)
  if (macroData?.cpi?.trend) {
    const t = macroData.cpi.trend
    if (t === 'falling') scores.push(78)
    else if (t === 'stable') scores.push(52)
    else scores.push(25)
  }

  // 3. Unemployment (rising unemployment = potential risk-off)
  if (macroData?.unemployment?.trend) {
    const t = macroData.unemployment.trend
    if (t === 'falling') scores.push(65)
    else if (t === 'stable') scores.push(52)
    else scores.push(35)
  }

  // 4. Yield curve (spread = 10y - 2y; negative = inverted = recession risk)
  if (macroData?.yieldSpread !== null && macroData?.yieldSpread !== undefined) {
    const spread = parseFloat(macroData.yieldSpread)
    if (spread > 1.5) scores.push(75)
    else if (spread > 0.5) scores.push(62)
    else if (spread > 0) scores.push(52)
    else if (spread > -0.5) scores.push(42)
    else scores.push(28) // Deeply inverted
  }

  // 5. Dollar (UUP proxy): falling dollar = bullish for BTC/commodities
  if (macroAssets?.uup?.change7d !== null && macroAssets?.uup?.change7d !== undefined) {
    const d = macroAssets.uup.change7d
    if (d < -1.5) scores.push(80)
    else if (d < -0.5) scores.push(65)
    else if (d < 0.5) scores.push(52)
    else if (d < 1.5) scores.push(38)
    else scores.push(22)
  }

  // 6. Equities (SPY): risk-on correlation with BTC
  if (macroAssets?.spy?.change7d !== null && macroAssets?.spy?.change7d !== undefined) {
    const s = macroAssets.spy.change7d
    if (s > 3) scores.push(70)
    else if (s > 1) scores.push(60)
    else if (s > -1) scores.push(50)
    else if (s > -3) scores.push(38)
    else scores.push(25)
  }

  // 7. Gold (GLD): rising gold = uncertainty/inflation hedge (mixed for BTC)
  if (macroAssets?.gld?.change7d !== null && macroAssets?.gld?.change7d !== undefined) {
    const g = macroAssets.gld.change7d
    // Rising gold can mean BTC alternative demand (slightly positive) or safe haven (negative equities)
    if (g > 2) scores.push(60)
    else if (g > 0) scores.push(55)
    else scores.push(48)
  }

  // 8. Net Liquidity (Fed BS - TGA - RRP): rising = bullish for risk assets/BTC
  if (macroData?.netLiquidity?.trend) {
    const t = macroData.netLiquidity.trend
    if (t === 'rising') scores.push(78)
    else if (t === 'stable') scores.push(52)
    else scores.push(25) // falling liquidity = bearish
  }

  const score = avg(scores)
  return {
    score: score !== null ? clamp(Math.round(score)) : null,
    components: {
      fedRate: macroData?.fedFunds?.current ?? null,
      fedTrend: macroData?.fedFunds?.trend ?? null,
      cpiYoY: macroData?.cpi?.yoY ? parseFloat(macroData.cpi.yoY) : null,
      cpiTrend: macroData?.cpi?.trend ?? null,
      unemployment: macroData?.unemployment?.current ?? null,
      yield10y: macroData?.yield10y?.current ?? null,
      yield2y: macroData?.yield2y?.current ?? null,
      yieldSpread: macroData?.yieldSpread ? parseFloat(macroData.yieldSpread) : null,
      dxyChange7d: macroAssets?.uup?.change7d ?? null,
      spyChange7d: macroAssets?.spy?.change7d ?? null,
      goldChange7d: macroAssets?.gld?.change7d ?? null,
      netLiquidityTrend: macroData?.netLiquidity?.trend ?? null,
      netLiquidityT: macroData?.netLiquidity?.currentT ?? null,
    },
  }
}

// ─────────────────────────────────────────────────────────
// News/Geo Score (0-100)
// ─────────────────────────────────────────────────────────
export function scoreNews(newsData) {
  if (!newsData?.articles?.length) return { score: null, components: {} }

  const articles = newsData.articles.slice(0, 15)
  const total = articles.reduce((sum, a) => sum + a.sentiment, 0)
  const avg = total / articles.length
  // avg typically -3 to +3 → map to 0-100
  const score = clamp(Math.round(50 + avg * 10))
  const positive = articles.filter((a) => a.sentiment > 0).length
  const negative = articles.filter((a) => a.sentiment < 0).length

  return {
    score,
    components: {
      avgSentiment: +avg.toFixed(2),
      positiveCount: positive,
      negativeCount: negative,
      neutralCount: articles.length - positive - negative,
      totalArticles: articles.length,
    },
  }
}

// ─────────────────────────────────────────────────────────
// GLOBAL SCORE
// ─────────────────────────────────────────────────────────
export function computeGlobalScore(btcScore, etfScore, macroScore, newsScore) {
  const weights = { btc: 0.40, etf: 0.20, macro: 0.30, news: 0.10 }

  let weightedSum = 0
  let totalWeight = 0

  if (btcScore !== null) { weightedSum += btcScore * weights.btc; totalWeight += weights.btc }
  if (etfScore !== null) { weightedSum += etfScore * weights.etf; totalWeight += weights.etf }
  if (macroScore !== null) { weightedSum += macroScore * weights.macro; totalWeight += weights.macro }
  if (newsScore !== null) { weightedSum += newsScore * weights.news; totalWeight += weights.news }

  if (totalWeight === 0) return null

  // Normalize if some components missing
  const normalized = weightedSum / totalWeight
  return clamp(Math.round(normalized))
}

// ─────────────────────────────────────────────────────────
// Signal Label + Color
// ─────────────────────────────────────────────────────────
export function getSignal(score) {
  if (score === null) return { label: 'DONNÉES MANQUANTES', color: 'gray', emoji: '⏳', action: 'Configurez les API keys' }
  if (score >= 80) return { label: 'FORT ACHAT', color: 'green', emoji: '🟢', action: 'Accumulation agressive, DCA intensif' }
  if (score >= 65) return { label: 'ACHAT', color: 'green', emoji: '🟢', action: 'DCA régulier, accumulation modérée' }
  if (score >= 50) return { label: 'HOLD / WATCH', color: 'amber', emoji: '🟡', action: 'Maintenir positions, surveiller le marché' }
  if (score >= 35) return { label: 'PRUDENCE', color: 'red', emoji: '🔴', action: 'Réduire l\'exposition, activer les stop-loss' }
  return { label: 'VENTE / SORTIE', color: 'red', emoji: '🔴', action: 'Préservation du capital, mode risk-off' }
}

export function getScoreColor(score) {
  if (score === null) return '#6b7280'
  if (score >= 65) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}
