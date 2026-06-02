/**
 * [변경 전] useLocalStorage('dashboard-todos', []) — 브라우저에만 저장
 * [변경 후] GET/POST/PATCH/DELETE /api/todos — Supabase에 저장
 *
 * 필드 변화: createdAt(number) → created_at(timestamptz), id는 동일(uuid)
 */
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'

export default function TodoWidget() {
  const [todos, setTodos]   = useState([])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    api.get('/api/todos')
      .then(r => setTodos(r.data))
      .catch(() => setError('할일 목록을 불러올 수 없습니다'))
      .finally(() => setLoading(false))
  }, [])

  const add = async () => {
    const text = input.trim()
    if (!text) return
    const { data } = await api.post('/api/todos', { text })
    setTodos(prev => [data, ...prev])
    setInput('')
  }

  const toggle = async (id, done) => {
    const { data } = await api.patch(`/api/todos/${id}`, { done: !done })
    setTodos(prev => prev.map(t => t.id === id ? data : t))
  }

  const remove = async (id) => {
    await api.delete(`/api/todos/${id}`)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const handleKey = (e) => e.key === 'Enter' && add()

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-3">
        <CardTitle className="text-sm font-bold text-foreground">✅ Todo</CardTitle>
        <span className="text-xs text-muted-foreground">
          {todos.filter(t => !t.done).length} 남음
        </span>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 flex-1 flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            placeholder="할 일 추가..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            className="h-9 text-sm"
          />
          <Button onClick={add} size="sm" className="shrink-0">추가</Button>
        </div>

        {error && <p className="text-sm text-destructive text-center py-2">{error}</p>}
        {loading ? (
          <div className="space-y-1.5 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-5 bg-muted rounded" />)}
          </div>
        ) : !error && (
          <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1 flex-1">
            {todos.map(t => (
              <li key={t.id} className="flex items-center gap-2 group">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggle(t.id, t.done)}
                  className="accent-primary shrink-0"
                />
                <span className={`text-sm flex-1 ${t.done ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
                  {t.text}
                </span>
                <button
                  onClick={() => remove(t.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-xs transition-opacity"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
