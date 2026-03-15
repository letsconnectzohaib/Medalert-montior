import { useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Wifi, WifiOff, Circle, Server, Globe, Shield, RefreshCw, Zap } from "lucide-react";

export default function ConnectionPage() {
  const [wsUrl, setWsUrl] = useState("wss://vicidial.connectx.local/ws");
  const [apiUrl, setApiUrl] = useState("https://vicidial.connectx.local/api");
  const [wsEnabled, setWsEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(15);
  const ws = useWebSocket({ url: wsUrl, enabled: wsEnabled });

  const statusColor = {
    connected: "text-success",
    disconnected: "text-muted-foreground",
    connecting: "text-warning",
    error: "text-destructive",
  }[ws.status];

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-sm font-bold tracking-tight flex items-center gap-2">
          <Wifi className="w-4 h-4 text-primary" />
          Connection Manager
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          Configure WebSocket and API connections to ViciDial backend
        </p>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">WebSocket Status</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className={`w-3 h-3 fill-current ${statusColor} ${ws.status === "connected" ? "animate-pulse" : ""}`} />
            <span className={`font-mono text-sm font-bold ${statusColor}`}>{ws.status.toUpperCase()}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-mono">Messages: {ws.messageCount}</p>
        </div>

        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">API Status</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="w-3 h-3 fill-current text-success animate-pulse" />
            <span className="font-mono text-sm font-bold text-success">MOCK DATA</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-mono">Using local mock generator</p>
        </div>

        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Refresh Rate</span>
          </div>
          <span className="font-mono text-2xl font-bold text-primary">{refreshInterval}s</span>
          <p className="text-[10px] text-muted-foreground mt-2">Auto-refresh interval</p>
        </div>
      </div>

      {/* Configuration */}
      <div className="glass-panel p-6 space-y-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Connection Settings</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">WebSocket URL</label>
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">API Base URL</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Refresh Interval (seconds)</label>
            <div className="flex items-center gap-2">
              {[5, 10, 15, 30, 60].map(v => (
                <button
                  key={v}
                  onClick={() => setRefreshInterval(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    refreshInterval === v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {v}s
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <p className="text-sm font-medium">Enable WebSocket Connection</p>
              <p className="text-xs text-muted-foreground">Connect to ViciDial real-time data stream</p>
            </div>
            <button
              onClick={() => setWsEnabled(!wsEnabled)}
              className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
                wsEnabled
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-secondary text-muted-foreground border border-border"
              }`}
            >
              {wsEnabled ? "Connected" : "Connect"}
            </button>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="glass-panel p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Backend Integration Ready</p>
            <p className="text-xs text-muted-foreground mt-1">
              The dashboard is currently running on mock data. To connect to your ViciDial instance,
              configure the WebSocket and API URLs above. The system expects a JSON stream matching
              the ViciDial real-time stats format. All data transformations are handled automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
