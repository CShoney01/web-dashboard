import { useState, useEffect } from 'react';
import WidgetGrid from './components/WidgetGrid';
import SettingsPanel from './components/SettingsPanel';
import { useDataStore } from './store/dataStore';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const store = useDataStore.getState();
    store.fetchWeather();
    store.fetchExchange();
    store.fetchNews();
    store.fetchCrypto();
  }, []);

  const timeStr = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                  />
                </svg>
              </div>
              <span className="text-sm font-bold tracking-tight">Dashboard</span>
            </div>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-baseline gap-2.5">
              <span className="text-sm font-semibold tabular-nums">{timeStr}</span>
              <span className="text-xs text-muted-foreground hidden sm:block">{dateStr}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:block">위젯 설정</span>
          </Button>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        <WidgetGrid />
      </main>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
