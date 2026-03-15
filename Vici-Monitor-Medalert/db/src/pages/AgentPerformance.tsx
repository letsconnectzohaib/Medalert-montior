import { useState, useMemo } from "react";
import { generateAgentPerformance, AgentPerformance as AP } from "@/data/agentPerformance";
import { motion } from "framer-motion";
import { Search, ArrowUpDown, Phone, Clock, TrendingUp, Users } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, PolarRadiusAxis,
} from "recharts";

const CYAN = "hsl(187, 80%, 48%)";
const AMBER = "hsl(38, 92%, 50%)";
const TEAL = "hsl(170, 60%, 45%)";
const SLATE = "hsl(215, 12%, 50%)";

function getStatusColor(status: string): string {
  if (status.startsWith("INCALL")) return "text-primary";
  if (status === "READY") return "text-success";
  if (status.startsWith("PAUSED")) return "text-warning";
  if (status === "DISPO") return "text-muted-foreground";
  return "text-foreground";
}

function getStatusDot(status: string): string {
  if (status.startsWith("INCALL")) return "bg-primary";
  if (status === "READY") return "bg-success";
  if (status.startsWith("PAUSED")) return "bg-warning";
  if (status === "DISPO") return "bg-muted-foreground";
  return "bg-foreground";
}

type SortKey = "totalCalls" | "avgHandleTime" | "occupancy" | "adherence" | "user";

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
  const agents = useMemo(() => generateAgentPerformance(), []);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalCalls");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedAgent, setSelectedAgent] = useState<AP | null>(null);

  const filtered = useMemo(() => {
    let list = agents.filter(a =>
      a.user.toLowerCase().includes(search.toLowerCase())
    );
    list.sort((a, b) => {
      let av: any = a[sortKey];
      let bv: any = b[sortKey];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [agents, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  // Charts data
  const topAgents = useMemo(() =>
    [...agents].sort((a, b) => b.totalCalls - a.totalCalls).slice(0, 10),
    [agents]
  );

  const teamAvg = useMemo(() => {
    const avg = (fn: (a: AP) => number) => Math.round(agents.reduce((s, a) => s + fn(a), 0) / agents.length);
    return {
      totalCalls: avg(a => a.totalCalls),
      occupancy: avg(a => a.occupancy),
      adherence: avg(a => a.adherence),
    };
  }, [agents]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Agents</span>
          </div>
          <div className="font-mono text-2xl font-bold">{agents.length}</div>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg Calls</span>
          </div>
          <div className="font-mono text-2xl font-bold">{teamAvg.totalCalls}</div>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg Occupancy</span>
          </div>
          <div className="font-mono text-2xl font-bold">{teamAvg.occupancy}%</div>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg Adherence</span>
          </div>
          <div className="font-mono text-2xl font-bold">{teamAvg.adherence}%</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Top 10 — Call Volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAgents} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                <XAxis type="number" tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <YAxis dataKey="user" type="category" width={120} tick={{ fill: SLATE, fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="transparent" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalCalls" fill={CYAN} name="Total Calls" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {selectedAgent ? (
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{selectedAgent.user} — Profile</h3>
              <button onClick={() => setSelectedAgent(null)} className="text-xs text-muted-foreground hover:text-foreground">✕ Close</button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={[
                  { metric: "Calls", value: selectedAgent.totalCalls, max: 100 },
                  { metric: "Occupancy", value: selectedAgent.occupancy, max: 100 },
                  { metric: "Adherence", value: selectedAgent.adherence, max: 100 },
                  { metric: "Inbound %", value: Math.round(selectedAgent.inboundCalls / selectedAgent.totalCalls * 100), max: 100 },
                ]}>
                  <PolarGrid stroke="hsl(220, 14%, 18%)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: SLATE, fontSize: 11 }} />
                  <PolarRadiusAxis tick={false} domain={[0, 100]} />
                  <Radar dataKey="value" stroke={CYAN} fill={CYAN} fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Avg Handle Time</span><span className="font-mono font-bold">{selectedAgent.avgHandleTime}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Avg Talk Time</span><span className="font-mono font-bold">{selectedAgent.avgTalkTime}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Avg Hold Time</span><span className="font-mono font-bold">{selectedAgent.avgHoldTime}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Avg Wrap Time</span><span className="font-mono font-bold">{selectedAgent.avgWrapTime}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Longest Call</span><span className="font-mono font-bold">{selectedAgent.longestCall}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shortest Call</span><span className="font-mono font-bold">{selectedAgent.shortestCall}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Talk Time</span><span className="font-mono font-bold">{selectedAgent.totalTalkTime}h</span></div>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Occupancy vs Adherence</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAgents}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
                  <XAxis dataKey="user" tick={{ fill: SLATE, fontSize: 9, fontFamily: "JetBrains Mono" }} stroke="transparent" angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: SLATE, fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="transparent" domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="occupancy" fill={CYAN} name="Occupancy %" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="adherence" fill={TEAL} name="Adherence %" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Search + Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Agent Performance Details</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-56"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[
                  { key: "user" as SortKey, label: "Agent" },
                  { key: "totalCalls" as SortKey, label: "Total Calls" },
                  { key: "totalCalls" as SortKey, label: "In / Out" },
                  { key: "avgHandleTime" as SortKey, label: "AHT" },
                  { key: "avgHandleTime" as SortKey, label: "Talk / Hold / Wrap" },
                  { key: "occupancy" as SortKey, label: "Occupancy" },
                  { key: "adherence" as SortKey, label: "Adherence" },
                ].map((col, ci) => (
                  <th
                    key={ci}
                    className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && <ArrowUpDown className="w-3 h-3" />}
                    </span>
                  </th>
                ))}
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((agent, i) => (
                <motion.tr
                  key={agent.station}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.015 }}
                  className="border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedAgent(agent)}
                >
                  <td className="py-2 px-4">
                    <div className="font-medium">{agent.user}</div>
                    <div className="text-xs text-muted-foreground font-mono">{agent.station}</div>
                  </td>
                  <td className="py-2 px-4 font-mono font-bold text-primary">{agent.totalCalls}</td>
                  <td className="py-2 px-4 font-mono text-xs">
                    <span className="text-success">{agent.inboundCalls}</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="text-warning">{agent.outboundCalls}</span>
                  </td>
                  <td className="py-2 px-4 font-mono text-xs font-bold">{agent.avgHandleTime}</td>
                  <td className="py-2 px-4 font-mono text-xs">
                    {agent.avgTalkTime} / {agent.avgHoldTime} / {agent.avgWrapTime}
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${agent.occupancy}%`,
                            backgroundColor: agent.occupancy > 80 ? CYAN : agent.occupancy > 60 ? TEAL : AMBER
                          }}
                        />
                      </div>
                      <span className="font-mono text-xs">{agent.occupancy}%</span>
                    </div>
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${agent.adherence}%`,
                            backgroundColor: agent.adherence > 85 ? TEAL : agent.adherence > 70 ? AMBER : "hsl(0, 72%, 50%)"
                          }}
                        />
                      </div>
                      <span className="font-mono text-xs">{agent.adherence}%</span>
                    </div>
                  </td>
                  <td className="py-2 px-4">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getStatusDot(agent.currentStatus)} animate-pulse`} />
                      <span className={`font-mono text-xs font-semibold ${getStatusColor(agent.currentStatus)}`}>
                        {agent.currentStatus}
                      </span>
                    </span>
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
