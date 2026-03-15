
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { Calendar } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass-panel p-3 text-xs font-mono border border-border">
      <p className="text-muted-foreground mb-2 font-bold">Hour: {label}:00</p>
      {payload.slice().reverse().map((entry: any, i: number) => (
        <div key={i} className="flex justify-between items-center gap-4">
          <span style={{ color: entry.fill }}>
            {entry.name === '#d1c4e9' ? 'INCALL' : entry.name === '#b39ddb' ? 'PAUSED' : entry.name === '#ce93d8' ? 'DISPO' : 'OTHER'}:
          </span>
          <span className="font-bold">{entry.value} agents</span>
        </div>
      ))}
    </div>
  );
};


const ShiftSummary = () => {
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHourlyData = async () => {
      if (!shiftDate) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:3001/api/summary/hourly-breakdown/${shiftDate}`);
        const data = await response.json();
        if (data.success) {
          setHourlyData(data.data);
        } else {
          setError(data.error || 'Failed to fetch hourly breakdown.');
          setHourlyData([]);
        }
      } catch (err) {
        setError('Could not connect to the server.');
        setHourlyData([]);
      }
      setLoading(false);
    };

    fetchHourlyData();
  }, [shiftDate]);

  const colorKeys = useMemo(() => {
    const keys = new Set<string>();
    hourlyData.forEach(hour => {
      Object.keys(hour).forEach(key => {
        if (key !== 'hour') keys.add(key);
      });
    });
    // A stable sort order for the stack
    return Array.from(keys).sort((a,b) => b.localeCompare(a));
  }, [hourlyData]);

  const colorNameMapping = {
    '#d1c4e9': 'INCALL (Light Purple)',
    '#b39ddb': 'PAUSED (Medium Purple)',
    '#9575cd': 'INCALL (Dark Purple)',
    '#ce93d8': 'DISPO (Pinkish Purple)',
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Hourly Performance Breakdown</h1>
             <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Input
                    type="date"
                    value={shiftDate}
                    onChange={(e) => setShiftDate(e.target.value)}
                    className="bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary px-2 py-1 w-auto"
                />
            </div>
        </div>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Agent Status Count by Hour for {shiftDate}</CardTitle>
          <p className="text-xs text-muted-foreground pt-1">This chart shows the number of agent status records logged each hour, stacked by the agent's state color. 'INCALL' represents the most active call state.</p>
        </CardHeader>
        <CardContent>
          <div className="h-96 pr-4">
             {loading && <div className="flex items-center justify-center h-full">Loading chart data...</div>}
             {!loading && error && <div className="flex items-center justify-center h-full text-destructive">Error: {error}</div>}
             {!loading && !error && hourlyData.length === 0 && <div className="flex items-center justify-center h-full text-muted-foreground">No data available for this shift date.</div>}
             {!loading && !error && hourlyData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 25%)" />
                        <XAxis 
                            dataKey="hour" 
                            tick={{ fill: 'hsl(215, 12%, 70%)', fontSize: 12 }}
                            stroke="transparent"
                            tickFormatter={(hour) => `${hour}:00`}
                            label={{ value: 'Hour of the Day (24h format)', position: 'insideBottom', dy: 20, fill: 'hsl(215, 12%, 70%)' }}
                        />
                        <YAxis 
                            tick={{ fill: 'hsl(215, 12%, 70%)', fontSize: 12 }}
                            stroke="transparent"
                            label={{ value: 'Agent Status Records', angle: -90, position: 'insideLeft', dx: -10, fill: 'hsl(215, 12%, 70%)' }}
                         />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(220, 14%, 30%, 0.5)' }}/>
                        <Legend 
                            formatter={(value, entry) => <span className="text-xs text-muted-foreground">{colorNameMapping[value] || value}</span>}
                            wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                        />
                        {colorKeys.map((key, index) => (
                            <Bar key={index} dataKey={key} stackId="a" fill={key} name={key} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftSummary;

