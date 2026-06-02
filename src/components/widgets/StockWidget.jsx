import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import api from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Pencil } from 'lucide-react'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// Yahoo Finance 시세 조회 — symbol: '005930.KS'
async function fetchQuote(symbol) {
  const { data } = await axios.get('/api/stock-price/quote', { params: { symbol }, timeout: 10000 })
  return data  // { price, change, changeRate, market }
}

// Yahoo Finance 종목 검색
async function searchStocks(query) {
  const { data } = await axios.get('/api/stock-price/search', { params: { query }, timeout: 10000 })
  return data  // [{ symbol, name, exchange }]
}

export default function StockWidget() {
  const [stocks,      setStocks]      = useState([])   // Supabase: [{ id, code(=symbol), name, qty, avg_price }]
  const [quotes,      setQuotes]      = useState({})   // { symbol: { price, change, changeRate, market } }
  const [loadingSet,  setLoadingSet]  = useState(new Set())
  const [apiError,    setApiError]    = useState(null)

  const [showSearch,    setShowSearch]    = useState(false)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching,     setSearching]     = useState(false)
  const [editingCode,   setEditingCode]   = useState(null)
  const [editQty,       setEditQty]       = useState('')
  const [editAvg,       setEditAvg]       = useState('')

  const fetchedRef     = useRef(new Set())
  const debouncedQuery = useDebounce(searchQuery, 450)

  // DB에서 관심종목 로드
  useEffect(() => {
    api.get('/api/stocks')
      .then(r => setStocks(r.data))
      .catch(() => setApiError('주식 목록을 불러올 수 없습니다'))
  }, [])

  // 새 종목 생기면 Yahoo Finance에서 시세 조회
  useEffect(() => {
    const toFetch = stocks.filter(s => !fetchedRef.current.has(s.code))
    if (toFetch.length === 0) return

    toFetch.forEach(s => fetchedRef.current.add(s.code))
    setLoadingSet(prev => { const n = new Set(prev); toFetch.forEach(s => n.add(s.code)); return n })

    toFetch.forEach(({ code }) => {
      fetchQuote(code)
        .then(q => setQuotes(prev => ({ ...prev, [code]: q })))
        .catch(() => {})
        .finally(() => setLoadingSet(prev => { const n = new Set(prev); n.delete(code); return n }))
    })
  }, [stocks])

  // 종목 검색
  useEffect(() => {
    if (debouncedQuery.trim().length < 1) { setSearchResults([]); return }
    const added = new Set(stocks.map(s => s.code))
    setSearching(true)
    searchStocks(debouncedQuery)
      .then(items => setSearchResults(items.filter(it => !added.has(it.symbol))))
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false))
  }, [debouncedQuery, stocks])

  // 종목 추가 — Yahoo symbol을 code로 저장
  async function addStock(item) {
    if (stocks.some(s => s.code === item.symbol)) return
    const { data } = await api.post('/api/stocks', { code: item.symbol, name: item.name })
    setStocks(prev => [...prev, data])
    setSearchQuery('')
    setSearchResults([])
  }

  async function removeStock(stock) {
    await api.delete(`/api/stocks/${stock.id}`)
    setStocks(prev => prev.filter(s => s.id !== stock.id))
    setQuotes(prev => { const n = { ...prev }; delete n[stock.code]; return n })
    fetchedRef.current.delete(stock.code)
    if (editingCode === stock.code) setEditingCode(null)
  }

  function openEdit(stock) {
    if (editingCode === stock.code) { setEditingCode(null); return }
    setEditQty(stock.qty != null ? String(stock.qty) : '')
    setEditAvg(stock.avg_price != null ? String(stock.avg_price) : '')
    setEditingCode(stock.code)
  }

  async function saveHolding(stock) {
    const qty       = parseFloat(editQty)
    const avg_price = parseFloat(String(editAvg).replace(/,/g, ''))
    const update = (!isNaN(qty) && !isNaN(avg_price) && qty > 0 && avg_price > 0)
      ? { qty, avg_price }
      : { qty: null, avg_price: null }
    const { data } = await api.patch(`/api/stocks/${stock.id}`, update)
    setStocks(prev => prev.map(s => s.id === stock.id ? data : s))
    setEditingCode(null)
  }

  function pnl(stock) {
    const q = quotes[stock.code]
    if (!stock.qty || !q) return null
    const cost  = stock.qty * stock.avg_price
    const value = stock.qty * q.price
    const abs   = value - cost
    const pct   = (abs / cost) * 100
    return { abs, pct }
  }

  function sign(n) { return n >= 0 ? '+' : '' }
  function clr(n) {
    if (n > 0) return 'text-emerald-400'
    if (n < 0) return 'text-red-400'
    return 'text-muted-foreground'
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-3">
        <CardTitle className="text-sm font-bold text-foreground">📈 주가</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => { setShowSearch(v => !v); setSearchQuery(''); setSearchResults([]) }}>
          {showSearch ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </Button>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0 flex-1">
        {apiError && <p className="text-sm text-destructive mb-2">{apiError}</p>}
        {stocks.length === 0 && !showSearch && (
          <p className="text-sm text-muted-foreground text-center py-2">+ 버튼으로 종목을 추가하세요</p>
        )}

        <div className="space-y-1">
          {stocks.map(s => {
            const q         = quotes[s.code]
            const isLoading = loadingSet.has(s.code)
            const p         = pnl(s)
            const isEditing = editingCode === s.code

            return (
              <div key={s.code}>
                <div className="flex items-center gap-2 group py-1">
                  <button onClick={() => removeStock(s)}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-card-foreground truncate">{s.name}</div>
                    {q?.market && <div className="text-xs text-muted-foreground">{q.market}</div>}
                  </div>
                  {isLoading ? (
                    <div className="animate-pulse space-y-1 items-end flex flex-col">
                      <div className="h-4 w-14 bg-muted rounded" />
                      <div className="h-3 w-16 bg-muted rounded" />
                    </div>
                  ) : q ? (
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold tabular-nums">
                        {q.price.toLocaleString()}원
                      </div>
                      <div className={`text-xs tabular-nums ${clr(q.changeRate)}`}>
                        {sign(q.change)}{q.change.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({sign(q.changeRate)}{q.changeRate.toFixed(2)}%)
                      </div>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">-</span>}
                  {q && (
                    <button onClick={() => openEdit(s)}
                      className={`flex-shrink-0 transition-all ${isEditing ? 'text-primary' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {p && !isEditing && (
                  <div className="ml-5 mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{s.qty}주 × {s.avg_price.toLocaleString()}원</span>
                    <span className={`tabular-nums font-medium ${clr(p.abs)}`}>
                      {sign(p.abs)}{Math.round(p.abs).toLocaleString()}원 ({sign(p.pct)}{p.pct.toFixed(2)}%)
                    </span>
                  </div>
                )}

                {isEditing && (
                  <div className="ml-5 mb-2 p-2 bg-muted/30 rounded-md space-y-1.5">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-0.5">수량 (주)</label>
                        <Input type="number" min="0" value={editQty} onChange={e => setEditQty(e.target.value)} placeholder="0" className="h-8 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground block mb-0.5">평균단가 (원)</label>
                        <Input type="number" min="0" value={editAvg} onChange={e => setEditAvg(e.target.value)} placeholder="0" className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => saveHolding(s)} size="sm" className="flex-1 text-xs h-7">저장</Button>
                      <Button onClick={() => setEditingCode(null)} variant="ghost" size="sm" className="flex-1 text-xs h-7">취소</Button>
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
                placeholder="영문으로 검색 (예: Samsung, Kakao)" className="h-9 text-sm pr-8" />
              {searching && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-0.5 max-h-44 overflow-y-auto">
                {searchResults.map(item => (
                  <button key={item.symbol} onClick={() => addStock(item)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left">
                    <div>
                      <span className="text-sm text-card-foreground">{item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{item.symbol}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{item.exchange}</span>
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
