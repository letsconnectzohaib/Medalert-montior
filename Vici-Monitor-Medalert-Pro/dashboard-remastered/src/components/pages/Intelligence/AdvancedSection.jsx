import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'

function DataTable({ data, title }) {
  if (!data?.length) return <div className="py-6 text-center text-sm text-muted-foreground">No {title.toLowerCase()} data</div>
  const cols = Object.keys(data[0])
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                {c.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
              {cols.map((c) => (
                <td key={c} className="px-3 py-1.5 text-xs whitespace-nowrap">{row[c] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdvancedSection({ insights, campaigns, agents, transitions, loading }) {
  if (loading) return <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>

  return (
    <div className="space-y-4">
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="agents">Agents ({agents.length})</TabsTrigger>
          <TabsTrigger value="transitions">Transitions ({transitions.length})</TabsTrigger>
          {insights?.advanced && <TabsTrigger value="raw">Advanced</TabsTrigger>}
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader><CardTitle>Campaign Breakdown</CardTitle></CardHeader>
            <CardContent className="p-0">
              <DataTable data={campaigns} title="Campaign" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <Card>
            <CardHeader><CardTitle>Agent Performance</CardTitle></CardHeader>
            <CardContent className="p-0">
              <DataTable data={agents} title="Agent" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transitions">
          <Card>
            <CardHeader><CardTitle>State Transitions</CardTitle></CardHeader>
            <CardContent className="p-0">
              <DataTable data={transitions} title="Transition" />
            </CardContent>
          </Card>
        </TabsContent>

        {insights?.advanced && (
          <TabsContent value="raw">
            <Card>
              <CardHeader><CardTitle>Advanced Data</CardTitle></CardHeader>
              <CardContent>
                <pre className="text-xs font-mono text-muted-foreground overflow-auto max-h-96">{JSON.stringify(insights.advanced, null, 2)}</pre>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
