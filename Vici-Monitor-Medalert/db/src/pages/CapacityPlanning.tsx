import { useMemo } from "react";
import { Gauge, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from "recharts";

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

export default function CapacityPlanning() {
  const hourlyForecast = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const h = 19 + i > 23 ? 19 + i - 24 : 19 + i;
      const expectedCalls = Math.floor(Math.random() * 30 + 25);
      const requiredAgents = Math.ceil(expectedCalls / 3.5);
      const availableAgents = Math.floor(Math.random() * 5 + 18);
      return {
        hour: `${String(h).padStart(2, "0")}:00`,
        expectedCalls,
        requiredAgents,
        availableAgents,
        surplus: availableAgents - requiredAgents,
      };
    }),
  []);

  const utilizationData = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
      agent: `Agent ${i + 1}`,
      utilization: Math.floor(Math.random() * 40 + 55),
    })).sort((a, b) => b.utilization - a.utilization),
  []);

  const avgSurplus = Math.round(hourlyForecast.reduce((s, h) => s + h.surplus, 0) / hourlyForecast.length);
  const understaffed = hourlyForecast.filter(h => h.surplus < 0).length;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-sm font-bold tracking-tight flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          Capacity Planning
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          Staffing forecasts and resource optimization
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Avg Agent Surplus", value: avgSurplus > 0 ? `+${avgSurplus}` : avgSurplus, color: avgSurplus >= 0 ? "text-success" : "text-destructive" },
          { label: "Understaffed Hours", value: understaffed, color: understaffed > 0 ? "text-warning" : "text-success" },
          { label: "Peak Hour Agents", value: Math.max(...hourlyForecast.map(h => h.requiredAgents)), color: "text-primary" },
          { label: "Avg Utilization", value: `${Math.round(utilizationData.reduce((s, a) => s + a.utilization, 0) / utilizationData.length)}%`, color: "text-primary" },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-4">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            <p className={`font-mono text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Staffing Forecast</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                <XAxis dataKey="hour" tick={{ fill: SLATE, fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <YAxis tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="requiredAgents" fill={AMBER} name="Required" radius={[3, 3, 0, 0]} />
                <Bar dataKey="availableAgents" fill={CYAN} name="Available" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Agent Utilization Ranking</h3>
          <div className="h-64 overflow-y-auto space-y-1">
            {utilizationData.slice(0, 15).map((agent, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <span className="text-xs text-muted-foreground w-16 truncate">{agent.agent}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${agent.utilization}%`,
                      backgroundColor: agent.utilization > 85 ? RED : agent.utilization > 70 ? CYAN : TEAL,
                    }}
                  />
                </div>
                <span className="font-mono text-xs w-10 text-right font-bold">{agent.utilization}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
