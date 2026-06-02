/**
 * [변경 전] useIndexedDB('bookmarks') — 브라우저 IndexedDB에 저장
 * [변경 후] GET/POST/DELETE /api/bookmarks — Supabase에 저장
 */
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'

export default function BookmarksWidget() {
  const [bookmarks, setBookmarks] = useState([])
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState({ title: '', url: '' })
  const [error,     setError]     = useState(null)

  useEffect(() => {
    api.get('/api/bookmarks')
      .then(r => setBookmarks(r.data))
      .catch(() => setError('북마크를 불러올 수 없습니다'))
  }, [])

  const save = async () => {
    if (!form.url.trim()) return
    const url = form.url.startsWith('http') ? form.url : `https://${form.url}`
    const { data } = await api.post('/api/bookmarks', { title: form.title || url, url })
    setBookmarks(prev => [...prev, data])
    setForm({ title: '', url: '' })
    setShowForm(false)
  }

  const remove = async (id) => {
    await api.delete(`/api/bookmarks/${id}`)
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-3">
        <CardTitle className="text-sm font-bold text-foreground">🔖 즐겨찾기</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(v => !v)} className="h-6 px-2 text-xs">
          {showForm ? '취소' : '+ 추가'}
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 flex-1 flex flex-col gap-3">
        {showForm && (
          <div className="space-y-2">
            <Input placeholder="이름 (선택)" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="h-9 text-sm" />
            <Input placeholder="URL (예: google.com)" value={form.url}
              onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && save()} className="h-9 text-sm" autoFocus />
            <Button onClick={save} size="sm" className="w-full">저장</Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive text-center py-2">{error}</p>}
        <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
          {bookmarks.length === 0 && !showForm && !error && (
            <p className="text-sm text-muted-foreground col-span-2 text-center py-4">즐겨찾기가 없습니다</p>
          )}
          {bookmarks.map(b => (
            <div key={b.id} className="relative group">
              <a href={b.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-muted/30 rounded-lg px-2.5 py-2 hover:bg-muted/50 transition-colors">
                <img src={`https://www.google.com/s2/favicons?domain=${b.url}&sz=16`} alt=""
                  className="w-4 h-4 shrink-0" onError={e => (e.target.style.display = 'none')} />
                <span className="text-xs text-card-foreground truncate">{b.title}</span>
              </a>
              <button onClick={() => remove(b.id)}
                className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center transition-opacity">
                ✕
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
