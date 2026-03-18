import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'

export default function NarrativeSection({ insights, loading }) {
  if (loading) return <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
  if (!insights) return <div className="text-center py-12 text-sm text-muted-foreground">No narrative data</div>

  const narratives = insights.narratives ?? insights.narrative ?? {}
  const sections = typeof narratives === 'string'
    ? [{ title: 'Narrative', text: narratives }]
    : Array.isArray(narratives)
      ? narratives.map((n) => ({ title: n.title ?? n.section ?? 'Section', text: n.text ?? n.content ?? JSON.stringify(n) }))
      : Object.entries(narratives).map(([k, v]) => ({ title: k, text: typeof v === 'string' ? v : JSON.stringify(v, null, 2) }))

  if (sections.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Narrative</CardTitle></CardHeader>
        <CardContent>
          <pre className="text-xs font-mono text-muted-foreground overflow-auto max-h-60">{JSON.stringify(narratives, null, 2)}</pre>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {sections.map((s, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle className="capitalize">{s.title.replace(/_/g, ' ')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{s.text}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
