import { useState, useEffect } from 'react';
import { Activity, Zap, TrendingUp, Clock } from 'lucide-react';

interface RealTimeMetric {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdate: Date;
}

export function RealTimeMetrics() {
  const [metrics, setMetrics] = useState<RealTimeMetric[]>([
    { label: 'Active Calls', value: 0, change: 0, trend: 'stable', lastUpdate: new Date() },
    { label: 'Waiting Calls', value: 0, change: 0, trend: 'stable', lastUpdate: new Date() },
    { label: 'Data Rate', value: 0, change: 0, trend: 'stable', lastUpdate: new Date() },
    { label: 'Response Time', value: 0, change: 0, trend: 'stable', lastUpdate: new Date() }
  ]);

  const [pulseIndex, setPulseIndex] = useState(-1);

  useEffect(() => {
    const updateMetrics = async () => {
      try {
        const startTime = performance.now();
        
        // Fetch real-time data
        const response = await fetch('http://localhost:3001/api/dashboard/summary');
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.data?.summary) {
            const summary = data.data.summary;
            
            setMetrics(prev => prev.map((metric, index) => {
              let newValue = metric.value;
              let newTrend: 'up' | 'down' | 'stable' = 'stable';
              
              switch (metric.label) {
                case 'Active Calls':
                  newValue = summary.activeCalls || 0;
                  newTrend = newValue > metric.value ? 'up' : newValue < metric.value ? 'down' : 'stable';
                  break;
                case 'Waiting Calls':
                  newValue = summary.callsWaiting || 0;
                  newTrend = newValue > metric.value ? 'up' : newValue < metric.value ? 'down' : 'stable';
                  break;
                case 'Data Rate':
                  newValue = Math.round(1000 / (responseTime || 1)); // Requests per second
                  break;
                case 'Response Time':
                  newValue = responseTime;
                  newTrend = newValue < metric.value ? 'up' : newValue > metric.value ? 'down' : 'stable';
                  break;
              }
              
              const change = newValue - metric.value;
              
              // Trigger pulse for changed metrics
              if (change !== 0) {
                setPulseIndex(index);
                setTimeout(() => setPulseIndex(-1), 500);
              }
              
              return {
                ...metric,
                value: newValue,
                change,
                trend: newTrend,
                lastUpdate: new Date()
              };
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch real-time metrics:', error);
      }
    };

    // Update every 500ms for real-time feel
    const interval = setInterval(updateMetrics, 500);
    updateMetrics(); // Initial call

    return () => clearInterval(interval);
  }, []);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down':
        return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />;
      default:
        return <Activity className="w-3 h-3 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((metric, index) => (
        <div 
          key={metric.label}
          className={`glass-panel p-3 border transition-all duration-200 ${
            pulseIndex === index ? 'border-primary bg-primary/5 scale-105' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{metric.label}</span>
            <div className="flex items-center gap-1">
              {getTrendIcon(metric.trend)}
              {metric.change !== 0 && (
                <span className={`text-xs font-mono ${getTrendColor(metric.trend)}`}>
                  {metric.change > 0 ? '+' : ''}{metric.change}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono">
              {metric.value.toLocaleString()}
            </span>
            
            <div className="text-xs text-muted-foreground font-mono">
              {metric.label === 'Response Time' ? 'ms' : 
               metric.label === 'Data Rate' ? '/s' : ''}
            </div>
          </div>
          
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Clock className="w-2 h-2" />
            <span className="font-mono">
              {metric.lastUpdate.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit'
              })}
              <span className="text-muted-foreground">
                .{metric.lastUpdate.getMilliseconds().toString().padStart(3, '0')}
              </span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
