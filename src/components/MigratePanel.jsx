import { useState, useEffect } from 'react'
import { openDB } from 'idb'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Database } from 'lucide-react'
import api from '@/lib/api'

const DB_NAME    = 'dashboard-db'
const DB_VERSION = 1

async function readIndexedDB(storeName) {
  try {
    const db = await openDB(DB_NAME, DB_VERSION)
    if (!db.objectStoreNames.contains(storeName)) return []
    return await db.getAll(storeName)
  } catch { return [] }
}

function readLS(key) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') } catch { return null }
}

async function scanLocalData() {
  const [memos, bookmarks] = await Promise.all([
    readIndexedDB('memos'),
    readIndexedDB('bookmarks'),
  ])
  return {
    todos:          readLS('dashboard-todos')  ?? [],
    stockWatch:     readLS('stock-watchlist')  ?? [],
    stockHold:      readLS('stock-holdings')   ?? {},
    cryptoWatch:    readLS('crypto-watchlist') ?? [],
    cryptoHold:     readLS('crypto-holdings')  ?? {},
    budget:         readLS('budget-expenses')  ?? [],
    rssFeeds:       readLS('rss-feeds')        ?? [],
    memos,
    bookmarks,
  }
}

const LABEL = {
  todos: '할일', memos: '메모', bookmarks: '북마크',
  stockWatch: '주식', cryptoWatch: '코인', budget: '지출', rssFeeds: 'RSS',
}

export default function MigratePanel({ onClose }) {
  const [data,    setData]    = useState(null)
  const [status,  setStatus]  = useState('idle') // idle | running | done | error
  const [log,     setLog]     = useState([])

  useEffect(() => { scanLocalData().then(setData) }, [])

  const counts = data ? {
    todos:      data.todos.length,
    memos:      data.memos.length,
    bookmarks:  data.bookmarks.length,
    stockWatch: data.stockWatch.length,
    cryptoWatch:data.cryptoWatch.length,
    budget:     data.budget.length,
    rssFeeds:   data.rssFeeds.length,
  } : {}

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  if (!data || total === 0) return null

  const push = (msg) => setLog(prev => [...prev, msg])

  async function migrate() {
    setStatus('running')
    setLog([])
    try {
      // ── Todos ───────────────────────────────────────────────
      if (data.todos.length) {
        push(`📝 할일 ${data.todos.length}개 마이그레이션...`)
        let ok = 0
        for (const t of data.todos) {
          try { await api.post('/api/todos', { text: t.text, done: t.done ?? false }); ok++ } catch { /* ignore */ }
        }
        push(`   ${ok}/${data.todos.length} 완료`)
      }

      // ── Memos (text → content) ──────────────────────────────
      if (data.memos.length) {
        push(`📋 메모 ${data.memos.length}개 마이그레이션...`)
        let ok = 0
        for (const m of data.memos) {
          try { await api.post('/api/memos', { content: m.text ?? m.content }); ok++ } catch { /* ignore */ }
        }
        push(`   ${ok}/${data.memos.length} 완료`)
      }

      // ── Bookmarks ───────────────────────────────────────────
      if (data.bookmarks.length) {
        push(`🔖 북마크 ${data.bookmarks.length}개 마이그레이션...`)
        let ok = 0
        for (const b of data.bookmarks) {
          try { await api.post('/api/bookmarks', { title: b.title, url: b.url }); ok++ } catch { /* ignore */ }
        }
        push(`   ${ok}/${data.bookmarks.length} 완료`)
      }

      // ── Stocks (watchlist → POST, holdings → PATCH) ─────────
      if (data.stockWatch.length) {
        push(`📈 주식 ${data.stockWatch.length}개 마이그레이션...`)
        let ok = 0
        for (const s of data.stockWatch) {
          try {
            const { data: created } = await api.post('/api/stocks', { code: s.code, name: s.name })
            const h = data.stockHold[s.code]
            if (h?.qty && h?.avgPrice) {
              await api.patch(`/api/stocks/${created.id}`, { qty: h.qty, avg_price: h.avgPrice })
            }
            ok++
          } catch { /* ignore */ }
        }
        push(`   ${ok}/${data.stockWatch.length} 완료`)
      }

      // ── Cryptos ─────────────────────────────────────────────
      if (data.cryptoWatch.length) {
        push(`🪙 코인 ${data.cryptoWatch.length}개 마이그레이션...`)
        let ok = 0
        for (const c of data.cryptoWatch) {
          try {
            const { data: created } = await api.post('/api/cryptos', {
              coin_id: c.id, name: c.name, symbol: c.symbol,
            })
            const h = data.cryptoHold[c.id]
            if (h?.qty && h?.avgPrice) {
              await api.patch(`/api/cryptos/${created.id}`, { qty: h.qty, avg_price: h.avgPrice })
            }
            ok++
          } catch { /* ignore */ }
        }
        push(`   ${ok}/${data.cryptoWatch.length} 완료`)
      }

      // ── Budget ──────────────────────────────────────────────
      if (data.budget.length) {
        push(`💰 지출 ${data.budget.length}건 마이그레이션...`)
        let ok = 0
        for (const b of data.budget) {
          try {
            await api.post('/api/budget_expenses', {
              date: b.date, category: b.category, amount: b.amount, memo: b.memo ?? null,
            })
            ok++
          } catch { /* ignore */ }
        }
        push(`   ${ok}/${data.budget.length} 완료`)
      }

      // ── RSS ─────────────────────────────────────────────────
      if (data.rssFeeds.length) {
        push(`📡 RSS ${data.rssFeeds.length}개 마이그레이션...`)
        let ok = 0
        for (const f of data.rssFeeds) {
          try { await api.post('/api/rss_feeds', { url: f.url, name: f.name }); ok++ } catch { /* ignore */ }
        }
        push(`   ${ok}/${data.rssFeeds.length} 완료`)
      }

      push('🎉 완료!')
      setStatus('done')
    } catch (e) {
      push(`❌ 오류: ${e.message}`)
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">데이터 마이그레이션</CardTitle>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'idle' && (
            <>
              <p className="text-sm text-muted-foreground">
                로컬에 저장된 데이터를 Supabase로 옮깁니다. 중복 데이터가 생길 수 있으니 한 번만 실행하세요.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
                  <div key={k} className="flex justify-between bg-muted/30 rounded px-2.5 py-1 text-xs">
                    <span className="text-muted-foreground">{LABEL[k]}</span>
                    <span className="font-medium">{v}개</span>
                  </div>
                ))}
              </div>
              <Button onClick={migrate} className="w-full">
                마이그레이션 시작 ({total}개)
              </Button>
            </>
          )}

          {status !== 'idle' && (
            <div className="space-y-3">
              <div className="bg-muted/30 rounded-lg p-3 max-h-52 overflow-y-auto space-y-0.5">
                {log.map((line, i) => (
                  <p key={i} className="text-xs font-mono text-card-foreground whitespace-pre">{line}</p>
                ))}
                {status === 'running' && (
                  <div className="flex gap-1.5 items-center pt-1">
                    <div className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-muted-foreground">진행 중...</span>
                  </div>
                )}
              </div>
              {status === 'done'  && <Button onClick={onClose} className="w-full">닫기</Button>}
              {status === 'error' && <Button onClick={migrate} variant="outline" className="w-full">다시 시도</Button>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
