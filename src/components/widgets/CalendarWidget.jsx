import { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE     = 'https://www.googleapis.com/auth/calendar.readonly'

const LS_TOKEN  = 'gc_access_token'
const LS_EXPIRY = 'gc_token_expiry'

const DAY_KO   = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

// ── 토큰 저장/불러오기 ──────────────────────────────────────────
function saveToken(token, expiresIn = 3599) {
  localStorage.setItem(LS_TOKEN,  token)
  localStorage.setItem(LS_EXPIRY, String(Date.now() + (expiresIn - 60) * 1000))
}

function loadSavedToken() {
  const token  = localStorage.getItem(LS_TOKEN)
  const expiry = parseInt(localStorage.getItem(LS_EXPIRY) ?? '0', 10)
  return token && Date.now() < expiry ? token : null
}

function clearSavedToken() {
  localStorage.removeItem(LS_TOKEN)
  localStorage.removeItem(LS_EXPIRY)
}

// ── 날짜 포맷 ──────────────────────────────────────────────────
function formatEventTime(event) {
  if (event.start.date) return '종일'
  const s = new Date(event.start.dateTime)
  const e = new Date(event.end.dateTime)
  const fmt = d => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  return `${fmt(s)} ~ ${fmt(e)}`
}

function eventDateKey(event) {
  return event.start.date ?? event.start.dateTime?.slice(0, 10)
}

function groupByDate(events) {
  const map = {}
  events.forEach(e => {
    const key = eventDateKey(e)
    if (!map[key]) map[key] = []
    map[key].push(e)
  })
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
}

function dateLabel(dateStr) {
  const d    = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const diff  = Math.round((d - today) / 86400000)
  const suffix = diff === 0 ? ' (오늘)' : diff === 1 ? ' (내일)' : ''
  return `${MONTH_KO[d.getMonth()]} ${d.getDate()}일 ${DAY_KO[d.getDay()]}요일${suffix}`
}

// ── 컴포넌트 ───────────────────────────────────────────────────
export default function CalendarWidget() {
  const [token,       setToken]       = useState(() => loadSavedToken())
  const [autoLoading, setAutoLoading] = useState(false)
  const [events,      setEvents]      = useState([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const tokenClientRef  = useRef(null)
  const silentRef       = useRef(null)
  const silentTimerRef  = useRef(null)

  // ── GIS 초기화 ──────────────────────────────────────────────
  useEffect(() => {
    if (!CLIENT_ID) return

    // 저장된 토큰 없으면 silent 재인증 시도 중 표시
    if (!loadSavedToken()) setAutoLoading(true)

    const script = document.createElement('script')
    script.src   = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      // Silent client (prompt 없음 → 팝업 없이 시도)
      silentRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope:     SCOPE,
        prompt:    '',
        callback:  (res) => {
          clearTimeout(silentTimerRef.current)
          setAutoLoading(false)
          if (res.error) return  // 기존 동의 없음 → 로그인 버튼 표시
          saveToken(res.access_token, res.expires_in)
          setToken(res.access_token)
        },
      })

      // Explicit client (팝업 띄움)
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope:     SCOPE,
        prompt:    'select_account',
        callback:  (res) => {
          if (res.error) { setError('로그인에 실패했습니다'); return }
          saveToken(res.access_token, res.expires_in)
          setToken(res.access_token)
          setError(null)
        },
      })

      // 저장된 토큰 없으면 silent 재인증 시도 (4초 내 응답 없으면 포기)
      if (!loadSavedToken()) {
        silentTimerRef.current = setTimeout(() => setAutoLoading(false), 4000)
        silentRef.current.requestAccessToken()
      }
    }

    document.head.appendChild(script)
    return () => {
      clearTimeout(silentTimerRef.current)
      try { document.head.removeChild(script) } catch { /* ignore */ }
    }
  }, [])

  // ── 토큰 있으면 캘린더 조회 ───────────────────────────────────
  const fetchEvents = useCallback((accessToken) => {
    setLoading(true)
    setError(null)
    const now      = new Date().toISOString()
    const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    axios
      .get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params:  { timeMin: now, timeMax: twoWeeks, orderBy: 'startTime', singleEvents: true, maxResults: 20 },
      })
      .then(res => setEvents(res.data.items ?? []))
      .catch(err => {
        if (err.response?.status === 401) {
          // 토큰 만료 → silent 재인증 시도
          clearSavedToken()
          setToken(null)
          setAutoLoading(true)
          silentRef.current?.requestAccessToken()
        } else {
          setError('일정을 불러올 수 없습니다')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (token) fetchEvents(token)
  }, [token, fetchEvents])

  // ── 로그아웃 ─────────────────────────────────────────────────
  const handleLogout = () => {
    clearSavedToken()
    setToken(null)
    setEvents([])
    setError(null)
  }

  // ── CLIENT_ID 미설정 안내 ────────────────────────────────────
  if (!CLIENT_ID) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-3">
          <CardTitle className="text-sm font-bold text-foreground">📅 Google 캘린더</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 flex-1 space-y-2 text-xs text-muted-foreground">
          <p><code className="text-primary">.env</code> 에 다음을 추가하세요:</p>
          <div className="bg-muted/50 rounded p-2 font-mono text-card-foreground">
            VITE_GOOGLE_CLIENT_ID=your_client_id
          </div>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Google Cloud Console → 프로젝트 생성</li>
            <li>Google Calendar API 활성화</li>
            <li>OAuth 2.0 클라이언트 ID 발급 (웹 애플리케이션)</li>
            <li>승인된 JavaScript 출처에 도메인 추가</li>
          </ol>
        </CardContent>
      </Card>
    )
  }

  const grouped  = groupByDate(events)
  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Google 캘린더
        </CardTitle>
        {token && (
          <Button variant="ghost" size="sm" onClick={handleLogout} className="h-6 px-2 text-xs">
            로그아웃
          </Button>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0 flex-1 flex flex-col">
        {/* silent 재인증 시도 중 */}
        {autoLoading && !token && (
          <div className="flex flex-col items-center py-6 gap-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">로그인 상태 확인 중...</p>
          </div>
        )}

        {/* 로그인 버튼 */}
        {!token && !autoLoading && (
          <div className="flex flex-col items-center py-4 gap-3">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <Button size="sm" onClick={() => tokenClientRef.current?.requestAccessToken()}>
              Google로 로그인
            </Button>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}

        {/* 캘린더 데이터 로딩 */}
        {token && loading && (
          <div className="space-y-3 animate-pulse">
            {[1,2,3].map(i => (
              <div key={i}>
                <div className="h-3 w-24 bg-muted rounded mb-1.5" />
                <div className="h-8 bg-muted rounded" />
              </div>
            ))}
          </div>
        )}

        {token && !loading && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {token && !loading && !error && events.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">향후 2주간 일정이 없습니다</p>
        )}

        {token && !loading && grouped.length > 0 && (
          <div className="space-y-3 max-h-72 overflow-y-auto flex-1">
            {grouped.map(([date, dayEvents]) => (
              <div key={date}>
                <p className={`text-xs font-medium mb-1 ${date === todayStr ? 'text-primary' : 'text-muted-foreground'}`}>
                  {dateLabel(date)}
                </p>
                <div className="space-y-1">
                  {dayEvents.map(event => (
                    <div key={event.id}
                      className={`flex gap-2 p-2 rounded-lg text-xs ${
                        date === todayStr ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'
                      }`}
                    >
                      <div className={`w-0.5 rounded-full flex-shrink-0 ${date === todayStr ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                      <div className="min-w-0">
                        <p className="text-card-foreground font-medium truncate">{event.summary}</p>
                        <p className="text-muted-foreground">{formatEventTime(event)}</p>
                        {event.location && (
                          <p className="text-muted-foreground truncate">{event.location}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {token && !loading && (
          <div className="mt-3 pt-3 border-t border-border">
            <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Google 캘린더 열기 →
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
