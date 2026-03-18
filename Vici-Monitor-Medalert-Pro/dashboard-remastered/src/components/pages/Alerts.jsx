import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCircle, XCircle, RefreshCw, Filter } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import NativeSelect from '@/components/ui/NativeSelect'
import { useApp } from '@/context/AppContext'
import { fetchAlerts, acknowledgeAlert, resolveAlert } from '@/lib/api'
import { formatTimestamp } from '@/lib/utils'

const SEVERITY_VARIANT = { critical: 'danger', high: 'danger', medium: 'warning', low: 'default', info: 'muted' }
const STATUS_VARIANT = { active: 'danger', acknowledged: 'warning', resolved: 'success' }

export default function Alerts() {
  const { baseUrl, token, toast } = useApp()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all') // 'all' | 'unacknowledged'
  const [severityFilter, setSeverityFilter] = useState('all')
  const [acting, setActing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetchAlerts(baseUrl, token, { unacknowledged: filter === 'unacknowledged' })
    setLoading(false)
    if (res.success) setAlerts(res.data?.alerts ?? [])
    else toast(res.error || 'Failed to load alerts', 'error')
  }, [baseUrl, token, filter, toast])

  useEffect(() => { load() }, [load])

  async function handleAck(id) {
    setActing(id)
    const res = await acknowledgeAlert(baseUrl, token, id)
    setActing(null)
    if (!res.success) { toast(res.error || 'Failed', 'error'); return }
    toast('Alert acknowledged', 'success')
    load()
  }

  async function handleResolve(id) {
    setActing(id)
    const res = await resolveAlert(baseUrl, token, id)
    setActing(null)
    if (!res.success) { toast(res.error || 'Failed', 'error'); return }
    toast('Alert resolved', 'success')
    load()
  }

  const visible = severityFilter === 'all' ? alerts : alerts.filter((a) => a.severity === severityFilter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Alerts</h1>
          <p className="text-sm text-muted-foreground">{visible.length} alert{visible.length !== 1 ? 's' : ''} shown</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="size-3.5 text-muted-foreground" />
            <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40 h-8 text-xs">
              <option value="all">All alerts</option>
              <option value="unacknowledged">Unacknowledged</option>
            </NativeSelect>
          </div>
          <NativeSelect value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="w-32 h-8 text-xs">
            <option value="all">All severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </NativeSelect>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-5 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : visible.length === 0 ? (
            <div className="p-10 text-center">
              <Bell className="size-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No alerts</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Severity</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Message</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Time</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((a) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <Badge variant={SEVERITY_VARIANT[a.severity] ?? 'muted'} className="capitalize">
                          {a.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 max-w-xs truncate">{a.message ?? a.description}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={STATUS_VARIANT[a.status] ?? 'muted'} className="capitalize">
                          {a.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(a.createdAt ?? a.ts)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {a.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAck(a.id)}
                              disabled={acting === a.id}
                              title="Acknowledge"
                            >
                              <CheckCircle className="size-3.5 text-warning" />
                            </Button>
                          )}
                          {a.status !== 'resolved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResolve(a.id)}
                              disabled={acting === a.id}
                              title="Resolve"
                            >
                              <XCircle className="size-3.5 text-success" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
