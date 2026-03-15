// Mock agent performance data
export interface AgentPerformance {
  user: string;
  station: string;
  currentStatus: string;
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  avgHandleTime: string; // mm:ss
  avgTalkTime: string;
  avgHoldTime: string;
  avgWrapTime: string;
  totalTalkTime: string; // hh:mm
  occupancy: number; // percentage
  adherence: number; // percentage
  longestCall: string;
  shortestCall: string;
}

const AGENT_NAMES = [
  "Maaz Haider", "Eman-e-Fatima", "Muhammad Anas", "Safiullah",
  "Muhammad Salman", "Malaika ConnectX", "Talha Farooq", "Mashood Trainee",
  "Daniyal Haider", "Anum ConnectX", "Shehreyaar Danish", "Ahmar Ali",
  "Hamid Butt", "Mahnoor Shahid", "Syeda Fatima Bukhari", "Shahmeer Manzar",
  "Samik Khan", "Atif Aslam", "Sameer", "Rana Abdullah",
  "Ali Nawaz", "Raja Kashan", "Ch Fahad", "Muhammad Usman"
];

const STATUSES = ["INCALL I", "READY", "PAUSED", "DISPO", "INCALL I", "INCALL I", "READY", "INCALL I"];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatTime(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatHours(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export function generateAgentPerformance(): AgentPerformance[] {
  return AGENT_NAMES.map((name, i) => {
    const totalCalls = rand(15, 85);
    const inboundCalls = rand(Math.floor(totalCalls * 0.6), totalCalls);
    const avgHandleSecs = rand(180, 540);
    const avgTalkSecs = rand(120, avgHandleSecs - 30);
    const avgHoldSecs = rand(5, 45);
    const avgWrapSecs = avgHandleSecs - avgTalkSecs - avgHoldSecs;

    return {
      user: name,
      station: `SIP/8${String(i + 10).padStart(3, "0")}`,
      currentStatus: STATUSES[i % STATUSES.length],
      totalCalls,
      inboundCalls,
      outboundCalls: totalCalls - inboundCalls,
      avgHandleTime: formatTime(avgHandleSecs),
      avgTalkTime: formatTime(avgTalkSecs),
      avgHoldTime: formatTime(avgHoldSecs),
      avgWrapTime: formatTime(Math.max(0, avgWrapSecs)),
      totalTalkTime: formatHours(rand(120, 420)),
      occupancy: rand(55, 95),
      adherence: rand(70, 100),
      longestCall: formatTime(rand(600, 1800)),
      shortestCall: formatTime(rand(15, 90)),
    };
  });
}
