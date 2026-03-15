import { useOutletContext } from "react-router-dom";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useWaitingCallAlert } from "@/hooks/useWaitingCallAlert";
import { useSLATracker } from "@/hooks/useSLATracker";
import { SLAGauge } from "@/components/dashboard/SLAGauge";
import { WaitingCallsTable } from "@/components/dashboard/WaitingCallsTable";
import { MiniSparkline } from "@/components/dashboard/MiniSparkline";
import { PhoneIncoming, Clock, AlertTriangle, TrendingDown, Users, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

const CYAN = "hsl(187, 80%, 48%)";
const AMBER = "hsl(38, 92%, 50%)";
const SLATE = "hsl(215, 12%, 50%)";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-panel p-3 text-xs font-mono">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="flex justify-between gap-4">
          <span>{entry.name}:</span>
          <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function QueueMonitor() {
  const { soundEnabled } = useOutletContext<{ soundEnabled: boolean }>();
  const { latestSnapshot, chartData } = useAutoRefresh(60);
  const sla = useSLATracker(20);
  const s = latestSnapshot.data.summary;
  const { isAboveThreshold } = useWaitingCallAlert(s.waitingCalls, soundEnabled);

  const queueData = chartData.map(d => ({
    time: format(new Date(d.timestamp), "HH:mm"),
    waiting: d.data.summary.waitingCalls,
    active: d.data.summary.activeCalls,
  }));

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-sm font-bold tracking-tight flex items-center gap-2">
          <PhoneIncoming className="w-4 h-4 text-primary" />
          Queue Monitor
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          Real-time call queue management and SLA tracking
        </p>
      </div>

      {isAboveThreshold && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Critical Queue Level</p>
            <p className="text-xs text-destructive/80">{s.waitingCalls} calls waiting — immediate attention required</p>
          </div>
        </div>
      )}

      {/* Queue KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Waiting Now", value: s.waitingCalls, icon: Clock, color: s.waitingCalls >= 5 ? "text-warning" : "text-foreground" },
          { label: "Active Calls", value: s.activeCalls, icon: PhoneIncoming, color: "text-primary" },
          { label: "Available Agents", value: s.agentsWaiting, icon: Users, color: s.agentsWaiting === 0 ? "text-destructive" : "text-success" },
          { label: "Avg Speed Answer", value: `${sla.avgWaitTime}s`, icon: Zap, color: "text-primary" },
        ].map((kpi, i) => (
          <div key={i} className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
            </div>
            <p className={`font-mono text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SLAGauge sla={sla} />
        <div className="lg:col-span-2 glass-panel p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Queue Depth Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={queueData}>
                <defs>
                  <linearGradient id="queueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={AMBER} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={AMBER} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                <XAxis dataKey="time" tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <YAxis tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="waiting" stroke={AMBER} fill="url(#queueGrad)" strokeWidth={2} name="Waiting" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <WaitingCallsTable calls={latestSnapshot.data.details.waitingCalls} />
    </div>
  );
}
