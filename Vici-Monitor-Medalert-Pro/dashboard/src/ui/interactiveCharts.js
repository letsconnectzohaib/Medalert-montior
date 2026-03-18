import { el } from "../ui/dom.js";

export function renderInteractiveDrilldown(container, data, options = {}) {
  const {
    title = "Interactive Analytics",
    width = 1000,
    height = 500,
    drilldownLevels = ["hour", "agent", "campaign"]
  } = options;

  const containerDiv = el("div", { class: "interactive-drilldown" }, [
    el("div", { class: "drilldown-header" }, [
      el("h3", {}, [title]),
      el("div", { class: "breadcrumb" }, [
        el("span", { class: "breadcrumb-item active" }, ["Overview"])
      ])
    ]),
    el("div", { class: "drilldown-content" }, [
      renderOverviewLevel(data),
      el("div", { id: "drilldown-details", class: "drilldown-details" }, [])
    ])
  ]);

  container.innerHTML = "";
  container.appendChild(containerDiv);

  // Add click handlers for drilldown
  setupDrilldownHandlers(data, drilldownLevels);
}

function renderOverviewLevel(data) {
  const summaryCards = [
    {
      title: "Total Calls",
      value: data.totalCalls || 0,
      change: data.callsChange || 0,
      icon: "📞"
    },
    {
      title: "Avg Wait Time", 
      value: `${(data.avgWaitTime || 0).toFixed(1)}s`,
      change: data.waitTimeChange || 0,
      icon: "⏱️"
    },
    {
      title: "Agent Efficiency",
      value: `${(data.agentEfficiency || 0).toFixed(1)}%`,
      change: data.efficiencyChange || 0,
      icon: "👥"
    },
    {
      title: "Peak Hour",
      value: data.peakHour || "N/A",
      change: null,
      icon: "🔥"
    }
  ];

  return el("div", { class: "overview-cards" }, 
    summaryCards.map(card => renderSummaryCard(card))
  );
}

function renderSummaryCard(card) {
  const changeClass = card.change > 0 ? "positive" : card.change < 0 ? "negative" : "";
  const changeIcon = card.change > 0 ? "📈" : card.change < 0 ? "📉" : "";
  const changeText = card.change !== null ? `${changeIcon} ${Math.abs(card.change).toFixed(1)}%` : "";

  return el("div", { 
    class: `summary-card ${changeClass}`,
    "data-drilldown": card.title.toLowerCase().replace(/\s+/g, '-')
  }, [
    el("div", { class: "card-icon" }, [card.icon]),
    el("div", { class: "card-content" }, [
      el("div", { class: "card-title" }, [card.title]),
      el("div", { class: "card-value" }, [String(card.value)]),
      el("div", { class: "card-change" }, [changeText])
    ])
  ]);
}

function setupDrilldownHandlers(data, drilldownLevels) {
  const cards = document.querySelectorAll('.summary-card[data-drilldown]');
  const detailsContainer = document.getElementById('drilldown-details');
  const breadcrumb = document.querySelector('.breadcrumb');

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const drilldownType = card.dataset.drilldown;
      
      // Update breadcrumb
      breadcrumb.innerHTML = `
        <span class="breadcrumb-item" onclick="renderOverviewLevel(data)">Overview</span>
        <span class="breadcrumb-separator">›</span>
        <span class="breadcrumb-item active">${drilldownType}</span>
      `;

      // Render drilldown details
      renderDrilldownDetails(drilldownType, data, detailsContainer);
    });
  });
}

function renderDrilldownDetails(type, data, container) {
  let content = [];

  switch(type) {
    case 'total-calls':
      content = renderCallsDrilldown(data);
      break;
    case 'avg-wait-time':
      content = renderWaitTimeDrilldown(data);
      break;
    case 'agent-efficiency':
      content = renderAgentEfficiencyDrilldown(data);
      break;
    case 'peak-hour':
      content = renderPeakHourDrilldown(data);
      break;
    default:
      content = [el("p", {}, ["Select a metric to drill down further"])];
  }

  container.innerHTML = "";
  content.forEach(item => container.appendChild(item));
}

function renderCallsDrilldown(data) {
  const hourlyData = data.hourlyBreakdown || [];
  const chart = el("div", { class: "drilldown-chart" }, [
    el("h4", {}, ["Hourly Call Distribution"]),
    el("div", { class: "bar-chart" }, 
      hourlyData.map(hour => 
        el("div", { 
          class: "bar-item",
          style: `height: ${(hour.calls / Math.max(...hourlyData.map(h => h.calls))) * 200}px`
        }, [
          el("div", { class: "bar-label" }, [`${hour.hour}:00`]),
          el("div", { class: "bar-value" }, [String(hour.calls)])
        ])
      )
    )
  ]);

  return [chart];
}

function renderWaitTimeDrilldown(data) {
  const waitTimeData = data.waitTimeBreakdown || [];
  const table = el("table", { class: "drilldown-table" }, [
    el("thead", {}, [
      el("tr", {}, [
        el("th", {}, ["Time Period"]),
        el("th", {}, ["Avg Wait"]),
        el("th", {}, ["Max Wait"]),
        el("th", {}, ["Calls"])
      ])
    ]),
    el("tbody", {},
      waitTimeData.map(period => 
        el("tr", {}, [
          el("td", {}, [period.period]),
          el("td", {}, [`${period.avgWait.toFixed(1)}s`]),
          el("td", {}, [`${period.maxWait}s`]),
          el("td", {}, [String(period.calls)])
        ])
      )
    )
  ]);

  return [el("h4", {}, ["Wait Time Analysis"]), table];
}

function renderAgentEfficiencyDrilldown(data) {
  const agentData = data.agentBreakdown || [];
  const sortedAgents = agentData.sort((a, b) => b.efficiency - a.efficiency);

  const list = el("div", { class: "agent-list" }, [
    el("h4", {}, ["Agent Performance Ranking"]),
    ...sortedAgents.map((agent, index) => 
      el("div", { 
        class: `agent-item ${index < 3 ? 'top-performer' : ''}`
      }, [
        el("div", { class: "agent-rank" }, [`#${index + 1}`]),
        el("div", { class: "agent-name" }, [agent.name]),
        el("div", { class: "agent-efficiency" }, [`${agent.efficiency.toFixed(1)}%`]),
        el("div", { class: "agent-calls" }, [`${agent.calls} calls`])
      ])
    )
  ]);

  return [list];
}

function renderPeakHourDrilldown(data) {
  const peakData = data.peakHourAnalysis || {};
  
  const analysis = el("div", { class: "peak-analysis" }, [
    el("h4", {}, ["Peak Hour Analysis"]),
    el("div", { class: "peak-stats" }, [
      el("div", { class: "stat-item" }, [
        el("label", {}, ["Most Consistent Peak Hour"]),
        el("value", {}, [`${peakData.consistentPeak || 'N/A'}`])
      ]),
      el("div", { class: "stat-item" }, [
        el("label", {}, ["Confidence Level"]),
        el("value", {}, [`${(peakData.confidence || 0).toFixed(1)}%`])
      ]),
      el("div", { class: "stat-item" }, [
        el("label", {}, ["Days Analyzed"]),
        el("value", {}, [String(peakData.daysAnalyzed || 0)])
      ])
    ])
  ]);

  return [analysis];
}
