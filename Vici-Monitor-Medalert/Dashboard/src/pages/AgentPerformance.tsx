
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ArrowUpDown, Phone, Users, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CYAN = "hsl(187, 80%, 48%)";
const TEAL = "hsl(170, 60%, 45%)";
const SLATE = "hsl(215, 12%, 50%)";

interface AgentSummary {
  id: string;
  name: string;
  calls: number;
  hours: string;
  avgCallTime: string;
  occupancy: string;
}

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

export default function AgentPerformancePage() {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof AgentSummary>("calls");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const fetchAgentPerformance = async () => {
      if (!shiftDate) return;
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:3001/api/agents/performance-summary/${shiftDate}`);
        const data = await response.json();
        if (data.success) {
          // Ensure all values are strings for consistent sorting/display
          const formattedData = data.data.map((agent: any) => ({
            ...agent,
            calls: Number(agent.calls || 0),
            hours: String(agent.hours || '0.00'),
            avgCallTime: String(agent.avgCallTime || '0.00'),
            occupancy: String(agent.occupancy || '0.00')
          }));
          setAgents(formattedData);
        } else {
          console.error('Failed to fetch agent performance:', data.error);
          setAgents([]);
        }
      } catch (error) {
        console.error('Error fetching agent performance:', error);
        setAgents([]);
      }
      setLoading(false);
    };

    fetchAgentPerformance();
  }, [shiftDate]);

  const filtered = useMemo(() => {
    let list = agents.filter(a =>
      a.name.toLowerCase().includes(search.toLowerCase())
    );
    list.sort((a, b) => {
      let av: any = a[sortKey];
      let bv: any = b[sortKey];
      if (!isNaN(Number(av)) && !isNaN(Number(bv))) {
          av = Number(av);
          bv = Number(bv);
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [agents, search, sortKey, sortDir]);

  const toggleSort = (key: keyof AgentSummary) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const topAgentsByCalls = useMemo(() =>
    [...agents].sort((a, b) => b.calls - a.calls).slice(0, 10),
    [agents]
  );

  const teamAvg = useMemo(() => {
    if (agents.length === 0) return { calls: 0, occupancy: 0 };
    const avg = (fn: (a: AgentSummary) => number) => agents.reduce((s, a) => s + fn(a), 0) / agents.length;
    return {
      calls: Math.round(avg(a => a.calls)),
      occupancy: parseFloat(avg(a => parseFloat(a.occupancy)).toFixed(2)),
    };
  }, [agents]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Agent Performance</h1>
             <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <input
                    type="date"
                    value={shiftDate}
                    onChange={(e) => setShiftDate(e.target.value)}
                    className="bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary px-2 py-1"
                />
            </div>
        </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground uppercase">Total Agents</span></div>
            <div className="font-mono text-2xl font-bold">{agents.length}</div>
        </div>
        <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2"><Phone className="w-4 h-4 text-success" /><span className="text-xs text-muted-foreground uppercase">Avg Calls / Agent</span></div>
            <div className="font-mono text-2xl font-bold">{teamAvg.calls}</div>
        </div>
        <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground uppercase">Team Occupancy</span></div>
            <div className="font-mono text-2xl font-bold">{teamAvg.occupancy}%</div>
        </div>
      </div>

      <div className="glass-panel p-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Top 10 Agents by Call Volume ({shiftDate})</h3>
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAgentsByCalls} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                <XAxis type="number" tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fill: SLATE, fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="calls" fill={CYAN} name="Total Calls" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">All Agents ({shiftDate})</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search agents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-1.5 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary w-56"/>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[{ key: "name", label: "Agent" }, { key: "calls", label: "Calls" }, { key: "hours", label: "Hours Worked" }, { key: "avgCallTime", label: "Avg Call Time (m)" }, { key: "occupancy", label: "Occupancy" }].map(col => (
                  <th key={col.key} className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort(col.key as keyof AgentSummary)}>
                    <span className="flex items-center gap-1">{col.label}{sortKey === col.key && <ArrowUpDown className="w-3 h-3" />}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
                {loading ? (<tr><td colSpan={5} className="text-center py-8">Loading data...</td></tr>) : filtered.length === 0 ? (<tr><td colSpan={5} className="text-center py-8">No data for this shift.</td></tr>) : filtered.map((agent, i) => (
                    <motion.tr key={agent.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }} className="border-b border-border/50 hover:bg-secondary/50">
                        <td className="py-2 px-4 font-medium">{agent.name}</td>
                        <td className="py-2 px-4 font-mono font-bold text-primary">{agent.calls}</td>
                        <td className="py-2 px-4 font-mono">{agent.hours}</td>
                        <td className="py-2 px-4 font-mono">{agent.avgCallTime}</td>
                        <td className="py-2 px-4">
                            <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${agent.occupancy}%`, backgroundColor: parseFloat(agent.occupancy) > 80 ? CYAN : TEAL }}/></div>
                                <span className="font-mono text-xs">{agent.occupancy}%</span>
                            </div>
                        </td>
                    </motion.tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
