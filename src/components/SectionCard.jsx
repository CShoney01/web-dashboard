import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useDataStore } from '../store/dataStore'
import { Card } from '@/components/ui/card'
import api from '@/lib/api'
import { X, Maximize2 } from 'lucide-react'

import WeatherWidget    from './widgets/WeatherWidget'
import ExchangeWidget   from './widgets/ExchangeWidget'
import NewsWidget       from './widgets/NewsWidget'
import StockWidget      from './widgets/StockWidget'
import CryptoWidget     from './widgets/CryptoWidget'
import CalendarWidget   from './widgets/CalendarWidget'
import RssWidget        from './widgets/RssWidget'
import BudgetWidget     from './widgets/BudgetWidget'
import TodoWidget       from './widgets/TodoWidget'
import BookmarksWidget  from './widgets/BookmarksWidget'

// ─── Color palette ────────────────────────────────────────────────────────────
// card: HSL values for --card CSS variable (dark pastel tints)
// swatch: visible color for the picker button
// card: 배경으로 쓰일 어두운 파스텔 색 (HSL)
// swatch: 피커에서 보여줄 밝은 식별용 색
export const WIDGET_COLORS = [
  { id: 'default', label: '기본',     card: null,            swatch: 'hsl(220, 14%, 88%)' },
  { id: 'blue',    label: '블루',     card: '213 100% 96%',  swatch: 'hsl(213, 80%, 80%)'  },
  { id: 'violet',  label: '바이올렛', card: '270 100% 96%',  swatch: 'hsl(270, 70%, 82%)'  },
  { id: 'emerald', label: '에메랄드', card: '152 60% 93%',   swatch: 'hsl(152, 50%, 76%)'  },
  { id: 'amber',   label: '앰버',     card: '45 100% 92%',   swatch: 'hsl(45,  90%, 76%)'  },
  { id: 'rose',    label: '로즈',     card: '356 100% 95%',  swatch: 'hsl(356, 80%, 82%)'  },
  { id: 'teal',    label: '청록',     card: '166 60% 93%',   swatch: 'hsl(166, 50%, 76%)'  },
  { id: 'indigo',  label: '인디고',   card: '226 100% 96%',  swatch: 'hsl(226, 80%, 80%)'  },
]

const WIDGET_MAP = {
  weather: WeatherWidget, exchange: ExchangeWidget, news: NewsWidget,
  stock: StockWidget, crypto: CryptoWidget, calendar: CalendarWidget,
  rss: RssWidget, budget: BudgetWidget, todo: TodoWidget,
  bookmarks: BookmarksWidget,
}

// ─── Sortable widget item ─────────────────────────────────────────────────────
function SortableWidgetItem({ id, widgetColors, setWidgetColor }) {
  const [expanded, setExpanded] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerAnchor, setPickerAnchor] = useState({ top: 0, left: 0 })

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const colorId  = widgetColors[id] ?? 'default'
  const colorDef = WIDGET_COLORS.find((c) => c.id === colorId) ?? WIDGET_COLORS[0]

  // CSS variable → Card 내부 bg-card가 이 값을 상속
  // backgroundColor → 부모 div 자체도 같은 색으로 채워서 확실히 반영
  const colorStyle = colorDef.card
    ? { '--card': colorDef.card, backgroundColor: `hsl(${colorDef.card})` }
    : { backgroundColor: 'hsl(var(--card))' }

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  useEffect(() => {
    if (!expanded) return
    function onKey(e) { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  function openPicker(e) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setPickerAnchor({ top: rect.bottom + 6, left: rect.left })
    setShowPicker(true)
  }

  const Component = WIDGET_MAP[id]
  if (!Component) return null

  return (
    <>
      {/* ── Color picker portal ── */}
      {showPicker && createPortal(
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setShowPicker(false)} />
          <div
            className="fixed z-[56] p-3 rounded-xl border border-border bg-card shadow-2xl"
            style={{ top: pickerAnchor.top, left: pickerAnchor.left }}
          >
            <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-widest">
              위젯 색상
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {WIDGET_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setWidgetColor(id, c.id); setShowPicker(false) }}
                  title={c.label}
                  className={[
                    'w-7 h-7 rounded-full transition-all hover:scale-110 focus:outline-none',
                    colorId === c.id
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-card scale-110'
                      : 'opacity-80 hover:opacity-100',
                  ].join(' ')}
                  style={{ backgroundColor: c.swatch }}
                />
              ))}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── Expanded backdrop + modal (portal) ── */}
      {expanded && createPortal(
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                       w-[90vw] max-w-2xl max-h-[85vh]
                       rounded-xl border border-border shadow-2xl flex flex-col"
            style={colorStyle}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end p-2 flex-shrink-0 border-b border-border/50">
              <button
                className="p-1.5 rounded-md bg-background/80 border border-border text-muted-foreground hover:text-foreground hover:bg-background transition-all"
                title="닫기 (Esc)"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setExpanded(false) }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <Component />
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── Drag wrapper ── */}
      <div
        ref={setNodeRef}
        style={dragStyle}
        {...attributes}
        {...listeners}
        className="relative group cursor-grab active:cursor-grabbing"
      >
        {/* 버튼 위치 기준이 되는 래퍼 (스크롤 영역 밖) */}
        <div className="relative">
          {/* 스크롤 가능한 위젯 콘텐츠 */}
          <div
            style={colorStyle}
            className="h-[240px] overflow-y-auto rounded-xl"
          >
            <Component />
          </div>

          {/* 색상 피커 버튼 — 스크롤 영역 밖, 항상 좌상단 고정 */}
          <button
            className={[
              'absolute top-2.5 left-2.5 z-10',
              'w-4 h-4 rounded-full border border-white/30',
              'transition-all hover:scale-125',
              'opacity-0 group-hover:opacity-100',
            ].join(' ')}
            style={{ backgroundColor: colorDef.swatch }}
            title="위젯 색상 변경"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={openPicker}
          />

          {/* 확대 버튼 — 스크롤 영역 밖, 항상 우하단 고정 */}
          <button
            className="absolute bottom-2 right-2 z-10 p-1 rounded
                       text-muted-foreground/60 hover:text-foreground
                       bg-background/50 hover:bg-background/80
                       opacity-0 group-hover:opacity-100 transition-all"
            title="전체화면으로 보기"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Widget sub-grid ──────────────────────────────────────────────────────────
function WidgetSubGrid({ widgetIds, onReorder, widgetColors, setWidgetColor }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    onReorder(arrayMove(widgetIds, widgetIds.indexOf(active.id), widgetIds.indexOf(over.id)))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {widgetIds.map((id) => (
            <SortableWidgetItem
              key={id}
              id={id}
              widgetColors={widgetColors}
              setWidgetColor={setWidgetColor}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

// ─── Finance preview ──────────────────────────────────────────────────────────
// [변경 전] useLocalStorage('budget-expenses') → 클라이언트 필터
// [변경 후] GET /api/budget_expenses?year&month → 서버 필터
function FinancePreview() {
  const { exchange, crypto } = useDataStore()
  const [monthTotal, setMonthTotal] = useState(0)
  const now = new Date()

  useEffect(() => {
    const d = new Date()
    api.get('/api/budget_expenses', { params: { year: d.getFullYear(), month: d.getMonth() + 1 } })
      .then(r => setMonthTotal(r.data.reduce((sum, e) => sum + Number(e.amount), 0)))
      .catch(console.error)
  }, [])

  const krwRate = exchange?.rates?.KRW
  const btc     = crypto?.bitcoin
  const btcChg  = btc?.krw_24h_change ?? 0

  function fmtBtc(n) {
    if (!n) return '—'
    if (n >= 1e8) return `${(n / 1e8).toFixed(2)}억`
    if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString()}만`
    return n.toLocaleString()
  }

  const items = [
    { label: '원·달러 환율', sub: '1 USD 기준', value: krwRate ? `₩${Math.round(krwRate).toLocaleString()}` : '—', badge: null },
    {
      label: '비트코인', sub: '24h 변동',
      value: btc ? `${fmtBtc(btc.krw)}원` : '—',
      badge: btc ? { text: `${btcChg >= 0 ? '+' : ''}${btcChg.toFixed(2)}%`, up: btcChg >= 0 } : null,
    },
    { label: `${now.getMonth() + 1}월 지출`, sub: '이번달 합계', value: `₩${monthTotal.toLocaleString()}`, badge: null },
  ]

  return (
    <div className="space-y-4">
      {items.map(({ label, sub, value, badge }) => (
        <div key={label}>
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
            {badge && (
              <span className={`text-xs tabular-nums font-medium ${badge.up ? 'text-emerald-400' : 'text-red-400'}`}>
                {badge.text}
              </span>
            )}
          </div>
          <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Info preview ─────────────────────────────────────────────────────────────
function weatherEmoji(icon) {
  if (!icon) return '🌡️'
  const c = icon.slice(0, 2)
  return { '01':'☀️','02':'⛅','03':'☁️','04':'☁️','09':'🌧️','10':'🌦️','11':'⛈️','13':'❄️','50':'🌫️' }[c] ?? '🌡️'
}

function stripHtml(str = '') {
  return str.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'")
}

function InfoPreview() {
  const { weather, newsHeadline } = useDataStore()

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">날씨</p>
        {weather ? (
          <>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl leading-none">{weatherEmoji(weather.weather[0].icon)}</span>
              <div>
                <p className="text-2xl font-bold tabular-nums leading-none">{Math.round(weather.main.temp)}°C</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{weather.weather[0].description}</p>
              </div>
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
              <span>체감 {Math.round(weather.main.feels_like)}°C</span>
              <span>습도 {weather.main.humidity}%</span>
              <span>바람 {weather.wind.speed}m/s</span>
            </div>
          </>
        ) : (
          <div className="h-14 bg-muted/30 rounded-lg animate-pulse" />
        )}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">최신 뉴스</p>
        {newsHeadline ? (
          <p className="text-xs text-card-foreground leading-relaxed line-clamp-4">
            {stripHtml(newsHeadline.title)}
          </p>
        ) : (
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => <div key={i} className="h-3 bg-muted/30 rounded animate-pulse" />)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Productivity preview ─────────────────────────────────────────────────────
// [변경 전] useLocalStorage('dashboard-todos') + useIndexedDB('bookmarks')
// [변경 후] GET /api/todos + GET /api/bookmarks
function ProductivityPreview() {
  const [todos,         setTodos]         = useState([])
  const [bookmarkCount, setBookmarkCount] = useState(0)

  useEffect(() => {
    api.get('/api/todos').then(r => setTodos(r.data)).catch(console.error)
    api.get('/api/bookmarks').then(r => setBookmarkCount(r.data.length)).catch(console.error)
  }, [])

  const total  = todos.length
  const done   = todos.filter(t => t.done).length
  const remain = total - done
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">할일</p>
        {total > 0 ? (
          <>
            <div className="flex justify-between text-xs mb-2">
              <span className="font-semibold">{remain}개 남음</span>
              <span className="text-muted-foreground">{done}/{total} 완료</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{pct}% 완료</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">할일 없음</p>
        )}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">즐겨찾기</p>
        <p className="text-xl font-bold tabular-nums">{bookmarkCount}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">개 저장됨</p>
      </div>
    </div>
  )
}

const PREVIEW_MAP = {
  finance:      FinancePreview,
  info:         InfoPreview,
  productivity: ProductivityPreview,
}

// ─── Section card (exported) ──────────────────────────────────────────────────
export default function SectionCard({
  sectionId, def, widgetIds, isCollapsed, onToggle, onWidgetReorder,
  widgetColors, setWidgetColor,
}) {
  const Preview = PREVIEW_MAP[sectionId]

  return (
    <Card className="overflow-hidden flex flex-col p-0 border">
      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 px-5 py-4 bg-secondary/40 select-none cursor-pointer
                   hover:bg-secondary/60 transition-colors border-b border-border"
        onClick={onToggle}
      >
        <div className={`w-0.5 h-5 rounded-full flex-shrink-0 ${def.accent.bar}`} />

        <div className={`flex items-center gap-1.5 flex-1 ${def.accent.text}`}>
          {def.icon}
          <span className="text-sm font-semibold tracking-wide">{def.label}</span>
        </div>

        <span className="text-xs tabular-nums text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {widgetIds.length}
        </span>

        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* ── Preview (collapsed state) ── */}
      {isCollapsed && Preview && (
        <div className="flex-1 px-5 py-5 bg-card border-b border-border">
          <Preview />
        </div>
      )}

      {/* ── Expanded widget grid ── */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border bg-background p-4">
            {widgetIds.length > 0 ? (
              <WidgetSubGrid
                widgetIds={widgetIds}
                onReorder={onWidgetReorder}
                widgetColors={widgetColors}
                setWidgetColor={setWidgetColor}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                위젯 설정에서 이 섹션의 위젯을 활성화하세요
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
