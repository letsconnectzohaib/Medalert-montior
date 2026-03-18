import { useState, useEffect, useCallback } from 'react'
import { FileText, Plus, RefreshCw, Download } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Label from '@/components/ui/Label'
import Skeleton from '@/components/ui/Skeleton'
import Badge from '@/components/ui/Badge'
import { useApp } from '@/context/AppContext'
import { fetchReports, generateReport } from '@/lib/api'
import { formatDate, todayDateString } from '@/lib/utils'

export default function Reports() {
  const { baseUrl, token, toast } = useApp()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genDate, setGenDate] = useState(todayDateString())

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetchReports(baseUrl, token)
    setLoading(false)
    if (res.success) setReports(res.data?.reports ?? [])
    else toast(res.error || 'Failed to load reports', 'error')
  }, [baseUrl, token, toast])

  useEffect(() => { load() }, [load])

  async function handleGenerate() {
    setGenerating(true)
    const res = await generateReport(baseUrl, token, { date: genDate })
    setGenerating(false)
    if (!res.success) { toast(res.error || 'Failed to generate report', 'error'); return }
    toast('Report generated', 'success')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Generate and download shift reports</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Generate */}
      <Card>
        <CardHeader><CardTitle>Generate Report</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1.5">
              <Label htmlFor="report-date">Shift Date</Label>
              <Input
                id="report-date"
                type="date"
                value={genDate}
                onChange={(e) => setGenDate(e.target.value)}
                className="w-44"
              />
            </div>
            <Button onClick={handleGenerate} disabled={generating}>
              <Plus className="size-4" />
              {generating ? 'Generating…' : 'Generate'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report list */}
      <Card>
        <CardHeader><CardTitle>Report History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-5 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="size-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reports yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Generated</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id ?? r.date} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{r.date ?? '—'}</td>
                      <td className="px-4 py-2.5 capitalize text-muted-foreground">{r.type ?? 'shift'}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={r.status === 'ready' ? 'success' : r.status === 'error' ? 'danger' : 'muted'}>
                          {r.status ?? 'unknown'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {r.url && (
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex">
                            <Button variant="ghost" size="sm">
                              <Download className="size-3.5" />
                            </Button>
                          </a>
                        )}
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
