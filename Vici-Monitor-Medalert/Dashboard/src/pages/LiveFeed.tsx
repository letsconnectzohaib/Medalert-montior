import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useWebSocket, ConnectionStatus } from "@/hooks/useWebSocket";
import { Radio, Wifi, WifiOff, Circle, Phone, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface FeedEvent {
  id: string;
  time: string;
  type: "call_start" | "call_end" | "agent_login" | "agent_pause" | "queue_alert" | "agent_ready";
  message: string;
  agent?: string;
}

function generateEvent(): FeedEvent {
  const types: FeedEvent["type"][] = ["call_start", "call_end", "agent_login", "agent_pause", "queue_alert", "agent_ready"];
  const agents = ["Maaz Haider", "Eman-e-Fatima", "Muhammad Anas", "Safiullah", "Talha Farooq", "Ahmar Ali", "Hamid Butt"];
  const type = types[Math.floor(Math.random() * types.length)];
  const agent = agents[Math.floor(Math.random() * agents.length)];

  const messages: Record<FeedEvent["type"], string> = {
    call_start: `${agent} started inbound call from ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
    call_end: `${agent} completed call — duration ${Math.floor(Math.random() * 15 + 1)}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
    agent_login: `${agent} logged into campaign 002`,
    agent_pause: `${agent} entered pause state — CalBck`,
    queue_alert: `Queue depth reached ${Math.floor(Math.random() * 5 + 5)} calls`,
    agent_ready: `${agent} returned to READY state`,
  };

  return {
    id: Math.random().toString(36).slice(2),
    time: format(new Date(), "HH:mm:ss"),
    type,
    message: messages[type],
    agent,
  };
}

const typeIcons: Record<FeedEvent["type"], typeof Phone> = {
  call_start: Phone,
  call_end: Phone,
  agent_login: User,
  agent_pause: Clock,
  queue_alert: Radio,
  agent_ready: User,
};

const typeColors: Record<FeedEvent["type"], string> = {
  call_start: "text-primary",
  call_end: "text-muted-foreground",
  agent_login: "text-success",
  agent_pause: "text-warning",
  queue_alert: "text-destructive",
  agent_ready: "text-success",
};

const statusColors: Record<ConnectionStatus, string> = {
  connected: "text-success",
  disconnected: "text-muted-foreground",
  connecting: "text-warning",
  error: "text-destructive",
};

export default function LiveFeed() {
  const { soundEnabled } = useOutletContext<{ soundEnabled: boolean }>();
  const [wsEnabled, setWsEnabled] = useState(true);
  const ws = useWebSocket({ url: "wss://vicidial.connectx.local/ws", enabled: wsEnabled });
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setEvents(prev => [generateEvent(), ...prev].slice(0, 100));
    }, 2000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [paused]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-sm font-bold tracking-tight flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            Live Event Feed
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            Real-time operational events • {events.length} events captured
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 glass-panel px-3 py-1.5">
            <Circle className={`w-2 h-2 fill-current ${statusColors[ws.status]} ${ws.status === "connected" ? "animate-pulse" : ""}`} />
            <span className="text-xs font-mono">{ws.status}</span>
          </div>
          <button
            onClick={() => setWsEnabled(!wsEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              wsEnabled ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary text-muted-foreground"
            }`}
          >
            {wsEnabled ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {wsEnabled ? "Live" : "Offline"}
          </button>
          <button
            onClick={() => setPaused(!paused)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              paused ? "bg-warning/10 text-warning border border-warning/20" : "bg-secondary text-muted-foreground"
            }`}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Messages", value: ws.messageCount, color: "text-primary" },
          { label: "Events/min", value: Math.round(events.length / Math.max(1, ws.messageCount) * 4), color: "text-success" },
          { label: "Alerts", value: events.filter(e => e.type === "queue_alert").length, color: "text-warning" },
          { label: "Uptime", value: ws.status === "connected" ? "Active" : "—", color: statusColors[ws.status] },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-3">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            <p className={`font-mono text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Event Stream */}
      <div className="glass-panel overflow-hidden" ref={containerRef}>
        <div className="p-3 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event Stream</span>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {events.map((event) => {
              const Icon = typeIcons[event.type];
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 hover:bg-secondary/30 transition-colors"
                >
                  <span className="font-mono text-[10px] text-muted-foreground w-16 shrink-0">{event.time}</span>
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${typeColors[event.type]}`} />
                  <span className="text-xs flex-1">{event.message}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    event.type === "queue_alert" ? "bg-destructive/10 text-destructive border-destructive/20" :
                    event.type === "call_start" ? "bg-primary/10 text-primary border-primary/20" :
                    "bg-secondary text-muted-foreground border-border"
                  }`}>
                    {event.type.replace("_", " ")}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {events.length === 0 && (
            <div className="p-12 text-center text-muted-foreground text-sm">
              <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Waiting for events...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
