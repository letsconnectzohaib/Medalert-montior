
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ShiftSummary = () => {
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
  const [agentLog, setAgentLog] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchShiftData = async () => {
    if (!shiftDate) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/agent_log/by_shift/${shiftDate}`);
      const data = await response.json();
      if (data.success) {
        setAgentLog(data.data);
      } else {
        console.error('Failed to fetch shift data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching shift data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchShiftData();
  }, [shiftDate]);

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">Shift Summary</h1>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Select Shift Date</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Input 
            type="date" 
            value={shiftDate}
            onChange={(e) => setShiftDate(e.target.value)}
            className="w-auto"
          />
          <Button onClick={fetchShiftData} disabled={loading}>
            {loading ? 'Loading...' : 'Load Shift'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent Activity Log for Shift: {shiftDate}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration (s)</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>State Color</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentLog.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.timestamp).toLocaleTimeString()}</TableCell>
                  <TableCell>{log.user_name}</TableCell>
                  <TableCell>{log.status}</TableCell>
                  <TableCell>{log.status_duration_seconds}</TableCell>
                  <TableCell>{log.campaign}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs text-white ${log.vicidial_state_color}`}>
                        {log.vicidial_state_color}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftSummary;
