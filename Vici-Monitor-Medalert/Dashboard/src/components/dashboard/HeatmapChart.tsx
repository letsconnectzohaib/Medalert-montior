import { VicidialSnapshot } from "@/data/mockData";
import { format } from "date-fns";

interface HeatmapChartProps {
  data: VicidialSnapshot[];
}

export function HeatmapChart({ data }: HeatmapChartProps) {
  // Create a grid showing call volume intensity over time
  const buckets = data.slice(-24).map(s => ({
    time: format(new Date(s.timestamp), "HH:mm"),
    active: s.data.summary.activeCalls,
    waiting: s.data.summary.waitingCalls,
    agents: s.data.summary.agentsInCalls,
  }));

  const maxActive = Math.max(...buckets.map(b => b.active), 1);

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Activity Heatmap</h3>
      <div className="space-y-2">
        {/* Active Calls Row */}
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Calls</span>
          <div className="flex gap-1 mt-1">
            {buckets.map((b, i) => {
              const intensity = b.active / maxActive;
              return (
                <div
                  key={i}
                  className="flex-1 h-8 rounded-sm transition-all cursor-pointer group relative"
                  style={{
                    backgroundColor: `hsl(187, 80%, ${15 + intensity * 35}%)`,
                    opacity: 0.3 + intensity * 0.7,
                  }}
                  title={`${b.time}: ${b.active} calls`}
                >
                  <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-[10px] font-mono whitespace-nowrap z-10">
                    {b.time}: {b.active}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Waiting Calls Row */}
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Queue Depth</span>
          <div className="flex gap-1 mt-1">
            {buckets.map((b, i) => {
              const intensity = Math.min(b.waiting / 8, 1);
              return (
                <div
                  key={i}
                  className="flex-1 h-8 rounded-sm transition-all cursor-pointer group relative"
                  style={{
                    backgroundColor: intensity > 0.6
                      ? `hsl(0, 72%, ${25 + intensity * 25}%)`
                      : `hsl(38, 92%, ${15 + intensity * 35}%)`,
                    opacity: 0.3 + intensity * 0.7,
                  }}
                  title={`${b.time}: ${b.waiting} waiting`}
                >
                  <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-[10px] font-mono whitespace-nowrap z-10">
                    {b.time}: {b.waiting}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agents Row */}
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Agent Utilization</span>
          <div className="flex gap-1 mt-1">
            {buckets.map((b, i) => {
              const intensity = b.agents / 24;
              return (
                <div
                  key={i}
                  className="flex-1 h-8 rounded-sm transition-all cursor-pointer group relative"
                  style={{
                    backgroundColor: `hsl(142, 60%, ${15 + intensity * 30}%)`,
                    opacity: 0.3 + intensity * 0.7,
                  }}
                  title={`${b.time}: ${b.agents} agents`}
                >
                  <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-[10px] font-mono whitespace-nowrap z-10">
                    {b.time}: {b.agents}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-2">
        {buckets.length > 0 && (
          <>
            <span className="text-[9px] font-mono text-muted-foreground">{buckets[0]?.time}</span>
            <span className="text-[9px] font-mono text-muted-foreground">{buckets[buckets.length - 1]?.time}</span>
          </>
        )}
      </div>
    </div>
  );
}
