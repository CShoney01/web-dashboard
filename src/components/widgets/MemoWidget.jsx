/**
 * [변경 전] useIndexedDB('memos') — 브라우저 IndexedDB에 저장, 필드: { text, createdAt }
 * [변경 후] GET/POST/PATCH/DELETE /api/memos — Supabase에 저장, 필드: { content, created_at }
 *
 * 필드 변화: text → content, createdAt → created_at
 */
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'

export default function MemoWidget() {
  const [memos,    setMemos]    = useState([])
  const [editing,  setEditing]  = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    api.get('/api/memos')
      .then(r => setMemos(r.data))
      .catch(() => setError('메모를 불러올 수 없습니다'))
  }, [])

  const openNew  = () => { setEditing({ content: '' }); setShowForm(true) }
  const openEdit = (memo) => { setEditing(memo); setShowForm(true) }
  const cancel   = () => { setShowForm(false); setEditing(null) }

  const save = async () => {
    const content = editing.content?.trim()
    if (!content) return
    if (editing.id) {
      const { data } = await api.patch(`/api/memos/${editing.id}`, { content })
      setMemos(prev => prev.map(m => m.id === editing.id ? data : m))
    } else {
      const { data } = await api.post('/api/memos', { content })
      setMemos(prev => [data, ...prev])
    }
    setShowForm(false)
    setEditing(null)
  }

  const remove = async (e, id) => {
    e.stopPropagation()
    await api.delete(`/api/memos/${id}`)
    setMemos(prev => prev.filter(m => m.id !== id))
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-3">
        <CardTitle className="text-sm font-bold text-foreground">📝 메모</CardTitle>
        <Button variant="ghost" size="sm" onClick={openNew} className="h-6 px-2 text-xs">
          + 새 메모
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 flex-1 flex flex-col gap-3">
        {showForm && (
          <div className="space-y-2">
            <textarea
              className="input resize-none"
              rows={4}
              placeholder="메모를 입력하세요..."
              value={editing?.content ?? ''}
              onChange={e => setEditing(prev => ({ ...prev, content: e.target.value }))}
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={save} size="sm" className="flex-1">저장</Button>
              <Button onClick={cancel} variant="ghost" size="sm" className="flex-1">취소</Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive text-center py-2">{error}</p>}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {memos.length === 0 && !showForm && !error && (
            <p className="text-sm text-muted-foreground text-center py-4">메모가 없습니다</p>
          )}
          {memos.map(m => (
            <div
              key={m.id}
              className="bg-muted/30 rounded-lg p-2.5 group cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => openEdit(m)}
            >
              <p className="text-sm text-card-foreground line-clamp-3 whitespace-pre-wrap">
                {m.content}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  {new Date(m.created_at).toLocaleDateString('ko-KR')}
                </span>
                <button
                  onClick={e => remove(e, m.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-xs transition-opacity"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
