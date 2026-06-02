import { create } from 'zustand'
import axios from 'axios'

export const useDataStore = create((set) => ({
  // ── Weather ──────────────────────────────────────────────────────────
  weather: null,
  weatherLoaded: false,
  fetchWeather: async (city = 'Seoul') => {
    try {
      const { data } = await axios.get('/api/weather', { params: { city } })
      set({ weather: data, weatherLoaded: true })
    } catch {
      set({ weatherLoaded: true })
    }
  },

  // ── Exchange rates ────────────────────────────────────────────────────
  exchange: null,
  exchangeLoaded: false,
  fetchExchange: async (base = 'USD') => {
    try {
      const { data } = await axios.get('/api/exchange', { params: { base } })
      set({ exchange: data, exchangeLoaded: true })
    } catch {
      set({ exchangeLoaded: true })
    }
  },

  // ── News headline ─────────────────────────────────────────────────────
  newsHeadline: null,
  newsLoaded: false,
  fetchNews: async (query = '최신') => {
    try {
      const { data } = await axios.get('/api/naver-news', { params: { query } })
      set({ newsHeadline: data.items?.[0] ?? null, newsLoaded: true })
    } catch {
      set({ newsLoaded: true })
    }
  },

  // ── Crypto (BTC + ETH preview) ────────────────────────────────────────
  crypto: null,
  cryptoLoaded: false,
  fetchCrypto: async () => {
    try {
      const { data } = await axios.get('/api/crypto-price')
      set({ crypto: data, cryptoLoaded: true })
    } catch {
      set({ cryptoLoaded: true })
    }
  },
}))
