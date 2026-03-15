import { useState, useEffect, useCallback, useMemo } from "react";
import { generateShiftData, getAggregatedData, getLatestSnapshot, VicidialSnapshot } from "@/data/mockData";

export function useAutoRefresh(timeWindow: number, intervalMs = 15000) {
  const [shiftData, setShiftData] = useState<VicidialSnapshot[]>(() => generateShiftData());
  const [latestSnapshot, setLatestSnapshot] = useState<VicidialSnapshot>(() => getLatestSnapshot());
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const refresh = useCallback(() => {
    setShiftData(generateShiftData());
    setLatestSnapshot(getLatestSnapshot());
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  const chartData = useMemo(
    () => getAggregatedData(shiftData, timeWindow),
    [shiftData, timeWindow]
  );

  return { shiftData, latestSnapshot, chartData, lastRefresh, refresh };
}
