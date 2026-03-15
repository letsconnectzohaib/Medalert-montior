import { useMemo } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { Clock, Sun, Moon, Sunrise } from "lucide-react";
import { format } from "date-fns";

export default function ShiftTimeline() {
  const { chartData } = useAutoRefresh(720);

  const timelineEvents = useMemo(() => {
    const events = [
      { time: "18:45", label: "Shift Start", type: "milestone" as const, icon: Moon },
      { time: "19:00", label: "Peak Hour Begins", type: "info" as const, icon: Clock },
      { time: "20:30", label: "Break Rotation 1", type: "break" as const, icon: Clock },
      { time: "22:00", label: "Mid-Shift Review", type: "milestone" as const, icon: Clock },
      { time: "23:30", label: "Break Rotation 2", type: "break" as const, icon: Clock },
      { time: "00:00", label: "Date Change", type: "info" as const, icon: Sunrise },
      { time: "01:00", label: "Low Volume Period", type: "info" as const, icon: Clock },
      { time: "03:00", label: "Break Rotation 3", type: "break" as const, icon: Clock },
      { time: "05:00", label: "Pre-Shift Wrap", type: "milestone" as const, icon: Sun },
      { time: "06:00", label: "Shift End", type: "milestone" as const, icon: Sun },
    ];
    return events;
  }, []);

  const currentTimeStr = format(new Date(), "HH:mm");

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-sm font-bold tracking-tight flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Shift Timeline
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          Current shift: 18:45 — 06:00 • Now: {currentTimeStr}
        </p>
      </div>

      {/* Progress bar */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Shift Progress</span>
          <span className="text-xs font-mono text-primary font-bold">
            {(() => {
              const now = new Date();
              const h = now.getHours();
              const m = now.getMinutes();
              const totalMin = h >= 18 ? (h - 18) * 60 + (m - 45) : (h + 6) * 60 + m + 15;
              const pct = Math.min(100, Math.max(0, Math.round(totalMin / 675 * 100)));
              return `${pct}%`;
            })()}
          </span>
        </div>
        <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{
              width: (() => {
                const now = new Date();
                const h = now.getHours();
                const m = now.getMinutes();
                const totalMin = h >= 18 ? (h - 18) * 60 + (m - 45) : (h + 6) * 60 + m + 15;
                return `${Math.min(100, Math.max(0, Math.round(totalMin / 675 * 100)))}%`;
              })(),
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] font-mono text-muted-foreground">18:45</span>
          <span className="text-[10px] font-mono text-muted-foreground">06:00</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-panel p-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Shift Schedule</h3>
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-6">
            {timelineEvents.map((event, i) => {
              const Icon = event.icon;
              const isPast = (() => {
                const [eh, em] = event.time.split(":").map(Number);
                const now = new Date();
                const nh = now.getHours();
                const nm = now.getMinutes();
                if (eh >= 18) return nh >= 18 ? (nh > eh || (nh === eh && nm >= em)) : true;
                return nh < 6 ? (nh > eh || (nh === eh && nm >= em)) : false;
              })();

              return (
                <div key={i} className="flex items-start gap-4 relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    event.type === "milestone" ? "bg-primary/10 border-2 border-primary/30" :
                    event.type === "break" ? "bg-warning/10 border-2 border-warning/30" :
                    "bg-secondary border-2 border-border"
                  } ${isPast ? "opacity-50" : ""}`}>
                    <Icon className={`w-4 h-4 ${
                      event.type === "milestone" ? "text-primary" :
                      event.type === "break" ? "text-warning" :
                      "text-muted-foreground"
                    }`} />
                  </div>
                  <div className={`pt-3 ${isPast ? "opacity-50" : ""}`}>
                    <p className="font-mono text-xs text-muted-foreground">{event.time}</p>
                    <p className="text-sm font-medium">{event.label}</p>
                  </div>
                  {!isPast && i === timelineEvents.findIndex(e => {
                    const [eh, em] = e.time.split(":").map(Number);
                    const now = new Date();
                    const nh = now.getHours();
                    if (eh >= 18) return nh < 18 || nh < eh;
                    return nh >= 6 || nh < eh;
                  }) && (
                    <span className="ml-2 mt-3 px-2 py-0.5 text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 rounded-full">
                      Next
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
