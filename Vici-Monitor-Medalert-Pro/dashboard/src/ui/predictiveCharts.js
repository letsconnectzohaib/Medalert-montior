import { el } from "../ui/dom.js";

export function renderPredictiveDashboard(container, data, options = {}) {
  const {
    title = "Predictive Analytics Dashboard",
    width = 1200,
    height = 600
  } = options;

  const dashboard = el("div", { class: "predictive-dashboard" }, [
    el("div", { class: "dashboard-header" }, [
      el("h2", {}, [title]),
      el("div", { class: "time-selector" }, [
        el("label", {}, ["Forecast Period:"]),
        el("select", { id: "forecast-period" }, [
          el("option", { value: "2h" }, ["Next 2 Hours"]),
          el("option", { value: "4h" }, ["Next 4 Hours"]),
          el("option", { value: "8h" }, ["Next 8 Hours"]),
          el("option", { value: "24h" }, ["Next 24 Hours"])
        ])
      ])
    ]),
    el("div", { class: "dashboard-grid" }, [
      renderForecastSection(data.forecast || {}),
      renderStaffingOptimization(data.staffing || {}),
      renderWaitTimePrediction(data.waitTime || {}),
      renderConfidenceBands(data.confidence || {})
    ])
  ]);

  container.innerHTML = "";
  container.appendChild(dashboard);

  // Setup interactivity
  setupForecastInteractivity();
}

function renderForecastSection(forecastData) {
  return el("div", { class: "forecast-section card" }, [
    el("h3", { class: "section-title" }, ["📈 Call Volume Forecast"]),
    el("div", { class: "forecast-chart" }, [
      renderForecastChart(forecastData.hourly || []),
      el("div", { class: "forecast-summary" }, [
        el("div", { class: "summary-item" }, [
          el("label", {}, ["Expected Volume"]),
          el("value", {}, [String(forecastData.expectedTotal || 0)])
        ]),
        el("div", { class: "summary-item" }, [
          el("label", {}, ["Confidence"]),
          el("value", {}, [`${(forecastData.confidence || 0).toFixed(1)}%`])
        ])
      ])
    ])
  ]);
}

function renderStaffingOptimization(staffingData) {
  return el("div", { class: "staffing-section card" }, [
    el("h3", { class: "section-title" }, ["👥 Staffing Optimization"]),
    el("div", { class: "staffing-recommendations" }, [
      el("div", { class: "recommendation-header" }, [
        el("span", {}, ["Current: "]),
        el("span", { class: "current-staff" }, [String(staffingData.currentAgents || 0)]),
        el("span", {}, ["→ Recommended: "]),
        el("span", { class: "recommended-staff" }, [String(staffingData.recommendedAgents || 0)])
      ]),
      el("div", { class: "optimization-details" }, [
        el("div", { class: "detail-item" }, [
          el("label", {}, ["Cost Impact"]),
          el("value", { class: staffingData.costImpact > 0 ? "positive" : "negative" }, 
            [`${staffingData.costImpact > 0 ? '+' : ''}$${Math.abs(staffingData.costImpact || 0).toFixed(2)}/hr`])
        ]),
        el("div", { class: "detail-item" }, [
          el("label", {}, ["Service Level"]),
          el("value", {}, [`${(staffingData.serviceLevel || 0).toFixed(1)}%`])
        ]),
        el("div", { class: "detail-item" }, [
          el("label", {}, ["Efficiency Gain"]),
          el("value", {}, [`${(staffingData.efficiencyGain || 0).toFixed(1)}%`])
        ])
      ])
    ])
  ]);
}

function renderWaitTimePrediction(waitData) {
  return el("div", { class: "wait-time-section card" }, [
    el("h3", { class: "section-title" }, ["⏱️ Wait Time Prediction"]),
    el("div", { class: "wait-time-chart" }, [
      renderWaitTimeChart(waitData.predictions || []),
      el("div", { class: "wait-alerts" }, [
        ...waitData.alerts?.map(alert => 
          el("div", { 
            class: `wait-alert ${alert.severity.toLowerCase()}` 
          }, [
            el("div", { class: "alert-time" }, [alert.time]),
            el("div", { class: "alert-message" }, [alert.message])
          ])
        ) || []
      ])
    ])
  ]);
}

function renderConfidenceBands(confidenceData) {
  return el("div", { class: "confidence-section card" }, [
    el("h3", { class: "section-title" }, ["📊 Prediction Confidence"]),
    el("div", { class: "confidence-chart" }, [
      renderConfidenceChart(confidenceData.bands || [])
    ])
  ]);
}

function renderForecastChart(hourlyData) {
  const maxValue = Math.max(...hourlyData.map(h => h.predicted || 0));
  const chartHeight = 200;
  const barWidth = Math.min(40, 800 / hourlyData.length);

  return el("div", { class: "bar-chart-container" }, [
    ...hourlyData.map((hour, index) => {
      const height = (hour.predicted / maxValue) * chartHeight;
      const confidence = hour.confidence || 0;
      const confidenceColor = confidence > 0.8 ? "#10b981" : confidence > 0.6 ? "#f59e0b" : "#ef4444";

      return el("div", { 
        class: "forecast-bar",
        style: `height: ${height}px; width: ${barWidth}px`
      }, [
        el("div", { 
          class: "bar-fill",
          style: `height: ${height}px; background: ${confidenceColor}`
        }),
        el("div", { class: "bar-label" }, [`${hour.hour}:00`]),
        el("div", { class: "bar-value" }, [String(hour.predicted)]),
        el("div", { class: "bar-confidence" }, [`${(confidence * 100).toFixed(0)}%`])
      ]);
    })
  ]);
}

function renderWaitTimeChart(predictions) {
  const maxWait = Math.max(...predictions.map(p => p.predictedWait || 0));
  const chartHeight = 150;
  const pointSpacing = 800 / predictions.length;

  return el("div", { class: "line-chart-container" }, [
    el("svg", { 
      width: "800", 
      height: chartHeight + 40,
      class: "wait-time-svg"
    }, [
      // Grid lines
      ...Array.from({ length: 4 }, (_, i) => 
        el("line", {
          x1: "0",
          y1: String(i * chartHeight / 3 + 20),
          x2: "800",
          y2: String(i * chartHeight / 3 + 20),
          stroke: "#374151",
          "stroke-dasharray": "2,2"
        })
      ),
      // Wait time line
      el("polyline", {
        points: predictions.map((p, i) => 
          `${i * pointSpacing},${chartHeight - (p.predictedWait / maxWait) * chartHeight + 20}`
        ).join(" "),
        fill: "none",
        stroke: "#60a5fa",
        "stroke-width": "3"
      }),
      // Data points
      ...predictions.map((p, i) => 
        el("circle", {
          cx: String(i * pointSpacing),
          cy: String(chartHeight - (p.predictedWait / maxWait) * chartHeight + 20),
          r: "4",
          fill: "#60a5fa",
          stroke: "#1f2937"
        })
      )
    ])
  ]);
}

function renderConfidenceChart(bands) {
  const maxConfidence = Math.max(...bands.map(b => b.upper || 0));
  const chartHeight = 120;

  return el("div", { class: "confidence-bands" }, [
    ...bands.map((band, index) => {
      const lowerHeight = (band.lower / maxConfidence) * chartHeight;
      const upperHeight = (band.upper / maxConfidence) * chartHeight;
      const midHeight = (band.predicted / maxConfidence) * chartHeight;

      return el("div", { 
        class: "confidence-band",
        style: `margin-bottom: 10px`
      }, [
        el("div", { class: "band-label" }, [band.period]),
        el("div", { class: "band-visualization" }, [
          el("div", { 
            class: "band-area lower",
            style: `height: ${lowerHeight}px`
          }),
          el("div", { 
            class: "band-area predicted",
            style: `height: ${midHeight - lowerHeight}px`
          }),
          el("div", { 
            class: "band-area upper",
            style: `height: ${upperHeight - midHeight}px`
          })
        ]),
        el("div", { class: "band-values" }, [
          el("span", { class: "value-range" }, 
            [`${band.lower?.toFixed(1)} - ${band.upper?.toFixed(1)}`]
          ),
          el("span", { class: "confidence-level" }, 
            [`${(band.confidence * 100).toFixed(0)}% confidence`]
          )
        ])
      ]);
    })
  ]);
}

function setupForecastInteractivity() {
  const periodSelector = document.getElementById('forecast-period');
  if (periodSelector) {
    periodSelector.addEventListener('change', (e) => {
      // Trigger forecast recalculation for selected period
      const period = e.target.value;
      console.log(`Forecast period changed to: ${period}`);
      // Here you would call an API to get new forecast data
    });
  }
}
