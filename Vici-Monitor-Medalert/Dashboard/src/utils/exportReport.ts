import jsPDF from "jspdf";
import "jspdf-autotable";
import { VicidialSnapshot } from "@/data/mockData";
import { AgentPerformance } from "@/data/agentPerformance";
import { format } from "date-fns";

// Extend jsPDF type for autotable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function exportCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => `"${row[h] ?? ""}"`).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportShiftReportPDF(
  snapshot: VicidialSnapshot,
  agents: AgentPerformance[]
) {
  const doc = new jsPDF();
  const now = format(new Date(), "yyyy-MM-dd HH:mm:ss");

  // Title
  doc.setFontSize(18);
  doc.setTextColor(30, 144, 180);
  doc.text("ViciDial Shift Report", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${now}`, 14, 28);
  doc.text("Shift: 18:45 — 06:00", 14, 34);

  // Summary section
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text("Shift Summary", 14, 46);

  const s = snapshot.data.summary;
  doc.autoTable({
    startY: 50,
    head: [["Metric", "Value"]],
    body: [
      ["Active Calls", s.activeCalls],
      ["Waiting Calls", s.waitingCalls],
      ["Agents Logged In", s.agentsLoggedIn],
      ["Agents In Calls", s.agentsInCalls],
      ["Agents Waiting", s.agentsWaiting],
      ["Agents Paused", s.agentsPaused],
      ["Agents Dead", s.agentsDead],
      ["Calls Today", snapshot.data.meta.callsToday],
    ],
    theme: "striped",
    headStyles: { fillColor: [30, 144, 180] },
    styles: { fontSize: 9 },
  });

  // Agent Performance
  doc.addPage();
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text("Agent Performance", 14, 20);

  doc.autoTable({
    startY: 26,
    head: [["Agent", "Calls", "AHT", "Talk Time", "Occupancy %", "Adherence %", "Status"]],
    body: agents.map(a => [
      a.user, a.totalCalls, a.avgHandleTime, a.totalTalkTime + "h",
      a.occupancy + "%", a.adherence + "%", a.currentStatus
    ]),
    theme: "striped",
    headStyles: { fillColor: [30, 144, 180] },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 40 } },
  });

  doc.save(`shift_report_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`);
}

export function exportAgentsCSV(agents: AgentPerformance[]) {
  exportCSV(agents.map(a => ({
    Agent: a.user,
    Station: a.station,
    Status: a.currentStatus,
    "Total Calls": a.totalCalls,
    "Inbound": a.inboundCalls,
    "Outbound": a.outboundCalls,
    "Avg Handle Time": a.avgHandleTime,
    "Avg Talk Time": a.avgTalkTime,
    "Occupancy %": a.occupancy,
    "Adherence %": a.adherence,
  })), "agent_performance");
}
