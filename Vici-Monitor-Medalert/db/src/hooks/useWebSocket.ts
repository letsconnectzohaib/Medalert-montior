import { useState, useEffect, useCallback, useRef } from "react";

export type ConnectionStatus = "connected" | "disconnected" | "connecting" | "error";

interface WebSocketConfig {
  url: string;
  enabled: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(config: WebSocketConfig) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [messageCount, setMessageCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const connect = useCallback(() => {
    if (!config.enabled) return;
    setStatus("connecting");
    // Simulate WebSocket connection with mock data
    setTimeout(() => {
      setStatus("connected");
    }, 1200);
  }, [config.enabled]);

  const disconnect = useCallback(() => {
    setStatus("disconnected");
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (config.enabled) {
      connect();
      // Simulate incoming messages
      intervalRef.current = setInterval(() => {
        setMessageCount(c => c + 1);
        setLastMessage({ type: "snapshot", ts: new Date().toISOString() });
      }, 15000);
    } else {
      disconnect();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config.enabled, connect, disconnect]);

  return { status, lastMessage, messageCount, connect, disconnect };
}
