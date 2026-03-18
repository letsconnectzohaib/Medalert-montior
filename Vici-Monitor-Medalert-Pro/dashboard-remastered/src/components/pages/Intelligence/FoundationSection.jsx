import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import { formatNumber, formatDuration, formatPct } from '@/lib/utils'

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value ?? '—'}</span>
    </div>
  )
}

export default function FoundationSection({ insights, loading }) {
  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
  if (!insights) return <div className="text-center py-12 text-sm text-muted-foreground">No foundation data for this date</div>

  const f = insights.foundation ?? insights.summary ?? {}
  const shift = insights.shiftStats ?? {}

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle>Call Volume</CardTitle></CardHeader>
        <CardContent>
          <MetricRow label="Total Calls" value={formatNumber(f.totalCalls ?? shift.totalCalls)} />
          <MetricRow label="Answered" value={formatNumber(f.answeredCalls ?? shift.answeredCalls)} />
          <MetricRow label="Abandoned" value={formatNumber(f.abandonedCalls ?? shift.abandonedCalls)} />
          <MetricRow label="Answer Rate" value={formatPct(f.answerRate ?? shift.answerRate)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Handle Times</CardTitle></CardHeader>
        <CardContent>
          <MetricRow label="Avg Handle Time" value={formatDuration(f.avgHandleTime ?? shift.avgHandleTime)} />
          <MetricRow label="Avg Wait Time" value={formatDuration(f.avgWaitTime ?? shift.avgWaitTime)} />
          <MetricRow label="Avg Talk Time" value={formatDuration(f.avgTalkTime)} />
          <MetricRow label="Peak Hour" value={f.peakHour ?? '—'} />
        </CardContent>
      </Card>

      {f.agentUtilization != null && (
        <Card>
          <CardHeader><CardTitle>Agent Utilization</CardTitle></CardHeader>
          <CardContent>
            <MetricRow label="Utilization Rate" value={formatPct(f.agentUtilization)} />
            <MetricRow label="Unique Agents" value={formatNumber(f.uniqueAgents)} />
            <MetricRow label="Avg Calls / Agent" value={formatNumber(f.avgCallsPerAgent, 1)} />
          </CardContent>
        </Card>
      )}

      {/* Raw JSON fallback */}
      {!f.totalCalls && !shift.totalCalls && (
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Raw Foundation Data</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs font-mono text-muted-foreground overflow-auto max-h-60">{JSON.stringify(insights, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
