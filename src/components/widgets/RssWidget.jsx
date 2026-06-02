/**
 * [변경 전] useLocalStorage('rss-feeds', DEFAULT_FEEDS) — 브라우저에 저장
 * [변경 후] GET/POST/DELETE /api/rss_feeds — Supabase에 저장
 *
 * DEFAULT_FEEDS 제거 (DB가 비어있으면 빈 상태에서 시작)
 */
import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import api from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, ChevronRight } from 'lucide-react'

function relativeTime(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export default function RssWidget() {
  // [변경] useLocalStorage → API 상태
  const [feeds,       setFeeds]       = useState([])
  const [feedData,    setFeedData]    = useState({})
  const [loadingSet,  setLoadingSet]  = useState(new Set())
  const [showAdd,     setShowAdd]     = useState(false)
  const [urlInput,    setUrlInput]    = useState('')
  const [nameInput,   setNameInput]   = useState('')
  const [expandedUrl, setExpandedUrl] = useState(null)
  const fetchedRef = useRef(new Set())

  // [변경] 마운트 시 DB에서 피드 목록 조회
  useEffect(() => {
    api.get('/api/rss_feeds')
      .then(r => setFeeds(r.data))
      .catch(console.error)
  }, [])

  // 새 피드가 생기면 RSS 기사 조회 (기존 로직 유지)
  useEffect(() => {
    const toFetch = feeds.filter(f => !fetchedRef.current.has(f.url))
    if (toFetch.length === 0) return

    toFetch.forEach(f => fetchedRef.current.add(f.url))
    setLoadingSet(prev => { const n = new Set(prev); toFetch.forEach(f => n.add(f.url)); return n })

    toFetch.forEach(({ url }) => {
      axios.get('https://api.rss2json.com/v1/api.json', { params: { rss_url: url } })
        .then(res => {
          if (res.data.status !== 'ok') throw new Error()
          setFeedData(prev => ({ ...prev, [url]: { title: res.data.feed.title, items: res.data.items } }))
        })
        .catch(() => setFeedData(prev => ({ ...prev, [url]: { error: '피드를 불러올 수 없습니다' } })))
        .finally(() => setLoadingSet(prev => { const n = new Set(prev); n.delete(url); return n }))
    })
  }, [feeds])

  // [변경] POST /api/rss_feeds
  async function addFeed() {
    const url = urlInput.trim()
    if (!url || feeds.some(f => f.url === url)) return
    const { data } = await api.post('/api/rss_feeds', { url, name: nameInput.trim() || url })
    setFeeds(prev => [...prev, data])
    setUrlInput('')
    setNameInput('')
    setShowAdd(false)
  }

  // [변경] DELETE /api/rss_feeds/:id (uuid)
  async function removeFeed(feed) {
    await api.delete(`/api/rss_feeds/${feed.id}`)
    setFeeds(prev => prev.filter(f => f.id !== feed.id))
    setFeedData(prev => { const n = { ...prev }; delete n[feed.url]; return n })
    fetchedRef.current.delete(feed.url)
    if (expandedUrl === feed.url) setExpandedUrl(null)
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-3">
        <CardTitle className="text-sm font-bold text-foreground">📡 RSS 피드</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => { setShowAdd(v => !v); setUrlInput(''); setNameInput('') }}>
          {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 flex-1 flex flex-col gap-3">
        {showAdd && (
          <div className="p-2.5 bg-muted/30 rounded-lg space-y-1.5">
            <Input autoFocus type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
              placeholder="RSS 피드 URL" className="h-9 text-sm" />
            <Input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
              placeholder="표시 이름 (선택)" className="h-9 text-sm" />
            <p className="text-xs text-muted-foreground">YouTube: youtube.com/feeds/videos.xml?channel_id=채널ID</p>
            <div className="flex gap-2">
              <Button onClick={addFeed} size="sm" className="flex-1 text-xs">추가</Button>
              <Button onClick={() => setShowAdd(false)} variant="ghost" size="sm" className="flex-1 text-xs">취소</Button>
            </div>
          </div>
        )}

        {feeds.length === 0 && !showAdd && (
          <p className="text-sm text-muted-foreground text-center py-2">+ 버튼으로 RSS 피드를 추가하세요</p>
        )}

        <div className="space-y-3">
          {feeds.map(feed => {
            const isLoading = loadingSet.has(feed.url)
            const data      = feedData[feed.url]
            const isExpanded = expandedUrl === feed.url

            return (
              <div key={feed.id}>
                <div className="flex items-center gap-2 group">
                  <button onClick={() => removeFeed(feed)}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                  <button onClick={() => setExpandedUrl(isExpanded ? null : feed.url)}
                    className="flex-1 flex items-center gap-1.5 text-left min-w-0">
                    <ChevronRight className={`w-3 h-3 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    <span className="text-sm font-medium text-card-foreground truncate">{data?.title || feed.name}</span>
                  </button>
                  {isLoading && <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin flex-shrink-0" />}
                </div>

                {isExpanded && (
                  <div className="mt-1.5 ml-5 space-y-1">
                    {data?.error && <p className="text-xs text-destructive">{data.error}</p>}
                    {isLoading && !data && (
                      <div className="space-y-1 animate-pulse">
                        {[1,2,3].map(i => <div key={i} className="h-3 bg-muted rounded" />)}
                      </div>
                    )}
                    {data?.items?.map((item, idx) => (
                      <a key={idx} href={item.link} target="_blank" rel="noopener noreferrer" className="block group/item">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-card-foreground group-hover/item:text-foreground transition-colors line-clamp-1 flex-1">{item.title}</p>
                          <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">{relativeTime(item.pubDate)}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
