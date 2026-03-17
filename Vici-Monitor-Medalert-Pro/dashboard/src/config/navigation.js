export const PAGE_GROUPS = [
  {
    id: "general",
    label: "General",
    icon: "🏠",
    description: "Daily operations and monitoring",
    pages: [
      {
        id: "overview",
        label: "Overview",
        shortLabel: "Overview",
        icon: "📊",
        description: "Live operations, KPIs, and realtime status",
      },
      {
        id: "shift",
        label: "Shift Analytics",
        shortLabel: "Shift",
        icon: "🕒",
        description: "Shift-level trends, buckets, and comparisons",
      },
      {
        id: "reports",
        label: "Reports",
        shortLabel: "Reports",
        icon: "🧾",
        description: "Generate, export, and store shift reports",
      },
      {
        id: "alerts",
        label: "Alerts",
        shortLabel: "Alerts",
        icon: "🚨",
        description: "Operational alerts, anomalies, and follow-up",
      },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    icon: "🧠",
    description: "Analysis, forecasting, and recommendations",
    pages: [
      {
        id: "intelligence",
        label: "Intelligence Hub",
        shortLabel: "Hub",
        icon: "✨",
        description: "Roadmap intelligence, forecasts, and insights",
      },
    ],
    sections: [
      {
        id: "foundation",
        label: "Foundation",
        icon: "🧱",
        description: "Core intelligence baseline",
      },
      {
        id: "patterns",
        label: "Patterns",
        icon: "🔎",
        description: "Transitions, campaign signals, and behavior",
      },
      {
        id: "prediction",
        label: "Prediction",
        icon: "🔮",
        description: "Forecasting, staffing, and wait-time outlook",
      },
      {
        id: "risk",
        label: "Risk & Alerts",
        icon: "⚠️",
        description: "Queue risk, anomalies, and break intelligence",
      },
      {
        id: "automation",
        label: "Recommendations",
        icon: "💡",
        description: "Narratives, recommendations, and smart actions",
      },
      {
        id: "advanced",
        label: "Advanced",
        icon: "📈",
        description: "Scoring, trend dashboard, and deeper analytics",
      },
    ],
  },
  {
    id: "config",
    label: "Config",
    icon: "⚙️",
    description: "System setup and administration",
    pages: [
      {
        id: "settings",
        label: "Settings",
        shortLabel: "Settings",
        icon: "🛠️",
        description: "Shift timing, retention, alerts, and integrations",
      },
      {
        id: "advanced",
        label: "Advanced DB",
        shortLabel: "Advanced",
        icon: "🗄️",
        description: "Database explorer and maintenance tools",
      },
    ],
  },
];

export const PAGE_INDEX = PAGE_GROUPS.flatMap((group) =>
  (group.pages || []).map((page) => ({
    ...page,
    groupId: group.id,
    groupLabel: group.label,
    groupIcon: group.icon,
  })),
);

export const PAGE_META = PAGE_INDEX.reduce((acc, page) => {
  acc[page.id] = page;
  return acc;
}, {});

export function getPageMeta(pageId) {
  return PAGE_META[pageId] || null;
}

export function getPageGroup(pageId) {
  return PAGE_GROUPS.find((group) =>
    (group.pages || []).some((page) => page.id === pageId),
  ) || null;
}

export function getIntelligenceSections() {
  const group = PAGE_GROUPS.find((item) => item.id === "intelligence");
  return group?.sections || [];
}

export function isKnownPage(pageId) {
  return !!PAGE_META[pageId];
}

export function getDefaultPage() {
  return "overview";
}
