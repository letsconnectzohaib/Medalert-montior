import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import { formatNumber, formatPct } from '@/lib/utils'

export default function PredictionSection({ insights, loading }) {
  if (loading) return <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
  if (!insights) return <div className="text-center py-12 text-sm text-muted-foreground">No prediction data</div>

  const predictions = insights.predictions ?? insights.prediction ?? {}
  const items = Array.isArray(predictions) ? predictions : Object.entries(predictions).map(([k, v]) => ({ key: k, ...v }))

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <Card>
          <CardHeader><CardTitle>Prediction Data</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs font-mono text-muted-foreground overflow-auto max-h-60">{JSON.stringify(predictions, null, 2)}</pre>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((item, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {item.label ?? item.key ?? `Prediction ${i + 1}`}
                  {item.confidence != null && (
                    <Badge variant={item.confidence > 0.7 ? 'success' : item.confidence > 0.4 ? 'warning' : 'muted'}>
                      {formatPct(item.confidence * 100)} confidence
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.description ?? item.value ?? JSON.stringify(item)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
