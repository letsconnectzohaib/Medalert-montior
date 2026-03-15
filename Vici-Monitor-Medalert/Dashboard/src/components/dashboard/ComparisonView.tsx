
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

// A small component to show a stat with a comparison indicator
const StatCard = ({ title, value, previousValue, unit = '' }) => {
    const difference = value - previousValue;
    const percentageChange = previousValue ? (difference / previousValue) * 100 : 0;

    const getIcon = () => {
        if (difference > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
        if (difference < 0) return <ArrowDown className="w-4 h-4 text-red-500" />;
        return <Minus className="w-4 h-4 text-gray-500" />;
    };

    return (
        <Card className="bg-background/50 backdrop-blur-sm">
            <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">{title}</p>
                <p className="text-2xl font-bold">{value}{unit}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                    {getIcon()}
                    <span>
                        {difference.toFixed(2)} ({percentageChange.toFixed(1)}%) vs yesterday
                    </span>
                </div>
            </CardContent>
        </Card>
    );
};

const ComparisonView = ({ todayData, yesterdayData }) => {
    if (!todayData || !yesterdayData) {
        return <div className="text-center p-8 text-muted-foreground">Not enough data to compare. Please check previous day's logs.</div>;
    }

    // Simple aggregation for demonstration. We can make this more complex later.
    const aggregate = (data) => {
        let totalIncallRecords = 0;
        let totalPausedRecords = 0;

        data.forEach(hour => {
            totalIncallRecords += (hour['#d1c4e9'] || 0);
            totalPausedRecords += (hour['#b39ddb'] || 0);
        });

        return { totalIncallRecords, totalPausedRecords };
    };

    const todayAgg = aggregate(todayData);
    const yesterdayAgg = aggregate(yesterdayData);

    return (
        <div className="p-4">
            <h3 className="text-lg font-bold mb-4 text-center">Today vs. Yesterday</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard 
                    title="Total 'INCALL' Records"
                    value={todayAgg.totalIncallRecords}
                    previousValue={yesterdayAgg.totalIncallRecords}
                />
                <StatCard 
                    title="Total 'PAUSED' Records"
                    value={todayAgg.totalPausedRecords}
                    previousValue={yesterdayAgg.totalPausedRecords}
                />
            </div>
        </div>
    );
};

export default ComparisonView;
