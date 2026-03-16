// Dashboard Data Service
const API_BASE_URL = import.meta.env?.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper function to safely parse wait time from dialtime format (e.g., "0:30", "1:15")
export function parseWaitTime(dialtime: string | null | undefined): number {
  if (!dialtime) return 0;
  
  try {
    // Handle formats like "0:30", "1:15", "2:45"
    const parts = dialtime.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return (minutes * 60) + seconds;
    }
    
    // Handle pure numbers
    const parsed = parseInt(dialtime);
    return isNaN(parsed) ? 0 : parsed;
  } catch (error) {
    console.warn('Failed to parse dialtime:', dialtime, error);
    return 0;
  }
}

export interface SummaryData {
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const dashboardService = {
  /**
   * Get real-time summary data
   */
  async getRealTimeSummary(): Promise<SummaryData> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      // Transform database data to match expected interface
      const data = result.data;
      
      // Transform to VicidialSnapshot structure
      const vicidialSnapshot = {
        timestamp: data.timestamp || new Date().toISOString(),
        data: {
          timestamp: data.timestamp || new Date().toISOString(),
          summary: {
            activeCalls: data.summary?.activeCalls || 0,
            ringingCalls: data.summary?.ringingCalls || 0,
            waitingCalls: data.summary?.callsWaiting || 0,
            ivrCalls: data.summary?.ivrCalls || 0,
            agentsLoggedIn: data.summary?.agentsLoggedIn || 0,
            agentsInCalls: data.summary?.agentsInCalls || 0,
            agentsWaiting: data.summary?.agentsWaiting || 0,
            agentsPaused: data.summary?.agentsPaused || 0,
            agentsDead: data.summary?.agentsDead || 0,
            agentsDispo: data.summary?.agentsDispo || 0,
          },
          details: {
            waitingCalls: (data.details?.waitingCalls || []).map(call => ({
              status: call.status || '',
              campaign: call.campaign || '',
              phone: call.phone || '',
              server: call.server || '',
              wait: parseWaitTime(call.dialtime).toString(),
              type: call.callType || '',
              priority: call.priority?.toString() || '0'
            })),
            agents: (data.details?.agents || []).map(agent => ({
              station: agent.station || '',
              user: agent.user || '',
              session: agent.session || '',
              status: agent.status || '',
              time: agent.time || '',
              campaign: agent.campaign || '',
              calls: agent.calls || 0
            }))
          },
          meta: {
            dialLevel: data.meta?.dialLevel || '0',
            dialableLeads: data.meta?.dialableLeads || 0,
            callsToday: data.meta?.callsToday || 0,
            droppedAnswered: data.meta?.droppedAnswered?.toString() || '0',
            avgAgents: data.summary?.agentsLoggedIn || 0,
            dialMethod: 'predictive'
          }
        }
      };
      
      return vicidialSnapshot;
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      throw error;
    }
  },

  /**
   * Get current agents
   */
  async getCurrentAgents(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/agents/current`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch agent data');
      }

      return {
        success: true,
        data: result.data.map((agent: any) => ({
          user_name: agent.user,
          status: agent.status,
          station: agent.station,
          campaign: agent.campaign,
          vicidial_state_color: agent.state_color,
          calls_today: agent.calls
        }))
      };
    } catch (error) {
      console.error('Failed to fetch agent performance:', error);
      throw error;
    }
  },

  /**
   * Get waiting calls
   */
  async getWaitingCalls(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/waiting-calls`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to fetch waiting calls:', error);
      throw error;
    }
  },

  /**
   * Get SLA metrics
   */
  async getSlaMetrics(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sla-metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to fetch SLA metrics:', error);
      throw error;
    }
  },

  /**
   * Get call volume analytics
   */
  async getCallVolumeAnalytics(timeRange: string = '24h'): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/call-volume?timeRange=${timeRange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to fetch call volume analytics:', error);
      throw error;
    }
  }
};
