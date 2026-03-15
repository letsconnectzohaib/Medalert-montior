
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';

const TrendsView = ({ endDate }) => {
    const [trendData, setTrendData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTrends = async () => {
            if (!endDate) return;
            setLoading(true);
            setError(null);
            try {
                // We will need to create this new internal API endpoint
                const response = await fetch(`/api/trends?endDate=${endDate}`);
                const data = await response.json();
                if (data.success) {
                    setTrendData(data.data);
                } else {
                    setError(data.error || 'Failed to fetch trend data.');
                }
            } catch (err) {
                setError('Could not connect to the server.');
            }
            setLoading(false);
        };

        fetchTrends();
    }, [endDate]);

    if (loading) {
        return <div className="text-center p-8">Loading trend data...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-destructive">Error: {error}</div>;
    }

    if (trendData.length === 0) {
        return <div className="text-center p-8 text-muted-foreground">No trend data available for this period.</div>;
    }

    return (
        <div className="p-4 h-full">
            <h3 className="text-lg font-bold mb-4 text-center">Last 30 Days Performance Trends</h3>
            <ResponsiveContainer width="100%" height={350}>
                <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 25%)" />
                    <XAxis 
                        dataKey="date" 
                        tick={{ fill: 'hsl(215, 12%, 70%)', fontSize: 10 }}
                        stroke="transparent"
                        tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                        tick={{ fill: 'hsl(215, 12%, 70%)', fontSize: 12 }} 
                        stroke="transparent" 
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid hsl(220, 14%, 25%)' }}
                        labelFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line 
                        type="monotone" 
                        dataKey="incall_records" 
                        name="'INCALL' Records"
                        stroke="#8884d8" 
                        strokeWidth={2} 
                    />
                    <Line 
                        type="monotone" 
                        dataKey="paused_records" 
                        name="'PAUSED' Records"
                        stroke="#82ca9d" 
                        strokeWidth={2} 
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TrendsView;
