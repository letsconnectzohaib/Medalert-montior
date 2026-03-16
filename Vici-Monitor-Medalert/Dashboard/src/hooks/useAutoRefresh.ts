import { useState, useEffect, useCallback, useMemo } from "react";
import { getRealTimeSummary } from "@/services/apiService";

// Define interfaces for real data
interface RealTimeData {
  timestamp: string;
  data: {
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
        campaign: string;
        phone_number: string;
        wait_time: number;
      }>;
      agents: Array<{
        user_name: string;
        status: string;
        station: string;
        campaign: string;
        vicidial_state_color: string;
        calls_today: number;
      }>;
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
      
      // Transform real data for chart compatibility
      const summary = shiftData[0]?.data?.summary || {};
      const agents = shiftData[0]?.data?.details?.agents || [];
      const waitingCalls = shiftData[0]?.data?.details?.waitingCalls || [];
      
      return {
        agents: agents.map(agent => ({
          name: agent.user_name,
          status: agent.status,
          station: agent.station,
          campaign: agent.campaign,
          calls: agent.calls_today || 0
        })),
        calls: waitingCalls.map(call => ({
          timestamp: new Date().toISOString(),
          agent: call.phone_number,
          duration: call.wait_time
        })),
        sla: {
          current: (summary as any).agentsWaiting || 0,
          threshold: 20,
          percentage: Math.max(0, 100 - (((summary as any).agentsWaiting || 0) / 20) * 100)
        }
      };
    },
    [shiftData, timeWindow]
  );

  return { shiftData, latestSnapshot, chartData, lastRefresh, refresh, isLoading, error };
}
