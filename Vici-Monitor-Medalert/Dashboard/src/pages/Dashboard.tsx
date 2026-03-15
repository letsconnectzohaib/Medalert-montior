import { useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useWaitingCallAlert } from "@/hooks/useWaitingCallAlert";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { CallVolumeChart, AgentActivityChart, AgentStatusPie } from "@/components/dashboard/Charts";
import { SLAGauge } from "@/components/dashboard/SLAGauge";
import { MiniSparkline } from "@/components/dashboard/MiniSparkline";
import { HeatmapChart } from "@/components/dashboard/HeatmapChart";
import { AgentTable } from "@/components/dashboard/AgentTable";
import { WaitingCallsTable } from "@/components/dashboard/WaitingCallsTable";
import { TimeFilter } from "@/components/dashboard/TimeFilter";
import { useSLATracker } from "@/hooks/useSLATracker";
import {
  PhoneCall, Users, Clock, PhoneOff, UserCheck, UserX,
  Pause, AlertTriangle, Activity, RefreshCw, TrendingUp, TrendingDown
} from "lucide-react";
import { format } from "date-fns";

const Dashboard = () => {
  const { soundEnabled } = useOutletContext<{ soundEnabled: boolean }>();
  const [timeWindow, setTimeWindow] = useState(60);
  const { latestSnapshot, chartData, lastRefresh, refresh } = useAutoRefresh(timeWindow);
  const sla = useSLATracker(20);

  const s = latestSnapshot.data.summary;
  const { isAboveThreshold } = useWaitingCallAlert(s.waitingCalls, soundEnabled);

  const shiftStart = "18:45";
  const shiftEnd = "06:00";
  const now = format(new Date(), "HH:mm:ss");

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-sm font-bold tracking-tight">Operations Overview</h1>
          <p className="text-xs text-muted-foreground font-mono">
            Shift {shiftStart} — {shiftEnd} • Live at {now}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/shift-summary" className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
            Shift Summary
          </Link>
          <TimeFilter value={timeWindow} onChange={setTimeWindow} />
          <button
            onClick={refresh}
            className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={`Last refresh: ${format(lastRefresh, "HH:mm:ss")}`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground font-mono hidden md:inline">
            Updated {format(lastRefresh, "HH:mm:ss")}
          </span>
        </div>
      </div>

      {/* Alert banner */}
      {isAboveThreshold && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-3 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-semibold text-warning">High Queue Alert</p>
            <p className="text-xs text-warning/80">{s.waitingCalls} calls waiting — threshold is 5</p>
          </div>
        </div>
      )}

      {/* KPI Row 1 — Primary metrics with sparklines */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MetricCard title="Active Calls" value={s.activeCalls} icon={PhoneCall} variant="primary"
          subtitle={<MiniSparkline data={chartData.map(d => d.data.summary.activeCalls)} color="hsl(187, 80%, 48%)" />} />
        <MetricCard title="Waiting Calls" value={s.waitingCalls} icon={Clock} variant={s.waitingCalls >= 5 ? "warning" : "default"}
          subtitle={<MiniSparkline data={chartData.map(d => d.data.summary.waitingCalls)} color="hsl(38, 92%, 50%)" />} />
        <MetricCard title="Agents Logged In" value={s.agentsLoggedIn} icon={Users} variant="success" />
        <MetricCard title="Agents In Calls" value={s.agentsInCalls} icon={UserCheck} variant="primary" />
        <MetricCard title="Agents Paused" value={s.agentsPaused} icon={Pause} variant={s.agentsPaused > 3 ? "warning" : "default"} />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Agents Waiting" value={s.agentsWaiting} icon={UserX} />
        <MetricCard title="Agents Dispo" value={s.agentsDispo} icon={PhoneOff} />
        <MetricCard title="Ringing" value={s.ringingCalls} icon={PhoneCall} />
        <MetricCard title="Agents Dead" value={s.agentsDead} icon={AlertTriangle} variant={s.agentsDead > 0 ? "destructive" : "default"} />
        <MetricCard title="Calls Today" value={latestSnapshot.data.meta.callsToday} icon={Activity} variant="success" />
      </div>

      {/* SLA + Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <SLAGauge sla={sla} />
        <div className="lg:col-span-3">
          <CallVolumeChart data={chartData} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AgentActivityChart data={chartData} />
        <HeatmapChart data={chartData} />
      </div>

      {/* Pie + Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AgentStatusPie snapshot={latestSnapshot} />
        <div className="lg:col-span-2">
          <WaitingCallsTable calls={latestSnapshot.data.details.waitingCalls} />
        </div>
      </div>

      {/* Agent Table */}
      <AgentTable agents={latestSnapshot.data.details.agents} />
    </div>
  );
};

export default Dashboard;
