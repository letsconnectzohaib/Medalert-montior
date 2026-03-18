import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'

export default function PatternSection({ insights, loading }) {
  if (loading) return <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
  if (!insights) return <div className="text-center py-12 text-sm text-muted-foreground">No pattern data</div>

  const patterns = insights.patterns ?? {}
  const hourlyTrends = patterns.hourlyTrends ?? patterns.hourly ?? []
  const peakPeriods = patterns.peakPeriods ?? patterns.peaks ?? []
  const anomalies = patterns.anomalies ?? []

  return (
    <div className="space-y-4">
      {/* Hourly trends */}
      {hourlyTrends.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Hourly Trends</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {Object.keys(hourlyTrends[0]).map((k) => (
                      <th key={k} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hourlyTrends.map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-4 py-1.5 text-xs font-mono">{v ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Anomalies Detected</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {anomalies.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Badge variant="warning" className="mt-0.5 shrink-0">{a.type ?? 'anomaly'}</Badge>
                  <span>{a.description ?? a.message ?? JSON.stringify(a)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fallback */}
      {hourlyTrends.length === 0 && anomalies.length === 0 && (
        <Card>
          <CardHeader><CardTitle>Pattern Data</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs font-mono text-muted-foreground overflow-auto max-h-60">{JSON.stringify(patterns, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
