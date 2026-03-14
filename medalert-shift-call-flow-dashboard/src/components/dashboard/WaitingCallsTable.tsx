import { WaitingCall } from "@/data/mockData";
import { motion } from "framer-motion";
import { Phone } from "lucide-react";

interface WaitingCallsTableProps {
  calls: WaitingCall[];
}

export function WaitingCallsTable({ calls }: WaitingCallsTableProps) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Waiting Queue</h3>
        {calls.length > 0 && (
          <span className="px-2 py-0.5 text-xs font-mono font-bold bg-warning/10 text-warning border border-warning/20 rounded-full">
            {calls.length} waiting
          </span>
        )}
      </div>
      {calls.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          <Phone className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No calls in queue
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Campaign</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Wait Time</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call, i) => (
                <motion.tr
                  key={call.phone + i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-border/50 hover:bg-secondary/50 transition-colors"
                >
                  <td className="py-2 px-4 font-mono text-xs">{call.phone}</td>
                  <td className="py-2 px-4 text-xs text-muted-foreground">{call.campaign}</td>
                  <td className="py-2 px-4 font-mono text-xs text-warning font-bold">{call.wait}</td>
                  <td className="py-2 px-4 font-mono text-xs">{call.priority}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
