import { useMemo } from "react";
import { TrendingUp, TrendingDown, ArrowRight, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

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

export default function Trends() {
  const weeklyData = useMemo(() =>
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => ({
      day,
      calls: Math.floor(Math.random() * 200 + 250),
      sla: Math.floor(Math.random() * 15 + 78),
      aht: Math.floor(Math.random() * 120 + 240),
      abandoned: Math.floor(Math.random() * 15 + 5),
    })),
  []);

  const shiftComparison = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => ({
      shift: `Shift ${i + 1}`,
      avgCalls: Math.floor(Math.random() * 100 + 300),
      peakWaiting: Math.floor(Math.random() * 8 + 2),
      avgAgents: Math.floor(Math.random() * 6 + 18),
    })),
  []);

  const trendCards = [
    { label: "Calls vs Last Week", value: "+12%", trend: "up" as const, detail: "432 → 484" },
    { label: "SLA vs Last Week", value: "-3%", trend: "down" as const, detail: "87% → 84%" },
    { label: "AHT Trend", value: "-8s", trend: "up" as const, detail: "4:23 → 4:15" },
    { label: "Abandon Rate", value: "+0.5%", trend: "down" as const, detail: "3.2% → 3.7%" },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-sm font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Performance Trends
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          Historical analysis and week-over-week comparisons
        </p>
      </div>

      {/* Trend Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {trendCards.map((card, i) => (
          <div key={i} className="glass-panel p-4">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{card.label}</span>
            <div className="flex items-center gap-2 mt-2">
              {card.trend === "up" ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              <span className={`font-mono text-xl font-bold ${card.trend === "up" ? "text-success" : "text-destructive"}`}>
                {card.value}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">{card.detail}</span>
          </div>
        ))}
      </div>

      {/* Weekly Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Weekly Call Volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                <XAxis dataKey="day" tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <YAxis tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="calls" fill={CYAN} name="Total Calls" radius={[3, 3, 0, 0]} />
                <Bar dataKey="abandoned" fill={RED} name="Abandoned" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Weekly SLA Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                <XAxis dataKey="day" tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <YAxis domain={[60, 100]} tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="sla" stroke={TEAL} strokeWidth={2.5} dot={{ fill: TEAL, r: 4 }} name="SLA %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Shift Comparison Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Shift Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase">Shift</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase">Avg Calls</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase">Peak Queue</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase">Avg Agents</th>
              </tr>
            </thead>
            <tbody>
              {shiftComparison.map((row, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-secondary/30">
                  <td className="py-2 px-4 font-mono text-xs font-medium">{row.shift}</td>
                  <td className="py-2 px-4 font-mono text-xs text-primary font-bold">{row.avgCalls}</td>
                  <td className="py-2 px-4">
                    <span className={`font-mono text-xs font-bold ${row.peakWaiting >= 5 ? "text-warning" : "text-foreground"}`}>
                      {row.peakWaiting}
                    </span>
                  </td>
                  <td className="py-2 px-4 font-mono text-xs">{row.avgAgents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
