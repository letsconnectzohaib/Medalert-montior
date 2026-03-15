
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Layout, LayoutHeader, LayoutContent } from '@/components/layout/layout';
import { Skeleton } from '@/components/ui/skeleton';

interface AgentPerformanceData {
    agent_id: string;
    days_worked: number;
    pause_count: number;
    incall_count: number;
}

const AgentPerformancePage = () => {
    const [data, setData] = useState<AgentPerformanceData[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(new Date().setDate(new Date().getDate() - 7)),
        to: new Date(),
    });
    const router = useRouter();

    const fetchData = async () => {
        if (!dateRange?.from || !dateRange?.to) return;
        setLoading(true);

        try {
            const queryParams = new URLSearchParams({
                startDate: dateRange.from.toISOString().split('T')[0],
                endDate: dateRange.to.toISOString().split('T')[0],
            });

            const response = await fetch(`/api/agents/performance?${queryParams.toString()}`);
            if (response.ok) {
                const result = await response.json();
                setData(result);
            } else {
                console.error('Failed to fetch agent performance data');
            }
        } catch (error) {
            console.error('Error fetching agent performance data:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const handleDrillDown = (agentId: string) => {
        if (!dateRange?.from || !dateRange?.to) return;
        router.push(`/agents/${agentId}?startDate=${dateRange.from.toISOString().split('T')[0]}&endDate=${dateRange.to.toISOString().split('T')[0]}`);
    };

    return (
        <Layout>
            <LayoutHeader>
                <h1 className="text-2xl font-bold">Agent Performance</h1>
            </LayoutHeader>
            <LayoutContent>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Performance Summary</CardTitle>
                            <div className="flex items-center space-x-2">
                                <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
                                <Button onClick={fetchData} disabled={loading}>
                                    {loading ? 'Refreshing...' : 'Refresh'}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Agent ID</TableHead>
                                    <TableHead>Days Worked</TableHead>
                                    <TableHead>Pause Count</TableHead>
                                    <TableHead>In-Call Count</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : data.length > 0 ? (
                                    data.map(agent => (
                                        <TableRow key={agent.agent_id}>
                                            <TableCell>{agent.agent_id}</TableCell>
                                            <TableCell>{agent.days_worked}</TableCell>
                                            <TableCell>{agent.pause_count}</TableCell>
                                            <TableCell>{agent.incall_count}</TableCell>
                                            <TableCell>
                                                <Button variant="link" onClick={() => handleDrillDown(agent.agent_id)}>
                                                    Drill Down
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">No data available for the selected date range.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </LayoutContent>
        </Layout>
    );
};

export default AgentPerformancePage;
