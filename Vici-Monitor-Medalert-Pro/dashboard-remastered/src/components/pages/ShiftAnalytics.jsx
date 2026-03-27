import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Calendar, Phone, Users, Clock, TrendingUp, Activity, Download, Filter } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Label from '@/components/ui/Label'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import ShiftBarChart from '@/components/charts/ShiftBarChart'
import ShiftLineChart from '@/components/charts/ShiftLineChart'
import { useApp } from '@/context/AppContext'
import { fetchShiftIntelligence, fetchShiftCallflow } from '@/lib/api'
import { formatNumber, formatDuration, formatPct, todayDateString } from '@/lib/utils'

function StatCard({ label, value, sub, icon, color, trend }) {
  const Icon = icon || Activity
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
            <p className="text-2xl font-semibold tracking-tight">{value ?? '—'}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${color} bg-current/10`}>
            <Icon className="size-4" style={{ color: 'inherit' }} />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className={`size-3 ${trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500 rotate-180' : 'text-gray-500'}`} />
            <span className="text-xs text-muted-foreground">
              {trend > 0 ? '+' : ''}{trend}% from yesterday
            </span>
          </div>
        )}
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
  const [useDemo, setUseDemo] = useState(false)

  // Mock data for demo mode
  const mockIntel = {
    shiftStats: {
      totalCalls: 1247,
      answeredCalls: 1198,
      totalCalls: 1247,
      answerRate: 96.1,
      avgHandleTime: 245,
      avgWaitTime: 28,
      abandonRate: 3.9,
    },
    hourlyBreakdown: [
      { hour: '08:00', chatting: 3, email: 1, waiting_lt_1m: 1, waiting_gt_1m: 0, paused: 0, dispo: 1, dead: 0 },
      { hour: '09:00', chatting: 5, email: 2, waiting_lt_1m: 2, waiting_gt_1m: 1, paused: 1, dispo: 1, dead: 0 },
      { hour: '10:00', chatting: 7, email: 1, waiting_lt_1m: 3, waiting_gt_1m: 2, paused: 0, dispo: 2, dead: 0 },
      { hour: '11:00', chatting: 8, email: 3, waiting_lt_1m: 2, waiting_gt_1m: 1, paused: 1, dispo: 1, dead: 0 },
      { hour: '12:00', chatting: 6, email: 2, waiting_lt_1m: 2, waiting_gt_1m: 2, paused: 2, dispo: 1, dead: 0 },
      { hour: '13:00', chatting: 9, email: 1, waiting_lt_1m: 3, waiting_gt_1m: 1, paused: 0, dispo: 2, dead: 0 },
      { hour: '14:00', chatting: 10, email: 2, waiting_lt_1m: 4, waiting_gt_1m: 2, paused: 1, dispo: 1, dead: 0 },
      { hour: '15:00', chatting: 8, email: 3, waiting_lt_1m: 3, waiting_gt_1m: 1, paused: 1, dispo: 2, dead: 0 },
      { hour: '16:00', chatting: 7, email: 2, waiting_lt_1m: 2, waiting_gt_1m: 1, paused: 0, dispo: 1, dead: 0 },
    ]
  }

  const mockCallflow = {
    points: [
      { time: '08:00', activeCalls: 12, waitingCalls: 2 },
      { time: '09:00', activeCalls: 18, waitingCalls: 3 },
      { time: '10:00', activeCalls: 25, waitingCalls: 5 },
      { time: '11:00', activeCalls: 22, waitingCalls: 4 },
      { time: '12:00', activeCalls: 20, waitingCalls: 6 },
      { time: '13:00', activeCalls: 28, waitingCalls: 4 },
      { time: '14:00', activeCalls: 32, waitingCalls: 7 },
      { time: '15:00', activeCalls: 26, waitingCalls: 5 },
      { time: '16:00', activeCalls: 18, waitingCalls: 3 },
    ]
  }

  const load = useCallback(async () => {
    if (!date) return
    setLoading(true)
    
    try {
      const [intelRes, cfRes] = await Promise.all([
        fetchShiftIntelligence(baseUrl, token, date),
        fetchShiftCallflow(baseUrl, token, date),
      ])
      
      if (intelRes.success) {
        setIntel(intelRes.data)
        setUseDemo(false)
      } else {
        // Use demo data if API fails
        setIntel(mockIntel)
        setCallflow(mockCallflow)
        setUseDemo(true)
        toast('Using demo data - API unavailable', 'warning')
      }
      
      if (cfRes.success) {
        setCallflow(cfRes.data)
      }
    } catch (error) {
      // Use demo data on any error
      setIntel(mockIntel)
      setCallflow(mockCallflow)
      setUseDemo(true)
      toast('Using demo data - API unavailable', 'warning')
    } finally {
      setLoading(false)
    }
  }, [baseUrl, token, date, toast])

  useEffect(() => { load() }, [load])

  const s = intel?.shiftStats ?? null
  const hourly = intel?.hourlyBreakdown ?? []
  const cfPoints = callflow?.points ?? []

  const handleExport = () => {
    if (!hourly.length) return
    
    const csvContent = [
      ['Hour', 'Chatting', 'Email', 'Waiting < 1m', 'Waiting > 1m', 'Paused', 'Dispo', 'Dead'],
      ...hourly.map(row => [
        row.hour,
        row.chatting || 0,
        row.email || 0,
        row.waiting_lt_1m || 0,
        row.waiting_gt_1m || 0,
        row.paused || 0,
        row.dispo || 0,
        row.dead || 0
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shift-analytics-${date}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast('Shift data exported successfully', 'success')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Shift Analytics</h1>
          <p className="text-muted-foreground">Historical shift performance and agent metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={useDemo ? 'warning' : 'success'}>
            {useDemo ? 'Demo Mode' : 'Live Data'}
          </Badge>
          <Button variant="outline" onClick={handleExport} disabled={!hourly.length}>
            <Download className="size-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="shift-date">Shift Date</Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="shift-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-8 w-44"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="pt-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
      ) : s ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Total Calls" 
            value={formatNumber(s.totalCalls)} 
            icon={Phone}
            color="text-blue-500"
            trend={5.2}
          />
          <StatCard
            label="Answer Rate"
            value={formatPct(s.answerRate ?? (s.answeredCalls / Math.max(1, s.totalCalls) * 100))}
            icon={TrendingUp}
            color="text-green-500"
            trend={2.1}
          />
          <StatCard 
            label="Avg Handle Time" 
            value={formatDuration(s.avgHandleTime)}
            icon={Clock}
            color="text-purple-500"
            trend={-3.5}
          />
          <StatCard 
            label="Avg Wait Time" 
            value={formatDuration(s.avgWaitTime)}
            icon={Users}
            color="text-orange-500"
            trend={-8.2}
          />
        </div>
      ) : null}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Hourly Agent States
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64" /> : <ShiftBarChart data={hourly} height={280} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="size-5" />
              Call Flow Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64" /> : <ShiftLineChart data={cfPoints} height={280} />}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Hourly Table */}
      {hourly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="size-5" />
                Hourly Breakdown
              </span>
              <Badge variant="outline">{hourly.length} hours</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hour</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chatting</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wait &lt; 1m</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wait &gt; 1m</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paused</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dispo</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dead</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {hourly.map((row, i) => {
                    const total = Object.values(row).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0)
                    return (
                      <tr key={i} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium">{row.hour}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                            {row.chatting || 0}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200">
                            {row.email || 0}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                            {row.waiting_lt_1m || 0}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={row.waiting_gt_1m > 2 ? 'danger' : 'outline'} className="bg-orange-500/10 text-orange-600 border-orange-200">
                            {row.waiting_gt_1m || 0}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-200">
                            {row.paused || 0}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="bg-cyan-500/10 text-cyan-600 border-cyan-200">
                            {row.dispo || 0}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={row.dead > 0 ? 'danger' : 'outline'} className="bg-red-500/10 text-red-600 border-red-200">
                            {row.dead || 0}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">{total}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
