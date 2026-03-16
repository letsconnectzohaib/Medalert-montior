// Analytics Service
const API_BASE_URL = import.meta.env?.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface AnalyticsResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const analyticsService = {
  /**
   * Get agent performance analytics
   */
  async getAgentPerformance(timeRange: string = '24h'): Promise<AnalyticsResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/agents?timeRange=${timeRange}`, {
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
      console.error('Failed to fetch agent analytics:', error);
      throw error;
    }
  },

  /**
   * Get call analytics
   */
  async getCallAnalytics(campaign?: string, group?: string): Promise<AnalyticsResponse> {
    try {
      const params = new URLSearchParams();
      if (campaign) params.append('campaign', campaign);
      if (group) params.append('group', group);
      
      const response = await fetch(`${API_BASE_URL}/api/analytical?${params.toString()}`, {
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
      console.error('Failed to fetch analytics:', error);
      throw error;
    }
  },

  /**
   * Get trends data
   */
  async getTrends(campaign?: string, group?: string): Promise<AnalyticsResponse> {
    try {
      const params = new URLSearchParams();
      if (campaign) params.append('campaign', campaign);
      if (group) params.append('group', group);
      
      const response = await fetch(`${API_BASE_URL}/api/trends?${params.toString()}`, {
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
      console.error('Failed to fetch trends:', error);
      throw error;
    }
  },

  /**
   * Get filter options
   */
  async getFilters(): Promise<AnalyticsResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/filters`, {
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
      console.error('Failed to fetch filters:', error);
      throw error;
    }
  }
};
