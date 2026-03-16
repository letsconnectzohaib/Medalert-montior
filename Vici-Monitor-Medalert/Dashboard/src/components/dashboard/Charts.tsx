import { VicidialSnapshot } from "@/data/mockData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";

interface ChartData {
  time: string;
  activeCalls: number;
  waitingCalls: number;
  agentsInCalls: number;
  agentsWaiting: number;
  agentsPaused: number;
  agentsLoggedIn: number;
}

function toChartData(snapshots: VicidialSnapshot[]): ChartData[] {
  return snapshots.map(s => {
    // Safely parse timestamp
    let timestamp = new Date().toISOString(); // fallback
    try {
      if (s.timestamp) {
        const parsedDate = new Date(s.timestamp);
        if (!isNaN(parsedDate.getTime())) {
          timestamp = s.timestamp;
        }
      }
    } catch (error) {
      console.warn('Invalid timestamp in chart data:', s.timestamp);
    }
    
    // Safely access nested data with fallbacks
    const summary = s?.data?.summary as any || {};
    
    return {
      time: format(new Date(timestamp), "HH:mm"),
      activeCalls: summary.activeCalls || 0,
      waitingCalls: summary.waitingCalls || 0,
      agentsInCalls: summary.agentsInCalls || 0,
      agentsWaiting: summary.agentsWaiting || 0,
      agentsPaused: summary.agentsPaused || 0,
      agentsLoggedIn: summary.agentsLoggedIn || 0,
    };
  });
}

const CYAN = "hsl(187, 80%, 48%)";
const TEAL = "hsl(170, 60%, 45%)";
const AMBER = "hsl(38, 92%, 50%)";
const RED = "hsl(0, 72%, 50%)";
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

export function CallVolumeChart({ data }: { data: VicidialSnapshot[] }) {
  const chartData = toChartData(data);
  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Call Volume</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CYAN} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="waitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={AMBER} stopOpacity={0.3} />
                <stop offset="95%" stopColor={AMBER} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
            <XAxis dataKey="time" tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
            <YAxis tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="activeCalls" stroke={CYAN} fill="url(#callGrad)" strokeWidth={2} name="Active" />
            <Area type="monotone" dataKey="waitingCalls" stroke={AMBER} fill="url(#waitGrad)" strokeWidth={2} name="Waiting" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AgentActivityChart({ data }: { data: VicidialSnapshot[] }) {
  const chartData = toChartData(data);
  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Agent Activity</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
            <XAxis dataKey="time" tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
            <YAxis tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="agentsInCalls" stackId="a" fill={CYAN} name="In Calls" radius={[0, 0, 0, 0]} />
            <Bar dataKey="agentsWaiting" stackId="a" fill={TEAL} name="Waiting" />
            <Bar dataKey="agentsPaused" stackId="a" fill={AMBER} name="Paused" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AgentStatusPie({ snapshot }: { snapshot: VicidialSnapshot | null }) {
  if (!snapshot) return null;
  const s = snapshot.data.summary;
  const data = [
    { name: "In Calls", value: s.agentsInCalls, color: CYAN },
    { name: "Waiting", value: s.agentsWaiting, color: TEAL },
    { name: "Paused", value: s.agentsPaused, color: AMBER },
    { name: "Dispo", value: s.agentsDispo, color: SLATE },
    { name: "Dead", value: s.agentsDead, color: RED },
  ].filter(d => d.value > 0);

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Agent Distribution</h3>
      <div className="h-64 flex items-center">
        <ResponsiveContainer width="50%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="transparent">
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="ml-auto font-mono font-bold">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
