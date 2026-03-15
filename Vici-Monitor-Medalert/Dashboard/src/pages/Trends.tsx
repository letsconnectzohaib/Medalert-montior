
import { useState, useEffect } from 'react';
import { Container, Grid, Paper, Typography, CircularProgress, Select, MenuItem, InputLabel, FormControl, TextField } from '@mui/material';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Fetches trends data from the frontend API proxy
async function fetchTrendsData(type, endDate, filters) {
    const { campaign, group } = filters;
    const queryParams = new URLSearchParams({ type, endDate, campaign, group });
    const response = await fetch(`/api/trends?${queryParams.toString()}`);
    
    // The proxy will return a 500/400 on network/auth error, which this handles.
    if(!response.ok) {
        const errorInfo = await response.json();
        throw new Error(errorInfo.error || `Failed to fetch ${type} trends`);
    }
    
    // The proxy returns the JSON from the backend, which includes the { success, data, error } structure.
    return response.json();
}

async function fetchFilters(type) {
    const response = await fetch(`/api/filters?type=${type}`);
    if(!response.ok) {
        throw new Error (`Failed to fetch ${type}`);
    }
    return response.json();
}

export default function Trends() {
  const [historicalData, setHistoricalData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [campaigns, setCampaigns] = useState([]);
  const [groups, setGroups] = useState([]);
  const [filters, setFilters] = useState({ campaign: '', group: '' });

  useEffect(() => {
    const loadFilters = async () => {
        try {
            const [campaignData, groupData] = await Promise.all([
                fetchFilters('campaigns'),
                fetchFilters('groups'),
            ]);
            setCampaigns(campaignData.data || []);
            setGroups(groupData.data || []);
        } catch (err) {
            console.error("Error loading filters:", err);
        }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null); // Reset error on new data fetch

    Promise.all([
        fetchTrendsData('historical', endDate, filters),
        fetchTrendsData('heatmap', endDate, filters)
    ])
    .then(([historicalRes, heatmapRes]) => {
        // Check for backend-level success on BOTH responses
        if (!historicalRes.success) {
            throw new Error(historicalRes.error || 'Failed to fetch historical trends.');
        }
        if (!heatmapRes.success) {
            throw new Error(heatmapRes.error || 'Failed to fetch heatmap data.');
        }

        // Both successful, now process the data
        const processed = historicalRes.data.reduce((acc, curr) => {
            const date = curr.shift_date;
            if (!acc[date]) {
                acc[date] = { shift_date: date, total_calls: 0, ready: 0, paused: 0 };
            }
            acc[date].total_calls += curr.status_count;
            if (curr.vicidial_state_color === '#a5d6a7') acc[date].ready = curr.status_count;
            if (curr.vicidial_state_color === '#ef9a9a') acc[date].paused = curr.status_count;
            return acc;
        }, {});
        
        setHistoricalData(Object.values(processed));
        setHeatmapData(heatmapRes.data);
    })
    .catch(err => {
        // Catches both network errors and the explicit errors thrown above
        setError(err.message);
    })
    .finally(() => {
        setLoading(false);
    });
  }, [endDate, filters]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>Performance Trends up to {endDate}</Typography>

      <Grid container spacing={2} style={{ marginBottom: '20px' }}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
                <InputLabel>Campaign</InputLabel>
                <Select name="campaign" value={filters.campaign} onChange={handleFilterChange} label="Campaign">
                    <MenuItem value=""><em>All Campaigns</em></MenuItem>
                    {campaigns.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
            </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
                <InputLabel>Group</InputLabel>
                <Select name="group" value={filters.group} onChange={handleFilterChange} label="Group">
                    <MenuItem value=""><em>All Groups</em></MenuItem>
                    {groups.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                </Select>
            </FormControl>
        </Grid>
      </Grid>

        {loading && <CircularProgress />}
        {error && <Typography color="error">Error: {error}</Typography>}
        {!loading && !error && (
            <Grid container spacing={4}>
                <Grid item xs={12}>
                    <Typography variant="h6">Historical Call Volume (30 days)</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={historicalData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="shift_date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="total_calls" fill="#8884d8" name="Total Calls" />
                        </BarChart>
                    </ResponsiveContainer>
                </Grid>
                {/* Heatmap can be implemented here using heatmapData */}
            </Grid>
        )}
    </Container>
  );
}
