import { Phone, Users, Clock, TrendingUp, Activity, PhoneOff, PhoneCall } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import SparklineChart from '@/components/charts/SparklineChart'
import { useApp } from '@/context/AppContext'
import { formatNumber, formatPct, formatDuration, formatTimestamp } from '@/lib/utils'

/* ─── KPI Card ───────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, Icon, color = 'text-primary', trend, sparkData, sparkKey, sparkColor }) {
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
        {sparkData && (
          <div className="mt-3">
            <SparklineChart data={sparkData} dataKey={sparkKey} color={sparkColor} height={40} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ─── Agent bucket row ───────────────────────────────────────────────────────── */
const BUCKET_META = {
  chatting:       { label: 'Chatting',        color: 'bg-blue-500'   },
  email:          { label: 'Email',           color: 'bg-purple-500' },
  waiting_lt_1m:  { label: 'Wait < 1m',       color: 'bg-green-500'  },
  waiting_gt_1m:  { label: 'Wait > 1m',       color: 'bg-amber-500'  },
  paused:         { label: 'Paused',          color: 'bg-slate-400'  },
  dispo:          { label: 'Dispo',           color: 'bg-sky-500'    },
  dead:           { label: 'Dead',            color: 'bg-red-500'    },
  form:           { label: 'Form',            color: 'bg-pink-400'   },
  conference:     { label: 'Conference',      color: 'bg-indigo-400' },
  tfer_conf:      { label: 'Xfer Conf',       color: 'bg-violet-400' },
  parked:         { label: 'Parked',          color: 'bg-orange-400' },
  logged_out:     { label: 'Logged Out',      color: 'bg-gray-400'   },
  offline:        { label: 'Offline',         color: 'bg-gray-300'   },
  other:          { label: 'Other',           color: 'bg-slate-300'  },
}

function BucketBar({ buckets }) {
  if (!buckets) return null
  const total = Object.values(buckets).reduce((s, v) => s + (v || 0), 0)
  if (!total) return null

  return (
    <div className="space-y-1.5">
      {/* Stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {Object.entries(buckets).map(([k, v]) => {
          if (!v) return null
          const pct = (v / total) * 100
          const meta = BUCKET_META[k]
          return (
            <div
              key={k}
              className={`${meta?.color ?? 'bg-slate-400'} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${meta?.label ?? k}: ${v}`}
            />
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(buckets).map(([k, v]) => {
          if (!v) return null
          const meta = BUCKET_META[k]
          return (
            <span key={k} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className={`inline-block size-2 rounded-full ${meta?.color ?? 'bg-slate-400'}`} />
              {meta?.label ?? k}: <strong className="text-foreground">{v}</strong>
            </span>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function Overview() {
  const { latestSnapshot, recentPoints, wsStatus } = useApp()

  const s = latestSnapshot?.summary ?? null
  const meta = latestSnapshot?.meta ?? null
  const buckets = latestSnapshot?.agentBuckets ?? null

  const isLive = wsStatus === 'connected'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLive ? `Live · Updated ${formatTimestamp(latestSnapshot?.ts)}` : 'Waiting for live data…'}
          </p>
        </div>
        <Badge variant={isLive ? 'success' : 'muted'}>
          <Activity className="size-3" />
          {isLive ? 'Live' : 'Offline'}
        </Badge>
      </div>

      {/* KPI Grid */}
      {!s ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="pt-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Active Calls"
            value={formatNumber(s.activeCalls)}
            Icon={Phone}
            color="text-blue-500"
            sparkData={recentPoints}
            sparkKey="activeCalls"
            sparkColor="#2563EB"
          />
          <KpiCard
            label="Waiting Calls"
            value={formatNumber(s.waitingCalls)}
            sub={s.waitingCalls > 10 ? 'High queue' : undefined}
            Icon={PhoneCall}
            color="text-amber-500"
            sparkData={recentPoints}
            sparkKey="waitingCalls"
            sparkColor="#D97706"
          />
          <KpiCard
            label="Agents Online"
            value={formatNumber(s.agentsOnline)}
            Icon={Users}
            color="text-green-500"
            sparkData={recentPoints}
            sparkKey="agentsOnline"
            sparkColor="#16A34A"
          />
          <KpiCard
            label="Avg Wait"
            value={formatDuration(s.avgWaitTime)}
            Icon={Clock}
            color="text-purple-500"
          />
        </div>
      )}

      {/* Secondary row */}
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Calls Today"
            value={formatNumber(s.totalCallsToday)}
            Icon={TrendingUp}
            color="text-blue-400"
          />
          <KpiCard
            label="Answered"
            value={formatNumber(s.answeredCalls)}
            sub={formatPct(s.answeredCalls / Math.max(1, s.totalCallsToday) * 100) + ' answer rate'}
            Icon={PhoneCall}
            color="text-green-400"
          />
          <KpiCard
            label="Abandoned"
            value={formatNumber(s.abandonedCalls)}
            sub={formatPct(s.abandonedCalls / Math.max(1, s.totalCallsToday) * 100) + ' abandon rate'}
            Icon={PhoneOff}
            color="text-red-400"
          />
          <KpiCard
            label="Avg Handle"
            value={formatDuration(s.avgHandleTime)}
            Icon={Clock}
            color="text-violet-400"
          />
        </div>
      )}

      {/* Meta + Agent Buckets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System meta */}
        <Card>
          <CardHeader>
            <CardTitle>System Info</CardTitle>
          </CardHeader>
          <CardContent>
            {!meta ? (
              <Skeleton className="h-20" />
            ) : (
              <dl className="space-y-2">
                {Object.entries(meta).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <dt className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</dt>
                    <dd className="font-medium">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Agent buckets */}
        <Card>
          <CardHeader>
            <CardTitle>Agent States</CardTitle>
          </CardHeader>
          <CardContent>
            {!buckets ? (
              <Skeleton className="h-20" />
            ) : (
              <BucketBar buckets={buckets} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
