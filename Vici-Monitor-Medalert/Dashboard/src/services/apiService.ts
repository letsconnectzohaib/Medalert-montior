// API Service Layer - Real Backend Integration
// Replaces mockData.ts with actual API calls

const API_BASE_URL = import.meta.env?.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SummaryData {
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

// Real-time Summary API
export const getRealTimeSummary = async (campaign?: string, group?: string): Promise<SummaryData> => {
  try {
    const params = new URLSearchParams();
    if (campaign) params.append('campaign', campaign);
    if (group) params.append('group', group);
    
    const response = await fetch(`${API_BASE_URL}/api/summary?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch summary:', error);
    throw error;
  }
};

// Agent Performance API
export const getAgentPerformance = async (campaign?: string, group?: string): Promise<any> => {
  try {
    const params = new URLSearchParams();
    if (campaign) params.append('campaign', campaign);
    if (group) params.append('group', group);
    
    const response = await fetch(`${API_BASE_URL}/api/agents?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch agent performance:', error);
    throw error;
  }
};

// Analytics API
export const getAnalytics = async (campaign?: string, group?: string): Promise<any> => {
  try {
    const params = new URLSearchParams();
    if (campaign) params.append('campaign', campaign);
    if (group) params.append('group', group);
    
    const response = await fetch(`${API_BASE_URL}/api/analytical?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    throw error;
  }
};

// Trends API
export const getTrends = async (campaign?: string, group?: string): Promise<any> => {
  try {
    const params = new URLSearchParams();
    if (campaign) params.append('campaign', campaign);
    if (group) params.append('group', group);
    
    const response = await fetch(`${API_BASE_URL}/api/trends?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch trends:', error);
    throw error;
  }
};

// Filters API
export const getFilters = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/filters`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch filters:', error);
    throw error;
  }
};

// Helper function for API calls with error handling
export const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error);
    throw error;
  }
};
