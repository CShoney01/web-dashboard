/**
 * [변경 전] useLocalStorage('budget-expenses', []) → 클라이언트에서 연/월 필터링
 * [변경 후] GET /api/budget_expenses?year=&month= → 서버에서 필터링 후 반환
 *           POST /api/budget_expenses, DELETE /api/budget_expenses/:id
 *
 * 필드 변화: id(number) → id(uuid), 나머지 동일
 * 구조 변화: viewYear/viewMonth 변경 시 useEffect로 재조회
 */
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/api'

const CATEGORIES = [
  { key: '식비', color: 'bg-orange-500' },
  { key: '교통', color: 'bg-blue-500' },
  { key: '쇼핑', color: 'bg-purple-500' },
  { key: '의료', color: 'bg-red-500' },
  { key: '오락', color: 'bg-yellow-500' },
  { key: '주거', color: 'bg-green-500' },
  { key: '기타', color: 'bg-gray-500' },
]
const CAT_KEYS = CATEGORIES.map(c => c.key)

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function weekOf(dateStr) { return Math.ceil(new Date(dateStr).getDate() / 7) }
function monthLabel(y, m) { return `${y}년 ${m + 1}월` }

export default function BudgetWidget() {
  // [변경] expenses는 이제 API에서 받아온 이번달 데이터만 (서버 필터링)
  const [expenses, setExpenses] = useState([])
  const [tab,       setTab]      = useState('summary')
  const [viewYear,  setViewYear]  = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())  // 0-indexed
  const [showForm,  setShowForm]  = useState(false)
  const [form, setForm] = useState({ date: todayStr(), category: '식비', amount: '', memo: '' })

  const [error, setError] = useState(null)

  useEffect(() => {
    setError(null)
    api.get('/api/budget_expenses', { params: { year: viewYear, month: viewMonth + 1 } })
      .then(r => setExpenses(r.data))
      .catch(() => setError('지출 내역을 불러올 수 없습니다'))
  }, [viewYear, viewMonth])

  // [변경] 서버에서 이미 필터된 데이터 → 클라이언트 필터 불필요
  const monthExpenses = expenses.slice().sort((a, b) => b.date.localeCompare(a.date))
  const monthTotal    = expenses.reduce((s, e) => s + Number(e.amount), 0)

  const byCategory = Object.fromEntries(
    CAT_KEYS.map(key => [key, expenses.filter(e => e.category === key).reduce((s,e) => s+Number(e.amount),0)])
  )
  const maxCat = Math.max(...Object.values(byCategory), 1)

  const byWeek = [1,2,3,4,5].map(w => ({
    week: w,
    items: expenses.filter(e => weekOf(e.date) === w),
    total: expenses.filter(e => weekOf(e.date) === w).reduce((s,e) => s+Number(e.amount),0),
  }))

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11) }
    else setViewMonth(m => m-1)
  }
  function nextMonth() {
    const now = new Date()
    if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return
    if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0) }
    else setViewMonth(m => m+1)
  }

  // [변경] POST /api/budget_expenses
  async function submitExpense() {
    const amount = parseFloat(String(form.amount).replace(/,/g, ''))
    if (!amount || amount <= 0) return
    const { data } = await api.post('/api/budget_expenses', {
      date: form.date, category: form.category, amount, memo: form.memo || null,
    })
    setExpenses(prev => [data, ...prev])
    setForm(f => ({ ...f, amount: '', memo: '' }))
    setShowForm(false)
  }

  // [변경] DELETE /api/budget_expenses/:id (uuid)
  async function deleteExpense(id) {
    await api.delete(`/api/budget_expenses/${id}`)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const catColor = key => CATEGORIES.find(c => c.key === key)?.color ?? 'bg-gray-500'

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-bold text-foreground">💰 가계부</CardTitle>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={prevMonth}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">{monthLabel(viewYear, viewMonth)}</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={nextMonth}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex rounded-md overflow-hidden border border-border">
          {[['summary','요약'],['list','내역'],['weekly','주별']].map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-2 py-0.5 text-xs transition-colors ${tab===key ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 flex-1">
        {error && <p className="text-sm text-destructive text-center py-2">{error}</p>}
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-xs text-muted-foreground">이번달 총 지출</span>
          <span className="text-lg font-bold tabular-nums">{monthTotal.toLocaleString()}원</span>
        </div>

        {tab === 'summary' && (
          <div className="space-y-2">
            {CATEGORIES.map(({ key, color }) => {
              const amt = byCategory[key]
              if (!amt) return null
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-card-foreground">{key}</span>
                    <span className="tabular-nums text-muted-foreground">{amt.toLocaleString()}원</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round((amt/maxCat)*100)}%` }} />
                  </div>
                </div>
              )
            })}
            {monthTotal === 0 && <p className="text-sm text-muted-foreground text-center py-2">지출 내역이 없습니다</p>}
          </div>
        )}

        {tab === 'list' && (
          <div className="space-y-2">
            {showForm ? (
              <div className="p-2.5 bg-muted/30 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-0.5">날짜</label>
                    <Input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-0.5">카테고리</label>
                    <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {CAT_KEYS.map(k => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-0.5">금액 (원)</label>
                  <Input type="number" min="0" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} placeholder="0" className="h-8 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-0.5">메모</label>
                  <Input type="text" value={form.memo} onChange={e => setForm(f=>({...f,memo:e.target.value}))}
                    placeholder="선택 사항" className="h-8 text-sm"
                    onKeyDown={e => e.key==='Enter' && submitExpense()} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={submitExpense} size="sm" className="flex-1 text-xs">추가</Button>
                  <Button onClick={() => setShowForm(false)} variant="ghost" size="sm" className="flex-1 text-xs">취소</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowForm(true)}
                className="w-full text-xs py-1.5 rounded-md border border-dashed border-border text-muted-foreground hover:border-muted-foreground hover:text-card-foreground transition-colors">
                + 지출 추가
              </button>
            )}
            <div className="space-y-1 max-h-44 overflow-y-auto">
              {monthExpenses.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">내역이 없습니다</p>}
              {monthExpenses.map(e => (
                <div key={e.id} className="flex items-center gap-2 group py-0.5">
                  <div className={`w-1.5 h-4 rounded-full ${catColor(e.category)} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground">{e.date.slice(5)}</span>
                    <span className="mx-1.5 text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-card-foreground">{e.memo || e.category}</span>
                  </div>
                  <span className="text-xs tabular-nums text-card-foreground flex-shrink-0">{Number(e.amount).toLocaleString()}원</span>
                  <button onClick={() => deleteExpense(e.id)}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'weekly' && (
          <div className="space-y-2">
            {byWeek.filter(w => w.total > 0).map(({ week, total, items }) => (
              <div key={week}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-card-foreground font-medium">{week}주차</span>
                  <span className="tabular-nums text-card-foreground">{total.toLocaleString()}원</span>
                </div>
                <div className="space-y-0.5 pl-2">
                  {items.map(e => (
                    <div key={e.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{e.date.slice(5)} {e.memo || e.category}</span>
                      <span className="tabular-nums text-muted-foreground">{Number(e.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {monthTotal === 0 && <p className="text-sm text-muted-foreground text-center py-2">지출 내역이 없습니다</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
