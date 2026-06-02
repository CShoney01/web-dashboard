import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_WIDGETS = [
  { id: 'weather',   label: '날씨',           enabled: true },
  { id: 'exchange',  label: '환율',           enabled: true },
  { id: 'news',      label: '뉴스',           enabled: true },
  { id: 'stock',     label: '주가',           enabled: true },
  { id: 'crypto',    label: '가상화폐',        enabled: true },
  { id: 'calendar',  label: 'Google 캘린더',  enabled: true },
  { id: 'rss',       label: 'RSS 피드',       enabled: true },
  { id: 'budget',    label: '가계부',          enabled: true },
  { id: 'todo',      label: 'Todo',           enabled: true },
  { id: 'memo',      label: '메모',           enabled: true },
  { id: 'bookmarks', label: '즐겨찾기',        enabled: true },
  { id: 'quote',     label: '명언 / 운세',     enabled: true },
]

export const useWidgetStore = create(
  persist(
    (set) => ({
      widgets: DEFAULT_WIDGETS,
      sectionOrder: ['finance', 'info', 'productivity'],
      collapsedSections: [],

      toggleWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, enabled: !w.enabled } : w
          ),
        })),

      reorderWidgets: (newOrder) => set({ widgets: newOrder }),

      reorderSections: (newOrder) => set({ sectionOrder: newOrder }),

      toggleSectionCollapse: (id) =>
        set((state) => ({
          collapsedSections: state.collapsedSections.includes(id)
            ? state.collapsedSections.filter((s) => s !== id)
            : [...state.collapsedSections, id],
        })),

      widgetColors: {},
      setWidgetColor: (id, colorId) =>
        set((state) => ({
          widgetColors: { ...state.widgetColors, [id]: colorId },
        })),
    }),
    {
      name: 'dashboard-widget-config',
      merge: (persistedState, currentState) => {
        const storedIds = new Set(persistedState.widgets?.map((w) => w.id) ?? [])
        const newWidgets = DEFAULT_WIDGETS.filter((w) => !storedIds.has(w.id))
        return {
          ...currentState,
          ...persistedState,
          widgets: [...(persistedState.widgets ?? currentState.widgets), ...newWidgets],
        }
      },
    }
  )
)
