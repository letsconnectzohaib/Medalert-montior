import { useState, useEffect, useCallback, useMemo } from "react";
import { getRealTimeSummary, parseWaitTime } from "@/services/apiService";

// Define interfaces for real data - matching VicidialSnapshot
interface RealTimeData {
  timestamp: string;
  data: {
    timestamp: string;
    summary: {
      activeCalls: number;
      ringingCalls: number;
      waitingCalls: number;
      ivrCalls: number;
      agentsLoggedIn: number;
      agentsInCalls: number;
      agentsWaiting: number;
      agentsPaused: number;
      agentsDead: number;
      agentsDispo: number;
    };
    details: {
      waitingCalls: Array<{
        status: string;
        campaign: string;
        phone: string;
        server: string;
        wait: string;
        type: string;
        priority: string;
      }>;
      agents: Array<{
        station: string;
        user: string;
        session: string;
        status: string;
        time: string;
        campaign: string;
        calls: number;
      }>;
    };
    meta: {
      dialLevel: string;
      dialableLeads: number;
      callsToday: number;
      droppedAnswered: string;
      avgAgents: number;
      dialMethod: string;
    };
  };
}

interface ChartData {
  agents: Array<{
    name: string;
    status: string;
    station: string;
    campaign: string;
    calls: number;
  }>;
  calls: Array<{
    timestamp: string;
    agent: string;
    duration: number;
  }>;
  sla: {
    current: number;
    threshold: number;
    percentage: number;
  };
}

export function useAutoRefresh(timeWindow: number, intervalMs = 15000) {
  const [shiftData, setShiftData] = useState<RealTimeData[]>([]);
  const [latestSnapshot, setLatestSnapshot] = useState<RealTimeData | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await getRealTimeSummary();
      setShiftData([data]); // Wrap in array for compatibility
      setLatestSnapshot(data);
      setLastRefresh(new Date());
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to refresh data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial data load
    refresh();
    
    // Set up interval for periodic updates
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  const chartData = useMemo((): ChartData => {
      if (shiftData.length === 0) return { agents: [], calls: [], sla: { current: 0, threshold: 20, percentage: 0 } };
      
      // Transform real data for chart compatibility with error handling
      const summary = shiftData[0]?.data?.summary || {};
      const agents = shiftData[0]?.data?.details?.agents || [];
      const waitingCalls = shiftData[0]?.data?.details?.waitingCalls || [];
      
      try {
        return {
          agents: agents.map(agent => ({
            name: agent.user || 'Unknown',
            status: agent.status || 'Unknown',
            station: agent.station || 'Unknown',
            campaign: agent.campaign || 'Unknown',
            calls: agent.calls || 0
          })),
          calls: waitingCalls.map(call => ({
            timestamp: new Date().toISOString(),
            agent: call.phone || 'Unknown',
            duration: parseWaitTime(String(call.wait))
          })),
          sla: {
            current: (summary as any).agentsWaiting || 0,
            threshold: 20,
            percentage: Math.max(0, 100 - (((summary as any).agentsWaiting || 0) / 20) * 100)
          }
        };
      } catch (error) {
        console.error('Error transforming chart data:', error);
        return { agents: [], calls: [], sla: { current: 0, threshold: 20, percentage: 0 } };
      }
    },
    [shiftData, timeWindow]
  );

  return { shiftData, latestSnapshot, chartData, lastRefresh, refresh, isLoading, error };
}
