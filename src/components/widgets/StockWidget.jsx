/**
 * [변경 전]
 *   useLocalStorage('stock-watchlist', DEFAULT)  → [{ code, name }]
 *   useLocalStorage('stock-holdings',  {})        → { code: { qty, avgPrice } }
 *   → 관심종목·보유 정보가 각각 다른 localStorage 키에 분리 저장
 *
 * [변경 후]
 *   GET/POST/PATCH/DELETE /api/stocks → [{ id, code, name, qty, avg_price, sort_order }]
 *   → 단일 API 응답에 관심종목과 보유 정보가 통합, Supabase에 저장
 *
 * 필드 변화: avgPrice → avg_price (snake_case), id는 UUID로 변경
 * 함수 변화: removeStock(code) → removeStock(stock), pnl(code) → pnl(stock)
 */
import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import api from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Pencil } from 'lucide-react'

const API_KEY  = import.meta.env.VITE_KRX_API_KEY
const BASE_URL = 'https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function toItems(raw) {
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

function weekdayDate(daysBack = 0) {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1)
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0')
}

async function fetchStockByName(name) {
  for (let i = 0; i <= 4; i++) {
    const { data } = await axios.get(BASE_URL, {
      params: { serviceKey: API_KEY, numOfRows: 5, pageNo: 1, resultType: 'json', itmsNm: name, basDt: weekdayDate(i) },
    })
    const match = toItems(data?.response?.body?.items?.item).find(it => it.itmsNm === name)
    if (match) return match
  }
  return null
}

let _stockCache = null
async function loadAllStocks() {
  const today = weekdayDate(0)
  if (_stockCache?.date === today) return _stockCache.items
  for (let i = 0; i <= 4; i++) {
    const basDt = weekdayDate(i)
    const { data } = await axios.get(BASE_URL, {
      params: { serviceKey: API_KEY, numOfRows: 3000, pageNo: 1, resultType: 'json', basDt },
    })
    const items = toItems(data?.response?.body?.items?.item)
    if (items.length > 0) { _stockCache = { date: basDt, items }; return items }
  }
  return []
}

async function searchByName(query) {
  const all = await loadAllStocks()
  return all.filter(it => it.itmsNm?.includes(query.trim()))
}

export default function StockWidget() {
  // [변경] 두 개의 localStorage → 하나의 API 상태
  const [stocks,     setStocks]     = useState([])   // [{ id, code, name, qty, avg_price }]
  const [stockData,  setStockData]  = useState({})   // { code: KRX API 응답 }
  const [loadingSet, setLoadingSet] = useState(new Set())
  const [apiError,   setApiError]   = useState(null)

  const [showSearch,     setShowSearch]     = useState(false)
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState([])
  const [searching,      setSearching]      = useState(false)
  const [editingCode,    setEditingCode]    = useState(null)
  const [editQty,        setEditQty]        = useState('')
  const [editAvg,        setEditAvg]        = useState('')

  const fetchedRef    = useRef(new Set())
  const debouncedQuery = useDebounce(searchQuery, 450)

  useEffect(() => {
    api.get('/api/stocks')
      .then(r => setStocks(r.data))
      .catch(() => setApiError('주식 목록을 불러올 수 없습니다'))
  }, [])

  // stocks가 바뀌면 미조회 종목만 KRX API 호출 (기존 로직 유지)
  useEffect(() => {
    if (!API_KEY) { setApiError('API 키 없음 (VITE_KRX_API_KEY)'); return }
    const toFetch = stocks.filter(s => !fetchedRef.current.has(s.code))
    if (toFetch.length === 0) return

    toFetch.forEach(s => fetchedRef.current.add(s.code))
    setLoadingSet(prev => { const n = new Set(prev); toFetch.forEach(s => n.add(s.code)); return n })

    toFetch.forEach(({ code, name }) => {
      fetchStockByName(name)
        .then(item => { if (item) setStockData(prev => ({ ...prev, [code]: item })) })
        .catch(() => {})
        .finally(() => setLoadingSet(prev => { const n = new Set(prev); n.delete(code); return n }))
    })
  }, [stocks])

  useEffect(() => {
    if (debouncedQuery.trim().length < 1) { setSearchResults([]); return }
    const added = new Set(stocks.map(s => s.code))
    setSearching(true)
    searchByName(debouncedQuery)
      .then(items => setSearchResults(items.filter(it => !added.has(it.srtnCd?.trim()))))
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false))
  }, [debouncedQuery, stocks])

  // [변경] POST /api/stocks — 관심종목 추가
  async function addStock(item) {
    const code = item.srtnCd?.trim()
    if (!code || stocks.some(s => s.code === code)) return
    const { data } = await api.post('/api/stocks', { code, name: item.itmsNm })
    setStocks(prev => [...prev, data])
    setSearchQuery('')
    setSearchResults([])
  }

  // [변경] DELETE /api/stocks/:id — 관심종목 제거 (code 대신 stock 객체 전달)
  async function removeStock(stock) {
    await api.delete(`/api/stocks/${stock.id}`)
    setStocks(prev => prev.filter(s => s.id !== stock.id))
    setStockData(prev => { const n = { ...prev }; delete n[stock.code]; return n })
    fetchedRef.current.delete(stock.code)
    if (editingCode === stock.code) setEditingCode(null)
  }

  // [변경] openEdit: stock 객체에서 qty/avg_price 직접 읽기 (holdings 맵 불필요)
  function openEdit(stock) {
    if (editingCode === stock.code) { setEditingCode(null); return }
    setEditQty(stock.qty != null ? String(stock.qty) : '')
    setEditAvg(stock.avg_price != null ? String(stock.avg_price) : '')
    setEditingCode(stock.code)
  }

  // [변경] PATCH /api/stocks/:id — 보유 정보 수정
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

  // [변경] pnl: stock 객체에서 qty/avg_price 직접 사용
  function pnl(stock) {
    const d = stockData[stock.code]
    if (!stock.qty || !d) return null
    const current = Number(d.clpr)
    const cost    = stock.qty * stock.avg_price
    const value   = stock.qty * current
    const abs     = value - cost
    const pct     = (abs / cost) * 100
    return { abs, pct, value }
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
            const d = stockData[s.code]
            const isLoading = loadingSet.has(s.code)
            const p         = pnl(s)
            const isEditing = editingCode === s.code
            const fltRt     = d ? parseFloat(d.fltRt) : 0

            return (
              <div key={s.code}>
                <div className="flex items-center gap-2 group py-1">
                  <button onClick={() => removeStock(s)}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-card-foreground truncate">{s.name}</div>
                    {d?.mrktCtg && <div className="text-xs text-muted-foreground">{d.mrktCtg}</div>}
                  </div>
                  {isLoading ? (
                    <div className="animate-pulse space-y-1 items-end flex flex-col">
                      <div className="h-4 w-14 bg-muted rounded" />
                      <div className="h-3 w-18 bg-muted rounded" />
                    </div>
                  ) : d ? (
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold tabular-nums">{Number(d.clpr).toLocaleString()}원</div>
                      <div className={`text-xs tabular-nums ${clr(fltRt)}`}>
                        {sign(fltRt)}{Number(d.vs).toLocaleString()} ({sign(fltRt)}{parseFloat(d.fltRt).toFixed(2)}%)
                      </div>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">-</span>}
                  {d && (
                    <button onClick={() => openEdit(s)}
                      className={`flex-shrink-0 transition-all ${isEditing ? 'text-primary' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* [변경] p는 stock 객체에서 바로 계산 — holdings 맵 불필요 */}
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
                        <Input type="number" min="0" value={editQty} onChange={e => setEditQty(e.target.value)} placeholder="0" className="h-8 text-sm" />
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
                placeholder="종목명 검색..." className="h-9 text-sm pr-8" />
              {searching && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-0.5 max-h-44 overflow-y-auto">
                {searchResults.map(item => (
                  <button key={item.srtnCd} onClick={() => addStock(item)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left">
                    <div>
                      <span className="text-sm text-card-foreground">{item.itmsNm}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{item.srtnCd?.trim()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{item.mrktCtg}</span>
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
