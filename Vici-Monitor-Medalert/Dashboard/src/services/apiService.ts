// API Service Layer - Main Export
// Reexports all modular services for backward compatibility

import { authService } from './auth';
import { dashboardService, parseWaitTime } from './dashboard';
import { analyticsService } from './analytics';

// Re-export types for convenience
export type { 
  LoginCredentials, 
  User, 
  AuthResponse 
} from './auth';

export type { 
  SummaryData, 
  ApiResponse 
} from './dashboard';

export type { 
  AnalyticsResponse 
} from './analytics';

// Export services
export { authService };
export { dashboardService, parseWaitTime };
export { analyticsService };

// Legacy exports for backward compatibility
export const getRealTimeSummary = dashboardService.getRealTimeSummary;
export const getAgentPerformance = analyticsService.getAgentPerformance;
export const getAnalytics = analyticsService.getCallAnalytics;
export const getTrends = analyticsService.getTrends;
export const getFilters = analyticsService.getFilters;
