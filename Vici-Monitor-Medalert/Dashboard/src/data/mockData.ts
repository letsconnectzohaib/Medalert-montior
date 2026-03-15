// Mock data generator based on actual ViciDial stats structure

export interface VicidialSnapshot {
  timestamp: string;
  data: {
    timestamp: string;
    summary: {
      activeCalls: number;
      ringingCalls: number;
      waitingCalls: number;
      ivrCalls: number;
      agentsLoggedIn: number;
      agentsInCalls: number;
      agentsWaiting: number;
      agentsPaused: number;
      agentsDead: number;
      agentsDispo: number;
    };
    details: {
      waitingCalls: WaitingCall[];
      agents: AgentRecord[];
    };
    meta: {
      dialLevel: string;
      dialableLeads: number;
      callsToday: number;
      droppedAnswered: string;
      avgAgents: number;
      dialMethod: string;
    };
  };
}

export interface WaitingCall {
  status: string;
  campaign: string;
  phone: string;
  server: string;
  wait: string;
  type: string;
  priority: string;
}

export interface AgentRecord {
  station: string;
  user: string;
  session: string;
  status: string;
  time: string;
  campaign: string;
  group: string;
}

const AGENT_NAMES = [
  "Maaz Haider", "Eman-e-Fatima", "Muhammad Anas", "Safiullah",
  "Muhammad Salman", "Malaika ConnectX", "Talha Farooq", "Mashood Trainee",
  "Daniyal Haider", "Anum ConnectX", "Shehreyaar Danish", "Ahmar Ali",
  "Hamid Butt", "Mahnoor Shahid", "Syeda Fatima Bukhari", "Shahmeer Manzar",
  "Samik Khan", "Atif Aslam", "Sameer", "Rana Abdullah",
  "Ali Nawaz", "Raja Kashan", "Ch Fahad", "Muhammad Usman"
];

const STATUSES = ["INCALL I", "INCALL I", "INCALL I", "INCALL I", "READY", "PAUSED", "DISPO"];
const GROUPS = ["995", "999", "152", "201", "149", "9008"];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTimeStr(maxMinutes: number): string {
  const mins = randomBetween(0, maxMinutes);
  const secs = randomBetween(0, 59);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function generateSnapshot(timestamp: Date): VicidialSnapshot {
  const agentsLoggedIn = randomBetween(18, 26);
  const agentsInCalls = randomBetween(12, Math.min(agentsLoggedIn, 22));
  const agentsWaiting = randomBetween(0, 3);
  const agentsPaused = randomBetween(1, 3);
  const agentsDispo = agentsLoggedIn - agentsInCalls - agentsWaiting - agentsPaused;
  const activeCalls = randomBetween(agentsInCalls, agentsInCalls + 8);
  const waitingCalls = randomBetween(0, 7);

  const waitingCallsList: WaitingCall[] = Array.from({ length: waitingCalls }, () => ({
    status: "LIVE",
    campaign: "axxonaep3one_ingoup",
    phone: `${randomBetween(200, 999)}${randomBetween(1000000, 9999999)}`,
    server: "138.201.250.23",
    wait: `0:${randomBetween(1, 30).toString().padStart(2, "0")}`,
    type: "IN",
    priority: "98",
  }));

  const agents: AgentRecord[] = AGENT_NAMES.slice(0, agentsLoggedIn).map((name, i) => {
    const status = STATUSES[i % STATUSES.length];
    return {
      station: `SIP/8${String(i + 10).padStart(3, "0")}`,
      user: name,
      session: `860005${randomBetween(1, 9)}`,
      status,
      time: generateTimeStr(status === "INCALL I" ? 25 : 5),
      campaign: "002",
      group: status === "INCALL I" ? GROUPS[i % GROUPS.length] : "",
    };
  });

  return {
    timestamp: timestamp.toISOString(),
    data: {
      timestamp: timestamp.toISOString(),
      summary: {
        activeCalls: Math.max(0, activeCalls),
        ringingCalls: randomBetween(0, 1),
        waitingCalls,
        ivrCalls: 0,
        agentsLoggedIn,
        agentsInCalls: Math.max(0, agentsInCalls),
        agentsWaiting: Math.max(0, agentsWaiting),
        agentsPaused: Math.max(0, agentsPaused),
        agentsDead: 0,
        agentsDispo: Math.max(0, agentsDispo),
      },
      details: {
        waitingCalls: waitingCallsList,
        agents,
      },
      meta: {
        dialLevel: "",
        dialableLeads: 0,
        callsToday: randomBetween(100, 600),
        droppedAnswered: "RELOAD NOW",
        avgAgents: agentsLoggedIn,
        dialMethod: "SUMMARY",
      },
    },
  };
}

// Generate shift data: 6:45 PM to 6:00 AM next day, one snapshot every ~15 seconds
export function generateShiftData(): VicidialSnapshot[] {
  const now = new Date();
  const shiftStart = new Date(now);
  shiftStart.setHours(18, 45, 0, 0);
  if (shiftStart > now) {
    shiftStart.setDate(shiftStart.getDate() - 1);
  }

  const snapshots: VicidialSnapshot[] = [];
  const intervalMs = 15000; // 15 seconds
  const current = new Date(shiftStart);
  const shiftEnd = new Date(shiftStart);
  shiftEnd.setDate(shiftEnd.getDate() + 1);
  shiftEnd.setHours(6, 0, 0, 0);

  const endTime = now < shiftEnd ? now : shiftEnd;

  while (current <= endTime) {
    snapshots.push(generateSnapshot(new Date(current)));
    current.setTime(current.getTime() + intervalMs);
  }

  return snapshots;
}

// Get the latest snapshot
export function getLatestSnapshot(): VicidialSnapshot {
  return generateSnapshot(new Date());
}

// Aggregate data for time window (returns array of summaries at ~1min intervals)
export function getAggregatedData(snapshots: VicidialSnapshot[], windowMinutes: number): VicidialSnapshot[] {
  if (snapshots.length === 0) return [];
  
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMinutes * 60 * 1000);
  
  const filtered = snapshots.filter(s => new Date(s.timestamp) >= cutoff);
  
  // Downsample to ~1 per minute for charts
  const sampled: VicidialSnapshot[] = [];
  let lastTime = 0;
  for (const s of filtered) {
    const t = new Date(s.timestamp).getTime();
    if (t - lastTime >= 60000 || lastTime === 0) {
      sampled.push(s);
      lastTime = t;
    }
  }
  
  return sampled;
}
