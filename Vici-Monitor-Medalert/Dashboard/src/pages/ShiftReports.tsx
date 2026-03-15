import { useMemo } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { generateAgentPerformance } from "@/data/agentPerformance";
import { exportShiftReportPDF, exportAgentsCSV, exportCSV } from "@/utils/exportReport";
import { FileText, Download, FileSpreadsheet, Printer } from "lucide-react";
import { format } from "date-fns";

export default function ShiftReports() {
  const { latestSnapshot } = useAutoRefresh(720);
  const agents = useMemo(() => generateAgentPerformance(), []);
  const s = latestSnapshot.data.summary;

  const reportSections = [
    { label: "Agents Logged In", value: s.agentsLoggedIn },
    { label: "Active Calls", value: s.activeCalls },
    { label: "Waiting Calls", value: s.waitingCalls },
    { label: "Agents In Calls", value: s.agentsInCalls },
    { label: "Agents Paused", value: s.agentsPaused },
    { label: "Agents Dead", value: s.agentsDead },
    { label: "Calls Today", value: latestSnapshot.data.meta.callsToday },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-sm font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Shift Reports
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            Generate and export end-of-shift summaries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportShiftReportPDF(latestSnapshot, agents)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:opacity-90 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export PDF
          </button>
          <button
            onClick={() => exportAgentsCSV(agents)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-md text-xs font-medium hover:bg-secondary/80 transition-colors border border-border"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Report Preview */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold">Shift Summary Report</h2>
            <p className="text-xs text-muted-foreground font-mono">
              Generated: {format(new Date(), "yyyy-MM-dd HH:mm:ss")} • Shift: 18:45 — 06:00
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-muted-foreground rounded-md text-xs hover:text-foreground transition-colors"
          >
            <Printer className="w-3 h-3" />
            Print
          </button>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {reportSections.map((item, i) => (
            <div key={i} className="bg-secondary/50 rounded-lg p-3">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</span>
              <p className="font-mono text-xl font-bold mt-1">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Agent Summary Table */}
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Agent Performance Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Agent</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Calls</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">AHT</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Talk Time</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Occupancy</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Adherence</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-secondary/30">
                  <td className="py-2 px-3 font-medium text-xs">{agent.user}</td>
                  <td className="py-2 px-3 font-mono text-xs text-primary font-bold">{agent.totalCalls}</td>
                  <td className="py-2 px-3 font-mono text-xs">{agent.avgHandleTime}</td>
                  <td className="py-2 px-3 font-mono text-xs">{agent.totalTalkTime}h</td>
                  <td className="py-2 px-3 font-mono text-xs">{agent.occupancy}%</td>
                  <td className="py-2 px-3 font-mono text-xs">{agent.adherence}%</td>
                  <td className="py-2 px-3">
                    <span className={`font-mono text-[10px] font-semibold ${
                      agent.currentStatus.startsWith("INCALL") ? "text-primary" :
                      agent.currentStatus === "READY" ? "text-success" :
                      agent.currentStatus.startsWith("PAUSED") ? "text-warning" :
                      "text-muted-foreground"
                    }`}>
                      {agent.currentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
