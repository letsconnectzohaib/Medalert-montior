import { SLAMetrics } from "@/hooks/useSLATracker";
import { Target, TrendingUp, TrendingDown, Clock, PhoneOff } from "lucide-react";

interface SLAGaugeProps {
  sla: SLAMetrics;
}

export function SLAGauge({ sla }: SLAGaugeProps) {
  const circumference = 2 * Math.PI * 58;
  const filled = (sla.percentage / 100) * circumference;
  const color = sla.percentage >= 80 ? "text-success" : sla.percentage >= 60 ? "text-warning" : "text-destructive";
  const strokeColor = sla.percentage >= 80 ? "hsl(142, 60%, 45%)" : sla.percentage >= 60 ? "hsl(38, 92%, 50%)" : "hsl(0, 72%, 50%)";

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">SLA Performance</h3>
      </div>

      <div className="flex items-center justify-center py-2">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="58" fill="none" stroke="hsl(220, 14%, 18%)" strokeWidth="8" />
            <circle
              cx="64" cy="64" r="58" fill="none"
              stroke={strokeColor} strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - filled}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-mono text-2xl font-bold ${color}`}>{sla.percentage}%</span>
            <span className="text-[10px] text-muted-foreground">≤{sla.targetSeconds}s</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Avg Wait</span>
          <span className="ml-auto font-mono font-bold">{sla.avgWaitTime}s</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Max Wait</span>
          <span className="ml-auto font-mono font-bold">{sla.maxWaitTime}s</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-success" />
          <span className="text-muted-foreground">Answered</span>
          <span className="ml-auto font-mono font-bold">{sla.answeredWithinTarget}/{sla.totalAnswered}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <PhoneOff className="w-3 h-3 text-destructive" />
          <span className="text-muted-foreground">Abandoned</span>
          <span className="ml-auto font-mono font-bold text-destructive">{sla.abandoned} ({sla.abandonRate}%)</span>
        </div>
      </div>
    </div>
  );
}
