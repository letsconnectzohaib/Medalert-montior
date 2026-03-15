import { useMemo } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { BarChart3, Phone, TrendingUp, Clock, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, ZAxis,
} from "recharts";
import { format } from "date-fns";

const CYAN = "hsl(187, 80%, 48%)";
const TEAL = "hsl(170, 60%, 45%)";
const AMBER = "hsl(38, 92%, 50%)";
const RED = "hsl(0, 72%, 50%)";
const PURPLE = "hsl(262, 60%, 55%)";
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

function rand(min: number, max: number) { return Math.floor(Math.random() * (min + max) / 2 + (max - min) * Math.random()); }

export default function CallAnalytics() {
  const { chartData, latestSnapshot } = useAutoRefresh(180);

  const callTypeData = useMemo(() => [
    { name: "Inbound", value: Math.floor(Math.random() * 200 + 200), color: CYAN },
    { name: "Outbound", value: Math.floor(Math.random() * 50 + 20), color: TEAL },
    { name: "Transfer", value: Math.floor(Math.random() * 30 + 10), color: AMBER },
    { name: "IVR", value: Math.floor(Math.random() * 15 + 5), color: PURPLE },
  ], []);

  const durationDist = useMemo(() =>
    ["0-1m", "1-3m", "3-5m", "5-10m", "10-15m", "15m+"].map(range => ({
      range,
      count: Math.floor(Math.random() * 60 + 10),
    })),
  []);

  const hourlyVolume = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const h = 19 + i > 23 ? 19 + i - 24 : 19 + i;
      return {
        hour: `${String(h).padStart(2, "0")}:00`,
        inbound: Math.floor(Math.random() * 40 + 15),
        outbound: Math.floor(Math.random() * 10 + 2),
        abandoned: Math.floor(Math.random() * 5),
      };
    }),
  []);

  const totalCalls = callTypeData.reduce((s, c) => s + c.value, 0);

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-sm font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Call Analytics
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          Comprehensive call volume and pattern analysis
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Calls", value: totalCalls, icon: Phone, color: "text-primary" },
          { label: "Inbound", value: callTypeData[0].value, icon: PhoneIncoming, color: "text-success" },
          { label: "Avg Duration", value: `${Math.floor(Math.random() * 3 + 3)}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`, icon: Clock, color: "text-warning" },
          { label: "Abandon Rate", value: `${Math.floor(Math.random() * 5 + 2)}%`, icon: TrendingUp, color: "text-destructive" },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className={`font-mono text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Call Type Distribution */}
        <div className="glass-panel p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Call Type Distribution</h3>
          <div className="h-48 flex items-center">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie data={callTypeData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" stroke="transparent">
                  {callTypeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {callTypeData.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="ml-auto font-mono font-bold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hourly Volume */}
        <div className="lg:col-span-2 glass-panel p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Hourly Call Volume</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyVolume}>
                <defs>
                  <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CYAN} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                <XAxis dataKey="hour" tick={{ fill: SLATE, fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <YAxis tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="inbound" stroke={CYAN} fill="url(#inboundGrad)" strokeWidth={2} name="Inbound" />
                <Area type="monotone" dataKey="outbound" stroke={TEAL} fill="transparent" strokeWidth={1.5} name="Outbound" />
                <Area type="monotone" dataKey="abandoned" stroke={RED} fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" name="Abandoned" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Call Duration Distribution */}
      <div className="glass-panel p-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Call Duration Distribution</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={durationDist}>
              <defs>
                <linearGradient id="durGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PURPLE} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
              <XAxis dataKey="range" tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
              <YAxis tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke={PURPLE} fill="url(#durGrad)" strokeWidth={2} name="Calls" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
