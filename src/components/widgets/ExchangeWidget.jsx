import { useEffect, useState } from 'react'
import axios from 'axios'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const API_KEY = import.meta.env.VITE_EXCHANGE_API_KEY
const BASE = import.meta.env.VITE_EXCHANGE_BASE || 'USD'
const TARGETS = ['KRW', 'JPY', 'EUR', 'CNY']

export default function ExchangeWidget() {
  const [rates, setRates] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updated, setUpdated] = useState(null)

  useEffect(() => {
    if (!API_KEY) {
      setError('API 키가 없습니다 (.env 설정 필요)')
      setLoading(false)
      return
    }
    axios
      .get(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${BASE}`)
      .then((res) => {
        setRates(res.data.conversion_rates)
        setUpdated(new Date(res.data.time_last_update_utc).toLocaleDateString('ko-KR'))
      })
      .catch(() => setError('환율 데이터를 불러올 수 없습니다'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-3">
        <CardTitle className="text-sm font-bold text-foreground">💱 환율</CardTitle>
        {updated && <span className="text-xs text-muted-foreground">{updated}</span>}
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 flex-1">
        {loading && <SkeletonRows count={TARGETS.length} />}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {rates && (
          <div className="space-y-2.5">
            {TARGETS.map((cur) => (
              <div key={cur} className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">
                  {BASE} → {cur}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {rates[cur]?.toLocaleString(undefined, {
                    minimumFractionDigits: cur === 'KRW' ? 0 : 2,
                    maximumFractionDigits: cur === 'KRW' ? 0 : 4,
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SkeletonRows({ count }) {
  return (
    <div className="space-y-2.5 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex justify-between">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
        </div>
      ))}
    </div>
  )
}
