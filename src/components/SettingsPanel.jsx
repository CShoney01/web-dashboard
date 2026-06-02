import { useWidgetStore } from '../store/widgetStore'

export default function SettingsPanel({ onClose }) {
  const { widgets, toggleWidget } = useWidgetStore()

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-raised rounded-xl w-full max-w-sm shadow-2xl border border-surface-border">
        <div className="flex items-center justify-between p-5 border-b border-surface-border">
          <h2 className="font-semibold text-gray-100">위젯 설정</h2>
          <button onClick={onClose} className="btn-ghost text-sm">
            닫기
          </button>
        </div>

        <ul className="p-5 space-y-3">
          {widgets.map((w) => (
            <li
              key={w.id}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-gray-200">{w.label}</span>
              <button
                onClick={() => toggleWidget(w.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  w.enabled ? 'bg-blue-600' : 'bg-white/15'
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

        <p className="px-5 pb-4 text-xs text-gray-500">
          위젯을 드래그해서 순서를 변경할 수 있습니다
        </p>
      </div>
    </div>
  )
}
