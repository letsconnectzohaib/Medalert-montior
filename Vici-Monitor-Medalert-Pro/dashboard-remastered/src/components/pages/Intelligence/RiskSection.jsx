import { AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'

const RISK_VARIANT = { high: 'danger', medium: 'warning', low: 'success', critical: 'danger' }
const RISK_ICON = { high: AlertTriangle, medium: AlertTriangle, low: ShieldCheck, critical: ShieldAlert }

export default function RiskSection({ insights, loading }) {
  if (loading) return <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
  if (!insights) return <div className="text-center py-12 text-sm text-muted-foreground">No risk data</div>

  const risk = insights.risk ?? insights.risks ?? {}
  const factors = Array.isArray(risk) ? risk : (risk.factors ?? risk.items ?? [])
  const score = risk.score ?? risk.overallScore ?? null

  return (
    <div className="space-y-4">
      {/* Overall score */}
      {score != null && (
        <Card>
          <CardHeader><CardTitle>Overall Risk Score</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${score > 70 ? 'text-danger' : score > 40 ? 'text-warning' : 'text-success'}`}>
                {Math.round(score)}
              </div>
              <div>
                <Badge variant={score > 70 ? 'danger' : score > 40 ? 'warning' : 'success'}>
                  {score > 70 ? 'High Risk' : score > 40 ? 'Medium Risk' : 'Low Risk'}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Score out of 100</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk factors */}
      {factors.length > 0 ? (
        <Card>
          <CardHeader><CardTitle>Risk Factors</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {factors.map((f, i) => {
                const level = (f.level ?? f.severity ?? 'medium').toLowerCase()
                const Icon = RISK_ICON[level] ?? AlertTriangle
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                    <Icon className={`size-4 mt-0.5 shrink-0 ${level === 'high' || level === 'critical' ? 'text-danger' : level === 'medium' ? 'text-warning' : 'text-success'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{f.label ?? f.name ?? f.type}</span>
                        <Badge variant={RISK_VARIANT[level] ?? 'muted'} className="text-[10px]">{level}</Badge>
                      </div>
                      {(f.description ?? f.message) && (
                        <p className="text-xs text-muted-foreground mt-0.5">{f.description ?? f.message}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Risk Data</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs font-mono text-muted-foreground overflow-auto max-h-60">{JSON.stringify(risk, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
