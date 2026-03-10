import axios from 'axios'
import { cacheGet, cacheSet } from './cache.js'

const TTL = 20 * 60 * 1000 // 20 min
const RSS2JSON = 'https://api.rss2json.com/v1/api.json'
const CRYPTOPANIC = 'https://cryptopanic.com/api/free/v1/posts'

// Sentiment keywords (simple lexicon approach)
const POSITIVE_WORDS = [
  'surge', 'rally', 'bullish', 'breakout', 'record', 'adoption', 'approval',
  'growth', 'rise', 'gain', 'positive', 'innovation', 'partnership', 'accumulate',
  'institutional', 'inflows', 'all-time', 'etf approved', 'regulation clarity',
]
const NEGATIVE_WORDS = [
  'crash', 'ban', 'hack', 'seized', 'fraud', 'bearish', 'collapse', 'fear',
  'warning', 'risk', 'decline', 'sell-off', 'regulation', 'sanctions', 'crisis',
  'war', 'conflict', 'inflation', 'recession', 'default', 'fail', 'scam', 'exploit',
]

export function scoreSentiment(text) {
  const lower = text.toLowerCase()
  let score = 0
  POSITIVE_WORDS.forEach((w) => { if (lower.includes(w)) score += 1 })
  NEGATIVE_WORDS.forEach((w) => { if (lower.includes(w)) score -= 1 })
  return score
}

// ── CryptoPanic (best source for BTC news with sentiment) ─
async function fetchCryptoPanic(apiKey) {
  const cacheKey = 'news_cryptopanic'
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const params = { currencies: 'BTC', kind: 'news', public: 'true' }
  if (apiKey) params.auth_token = apiKey

  const { data } = await axios.get(CRYPTOPANIC, { params, timeout: 10000 })

  const articles = (data.results || []).slice(0, 15).map((item) => {
    const text = item.title + ' ' + (item.body || '')
    const sentiment = scoreSentiment(text)
    return {
      title: item.title,
      url: item.url,
      source: item.source?.title ?? 'CryptoPanic',
      publishedAt: item.published_at,
      sentiment,
      votes: {
        positive: item.votes?.positive ?? 0,
        negative: item.votes?.negative ?? 0,
        important: item.votes?.important ?? 0,
      },
    }
  })

  const result = { articles, source: 'CryptoPanic' }
  cacheSet(cacheKey, result, TTL)
  return result
}

// ── RSS fallback (CoinDesk + Reuters Finance) ─────────────
async function fetchRSSFeed(feedUrl, label) {
  const { data } = await axios.get(RSS2JSON, {
    params: { rss_url: feedUrl, count: 10 },
    timeout: 10000,
  })

  return (data.items || []).map((item) => {
    const text = item.title + ' ' + (item.description || '')
    return {
      title: item.title,
      url: item.link,
      source: label,
      publishedAt: item.pubDate,
      sentiment: scoreSentiment(text),
      votes: null,
    }
  })
}

async function fetchRSSFallback() {
  const cacheKey = 'news_rss'
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const feeds = [
    ['https://www.coindesk.com/arc/outboundfeeds/rss/', 'CoinDesk'],
    ['https://cointelegraph.com/rss', 'CoinTelegraph'],
  ]

  const results = await Promise.allSettled(
    feeds.map(([url, label]) => fetchRSSFeed(url, label))
  )

  const articles = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 15)

  const result = { articles, source: 'RSS' }
  cacheSet(cacheKey, result, TTL)
  return result
}

// ── Overall news sentiment score (0-100) ─────────────────
export function computeNewsSentimentScore(articles) {
  if (!articles?.length) return 50
  const total = articles.reduce((sum, a) => sum + a.sentiment, 0)
  const avg = total / articles.length
  // avg typically ranges -3 to +3, map to 0-100
  const normalized = Math.max(0, Math.min(100, 50 + avg * 10))
  return Math.round(normalized)
}

// ── Main export ───────────────────────────────────────────
export async function fetchNews(cryptoPanicKey) {
  try {
    if (cryptoPanicKey) {
      return await fetchCryptoPanic(cryptoPanicKey)
    }
    // Try CryptoPanic without key (limited but works)
    try {
      return await fetchCryptoPanic(null)
    } catch {
      return await fetchRSSFallback()
    }
  } catch (err) {
    try {
      return await fetchRSSFallback()
    } catch {
      return { articles: [], source: 'none', error: err.message }
    }
  }
}
