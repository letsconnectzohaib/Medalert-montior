import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { generateShiftData, getAggregatedData, getLatestSnapshot } from "@/data/mockData";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { CallVolumeChart, AgentActivityChart, AgentStatusPie } from "@/components/dashboard/Charts";
import { AgentTable } from "@/components/dashboard/AgentTable";
import { WaitingCallsTable } from "@/components/dashboard/WaitingCallsTable";
import { TimeFilter } from "@/components/dashboard/TimeFilter";
import {
  PhoneCall, Users, Clock, PhoneOff, UserCheck, UserX,
  Pause, AlertTriangle, LogOut, Activity
} from "lucide-react";
import { format } from "date-fns";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [timeWindow, setTimeWindow] = useState(60);

  const shiftData = useMemo(() => generateShiftData(), []);
  const latestSnapshot = useMemo(() => getLatestSnapshot(), []);
  const chartData = useMemo(() => getAggregatedData(shiftData, timeWindow), [shiftData, timeWindow]);

  const s = latestSnapshot.data.summary;
  const shiftStart = "18:45";
  const shiftEnd = "06:00";
  const now = format(new Date(), "HH:mm:ss");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">ViciDial Operations</h1>
              <p className="text-xs text-muted-foreground font-mono">
                Shift {shiftStart} — {shiftEnd} • Live at {now}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <TimeFilter value={timeWindow} onChange={setTimeWindow} />
            <div className="flex items-center gap-3 border-l border-border pl-4">
              <span className="text-xs text-muted-foreground">{user?.username}</span>
              <button
                onClick={logout}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <MetricCard title="Active Calls" value={s.activeCalls} icon={PhoneCall} variant="primary" />
          <MetricCard title="Waiting Calls" value={s.waitingCalls} icon={Clock} variant={s.waitingCalls > 3 ? "warning" : "default"} />
          <MetricCard title="Agents Logged In" value={s.agentsLoggedIn} icon={Users} variant="success" />
          <MetricCard title="Agents In Calls" value={s.agentsInCalls} icon={UserCheck} variant="primary" />
          <MetricCard title="Agents Paused" value={s.agentsPaused} icon={Pause} variant={s.agentsPaused > 3 ? "warning" : "default"} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <MetricCard title="Agents Waiting" value={s.agentsWaiting} icon={UserX} />
          <MetricCard title="Agents Dispo" value={s.agentsDispo} icon={PhoneOff} />
          <MetricCard title="Ringing" value={s.ringingCalls} icon={PhoneCall} />
          <MetricCard title="Agents Dead" value={s.agentsDead} icon={AlertTriangle} variant={s.agentsDead > 0 ? "destructive" : "default"} />
          <MetricCard title="Calls Today" value={latestSnapshot.data.meta.callsToday} icon={Activity} variant="success" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CallVolumeChart data={chartData} />
          <AgentActivityChart data={chartData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <AgentStatusPie snapshot={latestSnapshot} />
          <div className="lg:col-span-2">
            <WaitingCallsTable calls={latestSnapshot.data.details.waitingCalls} />
          </div>
        </div>

        {/* Agent Table */}
        <AgentTable agents={latestSnapshot.data.details.agents} />
      </main>
    </div>
  );
};

export default Dashboard;
