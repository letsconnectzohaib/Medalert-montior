import { useState, useEffect, useMemo } from "react";

export interface SLAMetrics {
  targetSeconds: number;
  totalAnswered: number;
  answeredWithinTarget: number;
  percentage: number;
  trend: number[]; // last 10 readings
  avgWaitTime: number;
  maxWaitTime: number;
  abandoned: number;
  abandonRate: number;
}

interface ChartData {
  agents: any[];
  calls: any[];
  sla: {
    current: any;
    threshold: number;
    percentage: number;
  };
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function useSLATracker(targetSeconds: number = 20, waitingCalls: number = 0) {
  const [metrics, setMetrics] = useState<SLAMetrics>(() => generateMetrics(targetSeconds));

  useEffect(() => {
    const id = setInterval(() => {
      setMetrics(generateMetrics(targetSeconds));
    }, 15000);
    return () => clearInterval(id);
  }, [targetSeconds]);

  return metrics;
}

function generateMetrics(targetSeconds: number): SLAMetrics {
  const totalAnswered = rand(180, 450);
  const pct = rand(72, 96);
  const answeredWithinTarget = Math.round(totalAnswered * pct / 100);
  const abandoned = rand(3, 25);

  return {
    targetSeconds,
    totalAnswered,
    answeredWithinTarget,
    percentage: pct,
    trend: Array.from({ length: 12 }, () => rand(65, 98)),
    avgWaitTime: rand(8, 28),
    maxWaitTime: rand(45, 180),
    abandoned,
    abandonRate: Math.round(abandoned / (totalAnswered + abandoned) * 100),
  };
}
