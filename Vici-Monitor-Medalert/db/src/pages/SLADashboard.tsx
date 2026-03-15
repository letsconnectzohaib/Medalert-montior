import { useState } from "react";
import { useSLATracker } from "@/hooks/useSLATracker";
import { SLAGauge } from "@/components/dashboard/SLAGauge";
import { Target, TrendingUp, Clock, PhoneOff, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from "recharts";

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
          <span className="font-bold">{entry.value}%</span>
        </p>
      ))}
    </div>
  );
};

export default function SLADashboard() {
  const [target, setTarget] = useState(20);
  const sla = useSLATracker(target);

  const trendData = sla.trend.map((v, i) => ({
    period: `${(i + 1) * 5}m`,
    sla: v,
  }));

  // Mock hourly breakdown
  const hourlyData = Array.from({ length: 8 }, (_, i) => ({
    hour: `${19 + i > 23 ? (19 + i - 24) : 19 + i}:00`,
    sla: Math.floor(Math.random() * 25 + 72),
    calls: Math.floor(Math.random() * 40 + 20),
    abandoned: Math.floor(Math.random() * 5),
  }));

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-sm font-bold tracking-tight flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            SLA Performance Tracker
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            Service Level Agreement monitoring and analytics
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Target:</span>
          {[10, 15, 20, 30].map(t => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                target === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              ≤{t}s
            </button>
          ))}
        </div>
      </div>

      {/* Main SLA Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SLAGauge sla={sla} />

        <div className="lg:col-span-2 glass-panel p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">SLA Trend (5-min intervals)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                <XAxis dataKey="period" tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <YAxis domain={[50, 100]} tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={80} stroke={AMBER} strokeDasharray="5 5" label={{ value: "Target 80%", fill: AMBER, fontSize: 10 }} />
                <Line type="monotone" dataKey="sla" stroke={CYAN} strokeWidth={2.5} dot={{ fill: CYAN, r: 3 }} name="SLA %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hourly Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Hourly SLA Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                <XAxis dataKey="hour" tick={{ fill: SLATE, fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <YAxis domain={[0, 100]} tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={80} stroke={AMBER} strokeDasharray="5 5" />
                <Bar dataKey="sla" name="SLA %" radius={[3, 3, 0, 0]}>
                  {hourlyData.map((entry, i) => (
                    <rect key={i} fill={entry.sla >= 80 ? TEAL : entry.sla >= 60 ? AMBER : RED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Hourly Call Volume</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Hour</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">SLA %</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Calls</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Abandoned</th>
                </tr>
              </thead>
              <tbody>
                {hourlyData.map((row, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-secondary/30">
                    <td className="py-2 px-3 font-mono text-xs">{row.hour}</td>
                    <td className="py-2 px-3">
                      <span className={`font-mono text-xs font-bold ${row.sla >= 80 ? "text-success" : row.sla >= 60 ? "text-warning" : "text-destructive"}`}>
                        {row.sla}%
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-xs">{row.calls}</td>
                    <td className="py-2 px-3 font-mono text-xs text-destructive">{row.abandoned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
