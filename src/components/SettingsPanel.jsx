import { useWidgetStore } from '../store/widgetStore'
import { X } from 'lucide-react'

export default function SettingsPanel({ onClose }) {
  const { widgets, toggleWidget } = useWidgetStore()

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl w-full max-w-sm shadow-2xl border border-border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">위젯 설정</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="p-5 space-y-3">
          {widgets.map((w) => (
            <li key={w.id} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{w.label}</span>
              <button
                onClick={() => toggleWidget(w.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  w.enabled ? 'bg-blue-600' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    w.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>

        <p className="px-5 pb-4 text-xs text-muted-foreground">
          위젯을 드래그해서 순서를 변경할 수 있습니다
        </p>
      </div>
    </div>
  )
}
