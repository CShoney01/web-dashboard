import { useEffect, useState } from 'react'
import axios from 'axios'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'

const DEFAULT_CITY = 'Seoul'
const DAY_KO       = ['일', '월', '화', '수', '목', '금', '토']

// 다음 24시간 — 3시간 간격 8슬롯
function parseHourly(list) {
  return list.slice(0, 8).map(item => {
    const dt = new Date(item.dt * 1000)
    return {
      time: dt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      icon: item.weather[0].icon,
      desc: item.weather[0].description,
      temp: Math.round(item.main.temp),
      pop:  Math.round((item.pop ?? 0) * 100),
    }
  })
}

// 5일 주간 예보
function parseWeekly(list) {
  const map = {}
  list.forEach(item => {
    const date = item.dt_txt.slice(0, 10)
    if (!map[date]) map[date] = []
    map[date].push(item)
  })
  return Object.entries(map).slice(0, 5).map(([date, items]) => {
    const temps = items.map(i => i.main.temp)
    const repr  = items.find(i => i.dt_txt.includes('12:00')) ?? items[Math.floor(items.length / 2)]
    const d     = new Date(date)
    return {
      date,
      day:  DAY_KO[d.getDay()],
      icon: repr.weather[0].icon,
      desc: repr.weather[0].description,
      min:  Math.round(Math.min(...temps)),
      max:  Math.round(Math.max(...temps)),
      pop:  Math.round(Math.max(...items.map(i => i.pop ?? 0)) * 100),
    }
  })
}

export default function WeatherWidget() {
  const [tab,       setTab]       = useState('now')
  const [city,      setCity]      = useState(null)
  const [editing,   setEditing]   = useState(false)
  const [cityInput, setCityInput] = useState('')
  const [current,   setCurrent]   = useState(null)
  const [hourly,    setHourly]    = useState(null)
  const [weekly,    setWeekly]    = useState(null)
  const [error,     setError]     = useState(null)
  const [loading,   setLoading]   = useState(false)

  // 1. widget_settings에서 도시 읽기
  useEffect(() => {
    api.get('/api/widget_settings/weather')
      .then(r => setCity(r.data.settings?.city || DEFAULT_CITY))
      .catch(() => setCity(DEFAULT_CITY))
  }, [])

  // 2. 도시가 결정되면 날씨 조회
  useEffect(() => {
    if (!city) return

    setLoading(true)
    setCurrent(null)
    setHourly(null)
    setWeekly(null)
    setError(null)

    Promise.all([
      axios.get('/api/weather',          { params: { city } }),
      axios.get('/api/weather/forecast', { params: { city } }),
    ])
      .then(([c, f]) => {
        setCurrent(c.data)
        setHourly(parseHourly(f.data.list))
        setWeekly(parseWeekly(f.data.list))
      })
      .catch(() => setError('날씨 데이터를 불러올 수 없습니다'))
      .finally(() => setLoading(false))
  }, [city])

  // 도시 저장
  const saveCity = async () => {
    const newCity = cityInput.trim()
    if (!newCity) return
    try {
      await api.patch('/api/widget_settings/weather', { settings: { city: newCity } })
    } catch { /* ignore */ }
    setCity(newCity)
    setEditing(false)
  }

  const handleCityKeyDown = e => {
    if (e.key === 'Enter') saveCity()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-3">
        <CardTitle className="text-sm font-bold text-foreground">🌤️ 날씨</CardTitle>
        <div className="flex items-center gap-2">
          {editing ? (
            <div className="flex items-center gap-1">
              <Input
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={handleCityKeyDown}
                placeholder="도시명 (영문)"
                className="h-6 text-xs w-28 px-2"
                autoFocus
              />
              <Button onClick={saveCity} size="sm" className="h-6 px-2 text-xs">저장</Button>
              <Button onClick={() => setEditing(false)} variant="ghost" size="sm" className="h-6 px-2 text-xs">취소</Button>
            </div>
          ) : (
            <button
              onClick={() => { setCityInput(city ?? ''); setEditing(true) }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="클릭하여 도시 변경"
            >
              {city ?? '...'}
            </button>
          )}
          <div className="flex rounded-md overflow-hidden border border-border">
            {[['now', '현재'], ['week', '주간']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-2 py-0.5 text-xs transition-colors ${
                  tab === key ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0 flex-1 flex flex-col gap-3">
        {loading && <WeatherSkeleton />}
        {error   && <p className="text-sm text-destructive">{error}</p>}

        {/* ── 현재 탭 ─────────────────────────────────────────── */}
        {!loading && !error && tab === 'now' && current && hourly && (
          <>
            {/* 현재 날씨 요약 */}
            <div className="flex items-center gap-3">
              <img
                src={`https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`}
                alt={current.weather[0].description}
                className="w-14 h-14 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums">{Math.round(current.main.temp)}°C</span>
                  <span className="text-sm text-muted-foreground capitalize truncate">
                    {current.weather[0].description}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex gap-2 flex-wrap">
                  <span>체감 {Math.round(current.main.feels_like)}°C</span>
                  <span>습도 {current.main.humidity}%</span>
                  <span>바람 {current.wind.speed}m/s</span>
                </div>
              </div>
            </div>

            {/* 구분선 */}
            <div className="border-t border-border" />

            {/* 시간대별 가로 스크롤 */}
            <div className="overflow-x-auto -mx-1 px-1">
              <div className="flex gap-1 w-max">
                {hourly.map((slot, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors min-w-[52px]"
                  >
                    <span className="text-[10px] text-muted-foreground tabular-nums">{slot.time}</span>
                    <img
                      src={`https://openweathermap.org/img/wn/${slot.icon}.png`}
                      alt={slot.desc}
                      className="w-8 h-8"
                    />
                    <span className="text-xs font-semibold tabular-nums">{slot.temp}°</span>
                    <span className="text-[10px] text-blue-400 tabular-nums">💧{slot.pop}%</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── 주간 탭 ─────────────────────────────────────────── */}
        {!loading && !error && tab === 'week' && weekly && (
          <div className="space-y-1.5">
            {weekly.map(day => (
              <div key={day.date} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4 text-center shrink-0">{day.day}</span>
                <img
                  src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                  alt={day.desc}
                  className="w-7 h-7 shrink-0"
                />
                <span className="flex-1 text-xs text-muted-foreground capitalize truncate">{day.desc}</span>
                <span className="text-[10px] text-blue-400 tabular-nums shrink-0">💧{day.pop}%</span>
                <span className="text-xs tabular-nums shrink-0">
                  <span className="text-blue-400">{day.min}°</span>
                  <span className="text-muted-foreground"> / </span>
                  <span className="text-orange-400">{day.max}°</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function WeatherSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex gap-3 items-center">
        <div className="w-14 h-14 bg-muted rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-7 w-24 bg-muted rounded" />
          <div className="h-3 w-36 bg-muted rounded" />
        </div>
      </div>
      <div className="border-t border-border" />
      <div className="flex gap-1">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-[52px] h-20 bg-muted rounded-lg shrink-0" />
        ))}
      </div>
    </div>
  )
}
