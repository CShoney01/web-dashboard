import { create } from 'zustand'
import axios from 'axios'

export const useDataStore = create((set) => ({
  // ── Weather ──────────────────────────────────────────────────────────
  weather: null,
  weatherLoaded: false,
  fetchWeather: async () => {
    const apiKey = import.meta.env.VITE_WEATHER_API_KEY
    const city   = import.meta.env.VITE_WEATHER_CITY || 'Seoul'
    if (!apiKey) { set({ weatherLoaded: true }); return }
    try {
      const { data } = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: { q: city, appid: apiKey, units: 'metric', lang: 'kr' },
      })
      set({ weather: data, weatherLoaded: true })
    } catch {
      set({ weatherLoaded: true })
    }
  },

  // ── Exchange rates ────────────────────────────────────────────────────
  exchange: null,
  exchangeLoaded: false,
  fetchExchange: async () => {
    const apiKey = import.meta.env.VITE_EXCHANGE_API_KEY
    const base   = import.meta.env.VITE_EXCHANGE_BASE || 'USD'
    if (!apiKey) { set({ exchangeLoaded: true }); return }
    try {
      const { data } = await axios.get(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`
      )
      set({ exchange: { rates: data.conversion_rates, base }, exchangeLoaded: true })
    } catch {
      set({ exchangeLoaded: true })
    }
  },

  // ── News headline ─────────────────────────────────────────────────────
  newsHeadline: null,
  newsLoaded: false,
  fetchNews: async () => {
    const clientId     = import.meta.env.VITE_NAVER_CLIENT_ID
    const clientSecret = import.meta.env.VITE_NAVER_CLIENT_SECRET
    const query        = import.meta.env.VITE_NEWS_QUERY || '최신'
    if (!clientId || !clientSecret) { set({ newsLoaded: true }); return }
    try {
      const { data } = await axios.get('/naver-news', {
        params: { query, display: 1, sort: 'date' },
        headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
      })
      set({ newsHeadline: data.items?.[0] ?? null, newsLoaded: true })
    } catch {
      set({ newsLoaded: true })
    }
  },

  // ── Crypto (BTC + ETH preview) ────────────────────────────────────────
  crypto: null,
  cryptoLoaded: false,
  fetchCrypto: async () => {
    const cgKey  = import.meta.env.VITE_COINGECKO_API_KEY
    const headers = cgKey ? { 'x-cg-demo-api-key': cgKey } : {}
    try {
      const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        headers,
        params: { ids: 'bitcoin,ethereum', vs_currencies: 'krw', include_24hr_change: 'true' },
      })
      set({ crypto: data, cryptoLoaded: true })
    } catch {
      set({ cryptoLoaded: true })
    }
  },
}))
