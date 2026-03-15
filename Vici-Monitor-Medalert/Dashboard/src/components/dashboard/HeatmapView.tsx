
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, Tooltip, Scatter, ZAxis } from 'recharts';

const dayOfWeekMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="glass-panel p-3 text-xs font-mono border border-border shadow-lg">
                <p className="font-bold">{dayOfWeekMap[data.day_of_week]} at {data.hour_of_day}:00</p>
                <p>INCALL Records: <span className="font-bold">{data.incall_count}</span></p>
            </div>
        );
    }
    return null;
};


const HeatmapView = ({ endDate }) => {
    const [heatmapData, setHeatmapData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHeatmapData = async () => {
            if (!endDate) return;
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/heatmap?endDate=${endDate}`);
                const data = await response.json();
                if (data.success) {
                    setHeatmapData(data.data);
                } else {
                    setError(data.error || 'Failed to fetch heatmap data.');
                }
            } catch (err) {
                setError('Could not connect to the server.');
            }
            setLoading(false);
        };

        fetchHeatmapData();
    }, [endDate]);

    if (loading) return <div className="text-center p-8">Generating heatmap...</div>;
    if (error) return <div className="text-center p-8 text-destructive">Error: {error}</div>;
    if (heatmapData.length === 0) return <div className="text-center p-8 text-muted-foreground">No data available for the heatmap.</div>;

    const domain = [0, Math.max(...heatmapData.map(d => d.incall_count))];
    const range = ['#d1c4e9', '#5e35b1']; // Light to dark purple

    return (
        <div className="p-4 h-full">
             <h3 className="text-lg font-bold mb-4 text-center">Weekly INCALL Activity Heatmap (Last 4 Weeks)</h3>
            <ResponsiveContainer width="100%" height={350}>
                 <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 50 }}>
                    <CartesianGrid stroke="hsl(220, 14%, 25%)" />
                    <XAxis 
                        dataKey="hour_of_day" 
                        type="number"
                        domain={[0, 23]}
                        tickCount={24}
                        name="Hour of Day"
                        label={{ value: 'Hour of the Day', position: 'insideBottom', dy: 30, fill: 'hsl(215, 12%, 70%)' }}
                        tick={{ fill: 'hsl(215, 12%, 70%)', fontSize: 10 }}
                        stroke="transparent"
                    />
                    <YAxis 
                        dataKey="day_of_week" 
                        type="number"
                        domain={[-1, 7]} // Add padding
                        tickCount={7}
                        name="Day of Week"
                        label={{ value: 'Day of Week', angle: -90, position: 'insideLeft', dx: -30, fill: 'hsl(215, 12%, 70%)' }}
                        tickFormatter={(day) => dayOfWeekMap[day] || ''}
                        tick={{ fill: 'hsl(215, 12%, 70%)', fontSize: 12 }}
                        stroke="transparent"
                    />
                     <ZAxis dataKey="incall_count" domain={domain} range={range} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                    <Scatter name="INCALL records" data={heatmapData} fill="#8884d8" shape="square" />
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
};

export default HeatmapView;
