
import { useState, useEffect } from 'react';
import { Container, Grid, Paper, Typography, CircularProgress, Select, MenuItem, InputLabel, FormControl } from '@mui/material';

// Assume your API functions are updated to accept filters
async function fetchShiftSummary(shiftDate, filters) {
  const { campaign, group } = filters;
  const queryParams = new URLSearchParams({ campaign, group });
  const response = await fetch(`/api/summary?shiftDate=${shiftDate}&${queryParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch shift summary');
  }
  return response.json();
}

async function fetchFilters(type) {
    const response = await fetch(`/api/filters?type=${type}`);
    if(!response.ok) {
        throw new Error (`Failed to fetch ${type}`);
    }
    return response.json();
}


export default function ShiftSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
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
            setCampaigns(campaignData.data);
            setGroups(groupData.data);
        } catch (err) {
            console.error("Error loading filters:", err);
        }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchShiftSummary(selectedDate, filters)
      .then(data => {
        setSummary(data.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedDate, filters]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!summary) return <Typography>No data available.</Typography>;

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>Agent Shift Summary for {selectedDate}</Typography>
      
      <Grid container spacing={2} style={{ marginBottom: '20px' }}>
            <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                    <InputLabel>Campaign</InputLabel>
                    <Select
                        name="campaign"
                        value={filters.campaign}
                        onChange={handleFilterChange}
                        label="Campaign"
                    >
                        <MenuItem value=""><em>All Campaigns</em></MenuItem>
                        {campaigns.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                    <InputLabel>Group</InputLabel>
                    <Select
                        name="group"
                        value={filters.group}
                        onChange={handleFilterChange}
                        label="Group"
                    >
                        <MenuItem value=""><em>All Groups</em></MenuItem>
                        {groups.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                    </Select>
                </FormControl>
            </Grid>
        </Grid>

      {/* Render your summary data here, using the 'summary' state */}
      <pre>{JSON.stringify(summary, null, 2)}</pre>

    </Container>
  );
}
