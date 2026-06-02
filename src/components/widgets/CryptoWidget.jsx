/**
 * [변경 전]
 *   useLocalStorage('crypto-watchlist', DEFAULT) → [{ id, name, symbol }]
 *   useLocalStorage('crypto-holdings',  {})       → { id: { qty, avgPrice } }
 *
 * [변경 후]
 *   GET/POST/PATCH/DELETE /api/cryptos → [{ id(uuid), coin_id, name, symbol, qty, avg_price }]
 *   → Supabase에 통합 저장, avgPrice → avg_price
 */
import { useEffect, useState } from 'react'
import axios from 'axios'
import api from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Pencil } from 'lucide-react'

const COINGECKO = 'https://api.coingecko.com/api/v3'
const CG_KEY    = import.meta.env.VITE_COINGECKO_API_KEY
const cgHeaders = CG_KEY ? { 'x-cg-demo-api-key': CG_KEY } : {}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function formatKrw(n) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}억`
  if (n >= 1e4) return `${(n / 1e4).toFixed(0)}만`
  return n.toLocaleString()
}

export default function CryptoWidget() {
  // [변경] 두 개의 localStorage → 단일 API 상태
  const [coins,          setCoins]          = useState([])  // [{ id(uuid), coin_id, name, symbol, qty, avg_price }]
  const [prices,         setPrices]         = useState({})
  const [initialLoading, setInitialLoading] = useState(true)

  const [showSearch,    setShowSearch]    = useState(false)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching,     setSearching]     = useState(false)
  const [editingId,     setEditingId]     = useState(null)  // coin_id (CoinGecko ID)
  const [editQty,       setEditQty]       = useState('')
  const [editAvg,       setEditAvg]       = useState('')

  const debouncedQuery = useDebounce(searchQuery, 400)

  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    api.get('/api/cryptos')
      .then(r => setCoins(r.data))
      .catch(() => { setFetchError('코인 목록을 불러올 수 없습니다'); setInitialLoading(false) })
  }, [])

  // CoinGecko 가격 조회 (watchlist 변경 시 재조회)
  useEffect(() => {
    if (coins.length === 0) { setInitialLoading(false); return }
    const ids = coins.map(c => c.coin_id).join(',')
    axios.get(`${COINGECKO}/simple/price`, {
      headers: cgHeaders,
      params: { ids, vs_currencies: 'krw', include_24hr_change: 'true' },
    })
      .then(r => setPrices(prev => ({ ...prev, ...r.data })))
      .catch(() => {})
      .finally(() => setInitialLoading(false))
  }, [coins])

  useEffect(() => {
    if (debouncedQuery.trim().length < 1) { setSearchResults([]); return }
    const added = new Set(coins.map(c => c.coin_id))
    setSearching(true)
    axios.get(`${COINGECKO}/search`, { headers: cgHeaders, params: { query: debouncedQuery } })
      .then(r => setSearchResults((r.data.coins || []).filter(c => !added.has(c.id)).slice(0, 8)))
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false))
  }, [debouncedQuery, coins])

  // [변경] POST /api/cryptos
  async function addCoin(coin) {
    if (coins.some(c => c.coin_id === coin.id)) return
    const { data } = await api.post('/api/cryptos', {
      coin_id: coin.id,
      name:    coin.name,
      symbol:  coin.symbol.toUpperCase(),
    })
    setCoins(prev => [...prev, data])
    setSearchQuery('')
    setSearchResults([])
  }

  // [변경] DELETE /api/cryptos/:id (UUID PK)
  async function removeCoin(coin) {
    await api.delete(`/api/cryptos/${coin.id}`)
    setCoins(prev => prev.filter(c => c.id !== coin.id))
    setPrices(prev => { const n = { ...prev }; delete n[coin.coin_id]; return n })
    if (editingId === coin.coin_id) setEditingId(null)
  }

  // [변경] openEdit: avg_price 직접 읽기 (holdings 맵 불필요)
  function openEdit(coin) {
    if (editingId === coin.coin_id) { setEditingId(null); return }
    setEditQty(coin.qty != null ? String(coin.qty) : '')
    setEditAvg(coin.avg_price != null ? String(coin.avg_price) : '')
    setEditingId(coin.coin_id)
  }

  // [변경] PATCH /api/cryptos/:id
  async function saveHolding(coin) {
    const qty       = parseFloat(editQty)
    const avg_price = parseFloat(String(editAvg).replace(/,/g, ''))
    const update = (!isNaN(qty) && !isNaN(avg_price) && qty > 0 && avg_price > 0)
      ? { qty, avg_price }
      : { qty: null, avg_price: null }
    const { data } = await api.patch(`/api/cryptos/${coin.id}`, update)
    setCoins(prev => prev.map(c => c.id === coin.id ? data : c))
    setEditingId(null)
  }

  // [변경] pnl: coin 객체에서 직접 계산
  function pnl(coin) {
    const p = prices[coin.coin_id]
    if (!coin.qty || !p) return null
    const current = p.krw
    const cost    = coin.qty * coin.avg_price
    const value   = coin.qty * current
    const abs     = value - cost
    const pct     = (abs / cost) * 100
    return { abs, pct }
  }

  function clr(n) {
    if (n > 0) return 'text-emerald-400'
    if (n < 0) return 'text-red-400'
    return 'text-muted-foreground'
  }
  function sign(n) { return n >= 0 ? '+' : '' }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-3">
        <CardTitle className="text-sm font-bold text-foreground">🪙 가상화폐</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => { setShowSearch(v => !v); setSearchQuery(''); setSearchResults([]) }}>
          {showSearch ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 flex-1">
        {fetchError && <p className="text-sm text-destructive text-center py-2">{fetchError}</p>}
        {coins.length === 0 && !showSearch && !fetchError && (
          <p className="text-sm text-muted-foreground text-center py-2">+ 버튼으로 코인을 추가하세요</p>
        )}

        <div className="space-y-1">
          {coins.map(coin => {
            const p         = prices[coin.coin_id]
            const isLoading = initialLoading && !p
            const change    = p?.krw_24h_change ?? 0
            const pl        = pnl(coin)
            const isEditing = editingId === coin.coin_id

            return (
              <div key={coin.id}>
                <div className="flex items-center gap-2 group py-1">
                  <button onClick={() => removeCoin(coin)}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-card-foreground">{coin.name}</div>
                    <div className="text-xs text-muted-foreground">{coin.symbol}</div>
                  </div>
                  {isLoading ? (
                    <div className="animate-pulse space-y-1 items-end flex flex-col">
                      <div className="h-4 w-16 bg-muted rounded" />
                      <div className="h-3 w-12 bg-muted rounded" />
                    </div>
                  ) : p ? (
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold tabular-nums">{formatKrw(p.krw)}원</div>
                      <div className={`text-xs tabular-nums ${clr(change)}`}>{sign(change)}{change.toFixed(2)}%</div>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">-</span>}
                  {p && (
                    <button onClick={() => openEdit(coin)}
                      className={`flex-shrink-0 transition-all ${isEditing ? 'text-primary' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {pl && !isEditing && (
                  <div className="ml-5 mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{coin.qty} {coin.symbol} × {coin.avg_price.toLocaleString()}원</span>
                    <span className={`tabular-nums font-medium ${clr(pl.abs)}`}>
                      {sign(pl.abs)}{formatKrw(Math.round(pl.abs))}원 ({sign(pl.pct)}{pl.pct.toFixed(2)}%)
                    </span>
                  </div>
                )}

                {isEditing && (
                  <div className="ml-5 mb-2 p-2 bg-muted/30 rounded-md space-y-1.5">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-0.5">수량</label>
                        <Input type="number" min="0" step="any" value={editQty} onChange={e => setEditQty(e.target.value)} placeholder="0" className="h-8 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-0.5">평균단가 (원)</label>
                        <Input type="number" min="0" value={editAvg} onChange={e => setEditAvg(e.target.value)} placeholder="0" className="h-8 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => saveHolding(coin)} size="sm" className="flex-1 text-xs h-7">저장</Button>
                      <Button onClick={() => setEditingId(null)} variant="ghost" size="sm" className="flex-1 text-xs h-7">취소</Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {showSearch && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <div className="relative">
              <Input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="코인명 또는 심볼 검색..." className="h-9 text-sm pr-8" />
              {searching && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-0.5 max-h-44 overflow-y-auto">
                {searchResults.map(coin => (
                  <button key={coin.id} onClick={() => addCoin(coin)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left">
                    <div>
                      <span className="text-sm text-card-foreground">{coin.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{coin.symbol?.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {coin.market_cap_rank && <span className="text-xs text-muted-foreground">#{coin.market_cap_rank}</span>}
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.trim() && !searching && searchResults.length === 0 && (
              <p className="text-xs text-muted-foreground px-1">검색 결과가 없습니다</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
