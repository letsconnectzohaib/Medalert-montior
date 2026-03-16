import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity, Clock, Database, Server } from 'lucide-react';
import { format } from 'date-fns';

interface LiveStatus {
  extensionConnected: boolean;
  databaseConnected: boolean;
  dashboardConnected: boolean;
  lastUpdate: Date;
  dataFlowActive: boolean;
}

export function LiveStatusIndicator() {
  const [status, setStatus] = useState<LiveStatus>({
    extensionConnected: false,
    databaseConnected: false,
    dashboardConnected: true,
    lastUpdate: new Date(),
    dataFlowActive: false
  });

  const [pulseAnimation, setPulseAnimation] = useState(false);

  useEffect(() => {
    // Check connection status
    const checkConnections = async () => {
      try {
        // Check database connection
        const dbResponse = await fetch('http://localhost:3001/api/health');
        const dbConnected = dbResponse.ok;

        // Check extension server connection
        const extResponse = await fetch('http://localhost:3000/api/health');
        const extConnected = extResponse.ok;

        setStatus(prev => ({
          ...prev,
          extensionConnected: extConnected,
          databaseConnected: dbConnected,
          lastUpdate: new Date(),
          dataFlowActive: extConnected && dbConnected
        }));

        // Trigger pulse animation when data flows
        if (extConnected && dbConnected) {
          setPulseAnimation(true);
          setTimeout(() => setPulseAnimation(false), 1000);
        }
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          extensionConnected: false,
          databaseConnected: false,
          dataFlowActive: false
        }));
      }
    };

    // Initial check
    checkConnections();

    // Check every 2 seconds for live status
    const interval = setInterval(checkConnections, 2000);

    return () => clearInterval(interval);
  }, []);

  const getConnectionColor = (connected: boolean) => 
    connected ? 'text-green-500' : 'text-red-500';

  const getStatusText = () => {
    if (status.extensionConnected && status.databaseConnected) {
      return 'LIVE';
    } else if (status.databaseConnected) {
      return 'DB ONLY';
    } else {
      return 'OFFLINE';
    }
  };

  const getStatusColor = () => {
    if (status.extensionConnected && status.databaseConnected) {
      return 'text-green-500 bg-green-500/10 border-green-500/30';
    } else if (status.databaseConnected) {
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    } else {
      return 'text-red-500 bg-red-500/10 border-red-500/30';
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Live Status Badge */}
      <div className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-2 ${getStatusColor()}`}>
        <div className={`w-2 h-2 rounded-full ${status.dataFlowActive ? 'bg-green-500' : 'bg-red-500'} ${pulseAnimation ? 'animate-ping' : ''}`}></div>
        {getStatusText()}
      </div>

      {/* Connection Indicators */}
      <div className="flex items-center gap-2 text-xs">
        {/* Extension Connection */}
        <div className="flex items-center gap-1">
          <Server className={`w-3 h-3 ${getConnectionColor(status.extensionConnected)}`} />
          <span className={getConnectionColor(status.extensionConnected)}>EXT</span>
        </div>

        {/* Database Connection */}
        <div className="flex items-center gap-1">
          <Database className={`w-3 h-3 ${getConnectionColor(status.databaseConnected)}`} />
          <span className={getConnectionColor(status.databaseConnected)}>DB</span>
        </div>

        {/* Dashboard Connection */}
        <div className="flex items-center gap-1">
          <Wifi className={`w-3 h-3 ${getConnectionColor(status.dashboardConnected)}`} />
          <span className={getConnectionColor(status.dashboardConnected)}>UI</span>
        </div>
      </div>

      {/* Last Update with Nano-seconds */}
      <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {format(status.lastUpdate, 'HH:mm:ss.SSS')}
      </div>

      {/* Data Flow Indicator */}
      {status.dataFlowActive && (
        <div className="flex items-center gap-1 text-xs text-green-500">
          <Activity className={`w-3 h-3 ${pulseAnimation ? 'animate-pulse' : ''}`} />
          <span className={pulseAnimation ? 'animate-pulse' : ''}>FLOWING</span>
        </div>
      )}
    </div>
  );
}
