/**
 * Simple localStorage-based cache to avoid hitting API rate limits.
 * Each entry is stored with a timestamp and TTL (time-to-live).
 */

const PREFIX = 'finhub_'

export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const { data, expiry } = JSON.parse(raw)
    if (Date.now() > expiry) {
      localStorage.removeItem(PREFIX + key)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function cacheSet(key, data, ttlMs = 15 * 60 * 1000) {
  try {
    const entry = { data, expiry: Date.now() + ttlMs }
    localStorage.setItem(PREFIX + key, JSON.stringify(entry))
  } catch {
    // storage full or private browsing — ignore silently
  }
}

export function cacheClear() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k))
}
