import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Label from '@/components/ui/Label'
import Skeleton from '@/components/ui/Skeleton'
import ShiftBarChart from '@/components/charts/ShiftBarChart'
import ShiftLineChart from '@/components/charts/ShiftLineChart'
import { useApp } from '@/context/AppContext'
import { fetchShiftIntelligence, fetchShiftCallflow } from '@/lib/api'
import { formatNumber, formatDuration, formatPct, todayDateString } from '@/lib/utils'

function StatCard({ label, value, sub }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-xl font-semibold">{value ?? '—'}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default function ShiftAnalytics() {
  const { baseUrl, token, toast } = useApp()
  const [date, setDate] = useState(todayDateString())
  const [intel, setIntel] = useState(null)
  const [callflow, setCallflow] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!date) return
    setLoading(true)
    const [intelRes, cfRes] = await Promise.all([
      fetchShiftIntelligence(baseUrl, token, date),
      fetchShiftCallflow(baseUrl, token, date),
    ])
    setLoading(false)
    if (!intelRes.success) { toast(intelRes.error || 'Failed to load shift data', 'error'); return }
    setIntel(intelRes.data)
    if (cfRes.success) setCallflow(cfRes.data)
  }, [baseUrl, token, date, toast])

  useEffect(() => { load() }, [load])

  const s = intel?.shiftStats ?? null
  const hourly = intel?.hourlyBreakdown ?? []
  const cfPoints = callflow?.points ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Shift Analytics</h1>
          <p className="text-sm text-muted-foreground">Historical shift performance by date</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="shift-date" className="sr-only">Date</Label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="shift-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-8 w-40"
              />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Card key={i}><CardContent className="pt-4"><Skeleton className="h-14" /></CardContent></Card>)}
        </div>
      ) : s ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Calls" value={formatNumber(s.totalCalls)} />
          <StatCard
            label="Answer Rate"
            value={formatPct(s.answerRate ?? (s.answeredCalls / Math.max(1, s.totalCalls) * 100))}
          />
          <StatCard label="Avg Handle Time" value={formatDuration(s.avgHandleTime)} />
          <StatCard label="Avg Wait Time" value={formatDuration(s.avgWaitTime)} />
        </div>
      ) : null}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Hourly Agent States</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64" /> : <ShiftBarChart data={hourly} height={260} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Call Flow Over Time</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64" /> : <ShiftLineChart data={cfPoints} height={260} />}
          </CardContent>
        </Card>
      </div>

      {/* Hourly table */}
      {hourly.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Hourly Breakdown</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {Object.keys(hourly[0]).map((col) => (
                      <th key={col} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hourly.map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-4 py-2 text-xs font-mono whitespace-nowrap">
                          {v ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
