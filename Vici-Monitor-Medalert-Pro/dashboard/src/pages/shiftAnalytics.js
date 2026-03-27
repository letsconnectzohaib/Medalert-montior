import { fetchShiftIntelligence, fetchShiftCallflow } from "../apiClient.js";
import { el } from "../ui/dom.js";
import { renderIntelIntoDom, renderHourlyIntoDom, renderDebugIntoDom } from "./shiftAnalyticsRender.js";

function buildMsg(data, callflow) {
  const peak = data?.peakHour;
  const w = data?.shiftWindow;
  const peakText = peak
    ? `Peak hour: ${peak.hour}:00 (total agents ${peak.total_agents})`
    : "No peak hour yet.";
  const windowText = w ? `Shift window: ${w.start} → ${w.end}` : "";
  const peakWait = callflow?.peak?.waiting;
  const peakWaitText = peakWait
    ? `Peak waiting: ${peakWait.hour}:00 (max waiting ${peakWait.calls_waiting_max})`
    : "";
  return [windowText, peakText, peakWaitText].filter(Boolean).join(" • ");
}

export function renderShiftAnalytics(state) {
  const wrap = el("section", { class: "card wide enhanced-analytics" }, [
    el("div", { class: "analytics-header" }, [
      el("div", { class: "header-title" }, ["📊 Shift Performance Analytics"]),
      el("div", { class: "header-subtitle" }, ["Comprehensive shift analysis with real-time insights"]),
    ]),
    el("div", { class: "analytics-grid" }, [
      el("div", { class: "control-panel" }, [
        el("div", { class: "panel-title" }, ["📋 Controls"]),
        el("div", { class: "form-group" }, [
          el("label", { class: "form-label" }, ["📅 Shift Date"]),
          el("input", {
            id: "shiftDate",
            type: "date",
            class: "form-input",
            value: new Date().toISOString().slice(0, 10),
          }),
        ]),
        el("div", { class: "button-group" }, [
          el(
            "button",
            {
              class: "btn primary enhanced-btn",
              onclick: async () => {
                const date = document.getElementById("shiftDate").value;
                const [r, c] = await Promise.all([
                  fetchShiftIntelligence(state.baseUrl, state.token, date),
                  fetchShiftCallflow(state.baseUrl, state.token, date),
                ]);
                const msg = document.getElementById("shiftMsg");
                if (!r.success || !c.success) {
                  msg.textContent = !r.success
                    ? r.error || "Failed to load shift summary."
                    : c.error || "Failed to load callflow.";
                  renderHourlyIntoDom(null);
                  return;
                }
                // Cache data and render enhanced analytics
                state.shiftIntelCache = {
                  date,
                  data: r.data,
                  callflow: c.data,
                };
                renderIntelIntoDom(r.data, c.data);
                msg.textContent = buildMsg(r.data, c.data);
                renderHourlyIntoDom(r.data);
                renderDebugIntoDom(r.data);
                
                // Show success animation
                msg.classList.add("success");
                setTimeout(() => msg.classList.remove("success"), 3000);
              },
            },
            ["🚀 Load Enhanced Analytics"],
          ),
          el(
            "button",
            {
              class: "btn secondary",
              onclick: () => {
                const date = document.getElementById("shiftDate").value;
                // Export functionality
                exportAnalytics(date);
              },
            },
            ["📥 Export"],
          ),
        ]),
      ]),
      el("div", { class: "info-panel" }, [
        el("div", { class: "panel-title" }, ["ℹ️ Analytics Overview"]),
        el("div", { class: "info-grid" }, [
          el("div", { class: "info-item" }, [
            el("div", { class: "info-icon" }, ["📊"]),
            el("div", { class: "info-content" }, [
              el("div", { class: "info-title" }, ["Real-Time Data"]),
              el("div", { class: "info-desc" }, ["Live performance metrics updated continuously"]),
            ]),
          ]),
          el("div", { class: "info-item" }, [
            el("div", { class: "info-icon" }, ["📈"]),
            el("div", { class: "info-content" }, [
              el("div", { class: "info-title" }, ["Trend Analysis"]),
              el("div", { class: "info-desc" }, ["Hourly patterns and performance trends"]),
            ]),
          ]),
          el("div", { class: "info-item" }, [
            el("div", { class: "info-icon" }, ["🎯"]),
            el("div", { class: "info-content" }, [
              el("div", { class: "info-title" }, ["Peak Performance"]),
              el("div", { class: "info-desc" }, ["Identify optimal operational hours"]),
            ]),
          ]),
        ]),
      ]),
    ]),
    el("div", { id: "shiftMsg", class: "analytics-message" }, [""]),
    el("div", { class: "analytics-content" }, [
      el("div", { id: "shiftIntel", class: "shift-intel enhanced" }, [""]),
      el("div", { id: "shiftHourly", class: "hourly-table enhanced" }, [
        el("div", { class: "loading-placeholder" }, [
          el("div", { class: "loading-spinner" }, [""]),
          el("div", { class: "loading-text" }, ["Load a shift to see detailed hourly analytics…"]),
        ]),
      ]),
      el("div", { id: "shiftDebug", class: "debug-panel enhanced" }, [""]),
    ]),
  ]);

  // Enhanced styling
  const style = el("style", {}, [`
    .enhanced-analytics {
      background: linear-gradient(135deg, var(--panel) 0%, var(--card) 100%);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .analytics-header {
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      color: white;
      padding: 24px;
      text-align: center;
      margin: -20px -20px 20px -20px;
    }
    
    .header-title {
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    
    .header-subtitle {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .analytics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    
    .control-panel, .info-panel {
      background: var(--panel);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid var(--border);
    }
    
    .panel-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .form-input {
      width: 100%;
      padding: 12px;
      border: 2px solid var(--border);
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.3s ease;
    }
    
    .form-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .button-group {
      display: flex;
      gap: 12px;
    }
    
    .enhanced-btn {
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    
    .enhanced-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
    }
    
    .info-grid {
      display: grid;
      gap: 16px;
    }
    
    .info-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--card);
      border-radius: 8px;
      border: 1px solid var(--border);
      transition: all 0.3s ease;
    }
    
    .info-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    .info-icon {
      font-size: 24px;
    }
    
    .info-title {
      font-weight: 600;
      color: var(--text);
      margin-bottom: 4px;
    }
    
    .info-desc {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.4;
    }
    
    .analytics-message {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    
    .analytics-message.success {
      background: var(--success-bg);
      border-color: var(--success);
      color: var(--success);
    }
    
    .shift-intel.enhanced, .hourly-table.enhanced, .debug-panel.enhanced {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .loading-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: var(--muted);
    }
    
    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border);
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .loading-text {
      font-size: 14px;
      text-align: center;
    }
    
    @media (max-width: 768px) {
      .analytics-grid {
        grid-template-columns: 1fr;
      }
      .button-group {
        flex-direction: column;
      }
    }
  `]);
  wrap.appendChild(style);

  // Export function
  function exportAnalytics(date) {
    const data = {
      date: date,
      timestamp: new Date().toISOString(),
      cache: state.shiftIntelCache
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shift-analytics-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // If we already loaded a summary, render it immediately.
  if (state.shiftIntelCache?.data?.success) {
    const { data, callflow } = state.shiftIntelCache;
    setTimeout(() => {
      const msg = document.getElementById("shiftMsg");
      if (!msg) return;
      renderIntelIntoDom(data, callflow);
      msg.textContent = buildMsg(data, callflow);
      renderHourlyIntoDom(data);
      renderDebugIntoDom(data);
    }, 0);
  }

  return wrap;
}
