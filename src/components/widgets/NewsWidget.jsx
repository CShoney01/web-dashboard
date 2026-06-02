import { useEffect, useState } from 'react'
import axios from 'axios'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const QUERY = '최신'

export default function NewsWidget() {
  const [articles, setArticles] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios
      .get('/api/naver-news', { params: { query: QUERY, display: 8, sort: 'date' } })
      .then((res) => setArticles(res.data.items ?? []))
      .catch(() => setError('뉴스 데이터를 불러올 수 없습니다'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-3">
        <CardTitle className="text-sm font-bold text-foreground">📰 뉴스</CardTitle>
        <span className="text-xs text-muted-foreground">네이버 뉴스</span>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 flex-1">
        {loading && <SkeletonList />}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {articles.length > 0 && (
          <ul className="space-y-2.5">
            {articles.map((a, i) => (
              <li key={i}>
                <a
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-card-foreground hover:text-foreground line-clamp-2 leading-snug block transition-colors"
                  dangerouslySetInnerHTML={{ __html: a.title }}
                />
                <span className="text-xs text-muted-foreground">
                  {a.pubDate ? new Date(a.pubDate).toLocaleDateString('ko-KR') : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function SkeletonList() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-3/4" />
        </div>
      ))}
    </div>
  )
}
