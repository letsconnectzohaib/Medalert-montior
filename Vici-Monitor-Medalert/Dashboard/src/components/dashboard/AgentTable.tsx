import { AgentRecord } from "@/data/mockData";
import { motion } from "framer-motion";

interface AgentTableProps {
  agents: AgentRecord[];
}

function getStatusColor(status: string): string {
  if (status.startsWith("INCALL")) return "text-primary";
  if (status === "READY") return "text-success";
  if (status.startsWith("PAUSED")) return "text-warning";
  if (status === "DISPO") return "text-muted-foreground";
  if (status === "DEAD") return "text-destructive";
  return "text-foreground";
}

function getStatusDot(status: string): string {
  if (status.startsWith("INCALL")) return "bg-primary";
  if (status === "READY") return "bg-success";
  if (status.startsWith("PAUSED")) return "bg-warning";
  if (status === "DISPO") return "bg-muted-foreground";
  if (status === "DEAD") return "bg-destructive";
  return "bg-foreground";
}

export function AgentTable({ agents }: AgentTableProps) {
  // Filter out the header row and LIVE queue rows
  const realAgents = agents.filter(a => a.station !== "STATUS" && !a.station.startsWith("LIVE"));

  return (
    <div className="glass-panel overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Agent Status</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent</th>
              <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Station</th>
              <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
              <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Campaign</th>
              <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Group</th>
            </tr>
          </thead>
          <tbody>
            {realAgents.map((agent, i) => (
              <motion.tr
                key={agent.station + i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="border-b border-border/50 hover:bg-secondary/50 transition-colors"
              >
                <td className="py-2 px-4 font-medium">{agent.user}</td>
                <td className="py-2 px-4 font-mono text-xs text-muted-foreground">{agent.station}</td>
                <td className="py-2 px-4">
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusDot(agent.status)} animate-pulse`} />
                    <span className={`font-mono text-xs font-semibold ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </span>
                  </span>
                </td>
                <td className="py-2 px-4 font-mono text-xs">{agent.time}</td>
                <td className="py-2 px-4 font-mono text-xs text-muted-foreground">{agent.campaign}</td>
                <td className="py-2 px-4 font-mono text-xs text-muted-foreground">{agent.group || "—"}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
