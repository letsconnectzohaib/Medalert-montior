
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Layout, LayoutHeader, LayoutContent } from '@/components/layout/layout';
import { Skeleton } from '@/components/ui/skeleton';

interface AgentStatus {
    agent_id: string;
    agent_status: string;
    vicidial_state_color: string;
    timestamp: string;
}

// Fetches available filter options
async function fetchFilters(type) {
    const response = await fetch(`/api/filters?type=${type}`);
    if(!response.ok) {
        throw new Error (`Failed to fetch ${type}`);
    }
    return response.json();
}

const RealTimePage = () => {
    const [agents, setAgents] = useState<AgentStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [campaigns, setCampaigns] = useState([]);
    const [groups, setGroups] = useState([]);
    const [campaignFilter, setCampaignFilter] = useState('all');
    const [groupFilter, setGroupFilter] = useState('all');

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

    const fetchData = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (campaignFilter !== 'all') queryParams.append('campaign', campaignFilter);
            if (groupFilter !== 'all') queryParams.append('group', groupFilter);

            const response = await fetch(`/api/agents/realtime?${queryParams.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setAgents(data);
            } else {
                console.error('Failed to fetch real-time data');
            }
        } catch (error) {
            console.error('Error fetching real-time data:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData(); // Fetch data on initial load and when filters change

        const interval = setInterval(fetchData, 5000); // Poll every 5 seconds

        return () => clearInterval(interval); // Cleanup on component unmount
    }, [campaignFilter, groupFilter]);

    const StatusIndicator = ({ color, status }) => (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color || '#cccccc' }} />
                        <span>{status || 'UNKNOWN'}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Status: {status}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    return (
        <Layout>
            <LayoutHeader>
                <h1 className="text-2xl font-bold">Real-Time Agent Monitor</h1>
            </LayoutHeader>
            <LayoutContent>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Agent Status</CardTitle>
                            <div className="flex space-x-2">
                                <Select onValueChange={setCampaignFilter} defaultValue="all">
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter by campaign..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Campaigns</SelectItem>
                                        {campaigns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select onValueChange={setGroupFilter} defaultValue="all">
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter by group..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Groups</SelectItem>
                                        {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <Card key={i} className="p-4 space-y-2">
                                        <Skeleton className="h-5 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-4 w-1/4" />
                                    </Card>
                                ))
                            ) : agents.length > 0 ? (
                                agents.map(agent => (
                                    <Card key={agent.agent_id} className="p-4 flex flex-col justify-between">
                                        <div className="font-bold text-lg mb-2">Agent: {agent.agent_id}</div>
                                        <StatusIndicator color={agent.vicidial_state_color} status={agent.agent_status} />
                                        <div className="text-xs text-muted-foreground mt-2">
                                            Last Update: {new Date(agent.timestamp).toLocaleTimeString()}
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <p>No agents found for the selected filters.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </LayoutContent>
        </Layout>
    );
};

export default RealTimePage;
