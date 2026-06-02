import { useState, useEffect, useCallback } from 'react'
import { useWidgetStore } from '../store/widgetStore'
import SectionCard from './SectionCard'
import QuoteWidget from './widgets/QuoteWidget'
import MemoWidget  from './widgets/MemoWidget'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const SECTION_DEFS = {
  finance: {
    label: '금융',
    accent: { bar: 'bg-blue-500', text: 'text-blue-400' },
    widgets: ['exchange', 'stock', 'crypto', 'budget'],
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  info: {
    label: '정보',
    accent: { bar: 'bg-amber-500', text: 'text-amber-400' },
    widgets: ['weather', 'news', 'rss'],
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  productivity: {
    label: '생산성',
    accent: { bar: 'bg-emerald-500', text: 'text-emerald-400' },
    widgets: ['calendar', 'todo', 'bookmarks'],
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
}

export default function WidgetGrid() {
  const {
    widgets, reorderWidgets,
    sectionOrder,
    collapsedSections, toggleSectionCollapse,
    widgetColors, setWidgetColor,
  } = useWidgetStore()

  const [currentPage, setCurrentPage] = useState(0)

  const quoteEnabled   = widgets.find((w) => w.id === 'quote')?.enabled
  const memoEnabled    = widgets.find((w) => w.id === 'memo')?.enabled
  const hasStandalone  = quoteEnabled || memoEnabled

  // pages: section pages + optional standalone page
  const pages = [
    ...sectionOrder.map((id) => ({ type: 'section', id })),
    ...(hasStandalone ? [{ type: 'standalone' }] : []),
  ]
  const totalPages = pages.length
  const page = Math.min(currentPage, totalPages - 1)

  // Clamp if pages shrink (e.g. widget disabled)
  useEffect(() => {
    if (currentPage >= totalPages) setCurrentPage(Math.max(0, totalPages - 1))
  }, [totalPages, currentPage])

  const prev = useCallback(() => setCurrentPage((p) => Math.max(0, p - 1)), [])
  const next = useCallback(() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1)), [totalPages])

  // Arrow-key navigation (skip when typing in an input/textarea)
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next])

  function getSectionWidgetIds(sectionId) {
    return widgets
      .filter((w) => SECTION_DEFS[sectionId].widgets.includes(w.id) && w.enabled)
      .map((w) => w.id)
  }

  function handleWidgetReorder(sectionId, newSectionOrder) {
    const disabled = widgets.filter((w) => !w.enabled)
    const newFull  = sectionOrder.flatMap((sid) => {
      if (sid === sectionId) {
        return newSectionOrder.map((id) => widgets.find((w) => w.id === id))
      }
      return widgets.filter((w) => SECTION_DEFS[sid].widgets.includes(w.id) && w.enabled)
    })
    reorderWidgets([...newFull, ...disabled])
  }

  const currentDef  = pages[page]?.type === 'section' ? SECTION_DEFS[pages[page].id] : null
  const currentLabel = currentDef?.label ?? '기타 위젯'

  return (
    <div className="space-y-5">
      {/* ── Carousel row ── */}
      <div className="flex items-start gap-2">

        {/* Left arrow */}
        <div className="flex items-center pt-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={prev}
            disabled={page === 0}
            className="h-10 w-10 rounded-full disabled:opacity-20"
            aria-label="이전 페이지"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Slide window */}
        <div className="flex-1 overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${page * 100}%)` }}
          >
            {pages.map((pg) => (
              <div key={pg.type === 'section' ? pg.id : 'standalone'} className="w-full flex-shrink-0">
                {pg.type === 'section' ? (
                  <SectionCard
                    sectionId={pg.id}
                    def={SECTION_DEFS[pg.id]}
                    widgetIds={getSectionWidgetIds(pg.id)}
                    isCollapsed={collapsedSections.includes(pg.id)}
                    onToggle={() => toggleSectionCollapse(pg.id)}
                    onWidgetReorder={(newOrder) => handleWidgetReorder(pg.id, newOrder)}
                    widgetColors={widgetColors}
                    setWidgetColor={setWidgetColor}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    {quoteEnabled && (
                      <div className={!memoEnabled ? 'md:col-span-3' : ''}>
                        <QuoteWidget />
                      </div>
                    )}
                    {memoEnabled && (
                      <div className={!quoteEnabled ? 'md:col-span-3' : 'md:col-span-2'}>
                        <MemoWidget />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right arrow */}
        <div className="flex items-center pt-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            disabled={page === totalPages - 1}
            className="h-10 w-10 rounded-full disabled:opacity-20"
            aria-label="다음 페이지"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* ── Dots + label ── */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          {pages.map((pg, i) => {
            const label = pg.type === 'section' ? SECTION_DEFS[pg.id]?.label : '기타'
            const active = i === page
            return (
              <button
                key={pg.type === 'section' ? pg.id : 'standalone'}
                onClick={() => setCurrentPage(i)}
                title={label}
                aria-label={label}
                className={[
                  'rounded-full transition-all duration-200',
                  active
                    ? 'w-6 h-2 bg-primary'
                    : 'w-2 h-2 bg-muted hover:bg-muted-foreground',
                ].join(' ')}
              />
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {currentLabel} &middot; {page + 1} / {totalPages}
        </p>
      </div>
    </div>
  )
}
