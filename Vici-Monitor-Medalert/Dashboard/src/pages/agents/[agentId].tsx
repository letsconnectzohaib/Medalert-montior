
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Layout, LayoutHeader, LayoutContent } from '@/components/layout/layout';
import { Skeleton } from '@/components/ui/skeleton';

interface AgentDetailData {
    shift_date: string;
    agent_status: string;
    status_count: number;
    first_occurrence: string;
    last_occurrence: string;
}

const AgentDetailPage = () => {
    const [data, setData] = useState<AgentDetailData[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { agentId, startDate, endDate } = router.query;

    useEffect(() => {
        const fetchData = async () => {
            if (!agentId || !startDate || !endDate) return;
            setLoading(true);

            try {
                const queryParams = new URLSearchParams({
                    startDate: startDate as string,
                    endDate: endDate as string,
                });

                const response = await fetch(`/api/agents/performance/${agentId}?${queryParams.toString()}`);
                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                } else {
                    console.error('Failed to fetch agent detail data');
                }
            } catch (error) {
                console.error('Error fetching agent detail data:', error);
            }
            setLoading(false);
        };

        fetchData();
    }, [agentId, startDate, endDate]);

    return (
        <Layout>
            <LayoutHeader>
                <h1 className="text-2xl font-bold">Agent Details: {agentId}</h1>
                <p className="text-muted-foreground">
                    Performance from {startDate} to {endDate}
                </p>
            </LayoutHeader>
            <LayoutContent>
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Count</TableHead>
                                    <TableHead>First Occurrence</TableHead>
                                    <TableHead>Last Occurrence</TableHead>
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
                                    data.map(detail => (
                                        <TableRow key={`${detail.shift_date}-${detail.agent_status}`}>
                                            <TableCell>{detail.shift_date}</TableCell>
                                            <TableCell>{detail.agent_status}</TableCell>
                                            <TableCell>{detail.status_count}</TableCell>
                                            <TableCell>{new Date(detail.first_occurrence).toLocaleTimeString()}</TableCell>
                                            <TableCell>{new Date(detail.last_occurrence).toLocaleTimeString()}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">No data available for this agent in the selected date range.</TableCell>
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

export default AgentDetailPage;
