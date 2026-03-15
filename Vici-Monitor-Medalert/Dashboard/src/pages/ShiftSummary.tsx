
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Line } from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';


const CustomTooltip = ({ active, payload, label, colorNameMapping }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  // Find the bar data and line data from the payload
  const barData = payload.filter(p => p.dataKey.startsWith('#'));
  const lineData = payload.filter(p => !p.dataKey.startsWith('#'));

  return (
    <div className="glass-panel p-3 text-xs font-mono border border-border shadow-lg">
      <p className="text-muted-foreground mb-2 font-bold">Hour: {label}:00</p>
      {/* Display bar data first (current shift) */}
      {barData.slice().reverse().map((entry: any, i: number) => (
        <div key={`bar-${i}`} className="flex justify-between items-center gap-4">
          <span style={{ color: entry.fill }}>
             {colorNameMapping[entry.name] || entry.name}:
          </span>
          <span className="font-bold">{entry.value} records</span>
        </div>
      ))}
       {lineData.length > 0 && <hr className="my-2 border-border" />}
      {/* Display line data (comparisons) */}
       {lineData.map((entry: any, i: number) => (
        <div key={`line-${i}`} className="flex justify-between items-center gap-4">
          <span style={{ color: entry.stroke }}>{entry.name}:</span>
          <span className="font-bold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};


const ShiftSummary = () => {
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
  const [analyticalData, setAnalyticalData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreviousDay, setShowPreviousDay] = useState(false);
  const [showWeeklyAvg, setShowWeeklyAvg] = useState(true);

  useEffect(() => {
    const fetchAnalyticalData = async () => {
      if (!shiftDate) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:3001/api/summary/analytical-breakdown/${shiftDate}`);
        const data = await response.json();
        if (data.success) {
            // Combine all data sources into one array for the chart
            const combined = data.data.hourlyBreakdown.map(hourData => {
                const prevDayHour = data.data.previousDayBreakdown.find(pd => pd.hour === hourData.hour);
                const weeklyAvgHour = data.data.weeklyAverage.find(wa => wa.hour === hourData.hour);
                return {
                    ...hourData,
                    prev_incall: prevDayHour ? (prevDayHour['#d1c4e9'] || 0) : 0,
                    weekly_avg_incall: weeklyAvgHour ? (weeklyAvgHour['#d1c4e9_avg'] || 0) : 0,
                };
            });
            setAnalyticalData({ ...data.data, combinedChartData: combined });
        } else {
          setError(data.error || 'Failed to fetch analytical data.');
        }
      } catch (err) {
        setError('Could not connect to the backend server.');
      }
      setLoading(false);
    };
    fetchAnalyticalData();
  }, [shiftDate]);

  const colorKeys = useMemo(() => {
    const keys = new Set<string>();
    analyticalData?.hourlyBreakdown.forEach((hour: any) => {
      Object.keys(hour).forEach(key => {
        if (key.startsWith('#')) keys.add(key);
      });
    });
    return Array.from(keys).sort((a,b) => b.localeCompare(a));
  }, [analyticalData]);

  const colorNameMapping: { [key: string]: string } = {
    '#d1c4e9': 'INCALL',
    '#b39ddb': 'PAUSED',
    '#9575cd': 'LIVE CALL',
    '#ce93d8': 'DISPO/DEAD',
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-xl font-bold">Advanced Performance Analysis</h1>
             <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Input
                    type="date"
                    value={shiftDate}
                    onChange={(e) => setShiftDate(e.target.value)}
                    className="bg-secondary border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary px-2 py-1 w-auto"
                />
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
                <Card className="glass-panel h-full">
                    <CardHeader>
                        <CardTitle>Hourly Agent Status Breakdown ({shiftDate})</CardTitle>
                         <div className="flex flex-wrap gap-x-4 gap-y-2 items-center pt-2 text-xs">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="showWeeklyAvg" checked={showWeeklyAvg} onCheckedChange={() => setShowWeeklyAvg(!showWeeklyAvg)} />
                                <Label htmlFor="showWeeklyAvg">Show 7-Day Avg (INCALL)</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <Checkbox id="showPreviousDay" checked={showPreviousDay} onCheckedChange={() => setShowPreviousDay(!showPreviousDay)} />
                                <Label htmlFor="showPreviousDay">Compare to Previous Day (INCALL)</Label>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[450px] pr-4">
                         {loading && <div className="flex items-center justify-center h-full">Loading analytical data...</div>}
                         {!loading && error && <div className="flex items-center justify-center h-full text-destructive">Error: {error}</div>}
                         {!loading && !error && (!analyticalData || analyticalData.combinedChartData.length === 0) && (
                            <div className="flex items-center justify-center h-full text-muted-foreground">No data available for this shift date.</div>
                         )}
                         {!loading && !error && analyticalData && analyticalData.combinedChartData.length > 0 && (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={analyticalData.combinedChartData} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 25%)" />
                                    <XAxis dataKey="hour" tick={{ fill: 'hsl(215, 12%, 70%)', fontSize: 12 }} stroke="transparent" tickFormatter={(hour) => `${hour}:00`}
                                        label={{ value: 'Hour of the Day (24h format)', position: 'insideBottom', dy: 30, fill: 'hsl(215, 12%, 70%)' }}
                                    />
                                    <YAxis yAxisId="left" tick={{ fill: 'hsl(215, 12%, 70%)', fontSize: 12 }} stroke="transparent" label={{ value: 'Agent Status Records', angle: -90, position: 'insideLeft', dx: -10, fill: 'hsl(215, 12%, 70%)' }} />
                                    <Tooltip content={<CustomTooltip colorNameMapping={colorNameMapping} />} cursor={{ fill: 'hsla(220, 14%, 30%, 0.5)' }}/>
                                    <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{colorNameMapping[value] || value}</span>} wrapperStyle={{ fontSize: '12px', paddingTop: '30px' }}/>
                                    {colorKeys.map((key) => <Bar key={key} yAxisId="left" dataKey={key} stackId="a" fill={key} name={key} /> )}
                                    {showWeeklyAvg && <Line yAxisId="left" type="monotone" dataKey="weekly_avg_incall" name="Weekly Avg INCALL" stroke="#ffc658" strokeWidth={2} dot={false} />}
                                    {showPreviousDay && <Line yAxisId="left" type="monotone" dataKey="prev_incall" name="Previous Day INCALL" stroke="#82ca9d" strokeWidth={2} strokeDasharray="5 5" dot={false} />}
                                </ComposedChart>
                            </ResponsiveContainer>
                         )}
                      </div>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
                 <Card className="glass-panel">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Peak Performance Hour</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {analyticalData?.bestHour ? (
                            <div className="text-center">
                                <p className="text-4xl font-bold">{analyticalData.bestHour.hour}:00</p>
                                <p className="text-muted-foreground text-sm mt-1">with <span className="font-bold text-primary">{analyticalData.bestHour.incall_count}</span> 'INCALL' records</p>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm text-center">No INCALL data for this day.</p>
                        )}
                    </CardContent>
                </Card>
                 <Card className="glass-panel">
                    <CardHeader><CardTitle>Color Legend</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                         {Object.entries(colorNameMapping).map(([color, name]) => (
                            <div key={color} className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div>
                                <span>{name}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
};

export default ShiftSummary;
