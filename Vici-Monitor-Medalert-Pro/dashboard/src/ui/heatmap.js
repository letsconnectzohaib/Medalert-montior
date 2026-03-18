import { el } from "../ui/dom.js";

export function renderHeatmap(container, data, options = {}) {
  const {
    title = "Activity Heatmap",
    width = 800,
    height = 400,
    cellSize = 20,
    colors = {
      low: "#1e40af",
      medium: "#3b82f6", 
      high: "#ef4444"
    }
  } = options;

  const maxValue = Math.max(...data.flat().map(d => d.value || 0));
  
  const svg = el("svg", {
    width: String(width),
    height: String(height),
    class: "heatmap-chart"
  }, []);

  // Title
  svg.appendChild(el("text", {
    x: String(width / 2),
    y: "20",
    "text-anchor": "middle",
    class: "chart-title"
  }, [title]));

  // Create heatmap grid
  data.forEach((row, y) => {
    row.forEach((cell, x) => {
      const intensity = (cell.value || 0) / maxValue;
      let color = colors.low;
      
      if (intensity > 0.3) color = colors.medium;
      if (intensity > 0.7) color = colors.high;

      const rect = el("rect", {
        x: String(50 + x * cellSize),
        y: String(50 + y * cellSize),
        width: String(cellSize - 2),
        height: String(cellSize - 2),
        fill: color,
        rx: "2",
        "data-value": String(cell.value || 0),
        "data-hour": String(x),
        "data-day": String(y)
      });

      // Tooltip
      const title = el("title", {}, [
        `${cell.label || `Hour ${x}, Day ${y}`}: ${cell.value || 0}`
      ]);
      rect.appendChild(title);

      svg.appendChild(rect);
    });
  });

  // Legend
  const legendY = height - 30;
  ["Low", "Medium", "High"].forEach((label, i) => {
    const color = [colors.low, colors.medium, colors.high][i];
    svg.appendChild(el("rect", {
      x: String(50 + i * 80),
      y: String(legendY),
      width: "15",
      height: "15",
      fill: color,
      rx: "2"
    }));
    svg.appendChild(el("text", {
      x: String(70 + i * 80),
      y: String(legendY + 12),
      "font-size": "12",
      fill: "#9ca3af"
    }, [label]));
  });

  container.innerHTML = "";
  container.appendChild(svg);
}

export function generateHourlyHeatmapData(callflowData, shiftHours) {
  // Create 7 days x 24 hours heatmap
  const data = [];
  
  for (let day = 0; day < 7; day++) {
    const row = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourData = callflowData.find(d => d.hour === hour);
      const value = hourData ? (hourData.calls_waiting_max || 0) : 0;
      row.push({
        value,
        label: `${hour}:00 - Day ${day + 1}`
      });
    }
    data.push(row);
  }
  
  return data;
}
