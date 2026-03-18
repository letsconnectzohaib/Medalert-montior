import { el } from "../ui/dom.js";

export function renderAdvancedTimeSeries(container, data, options = {}) {
  const {
    title = "Time Series Analysis",
    width = 900,
    height = 400,
    metrics = ["calls_waiting_max", "active_calls_max"],
    colors = ["#60a5fa", "#34d399", "#f59e0b", "#ef4444"],
    showConfidence = true
  } = options;

  const padding = { top: 40, right: 80, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const svg = el("svg", {
    width: String(width),
    height: String(height),
    class: "time-series-chart"
  }, []);

  // Title
  svg.appendChild(el("text", {
    x: String(width / 2),
    y: "25",
    "text-anchor": "middle",
    class: "chart-title"
  }, [title]));

  // Create scales
  const timeRange = data.length > 0 ? [
    new Date(data[0].timestamp),
    new Date(data[data.length - 1].timestamp)
  ] : [new Date(), new Date()];
  
  const valueExtent = metrics.flatMap(metric => 
    data.map(d => d[metric] || 0)
  );
  const maxValue = Math.max(...valueExtent, 1);

  const xScale = (timestamp) => {
    const x = ((timestamp - timeRange[0]) / (timeRange[1] - timeRange[0])) * chartWidth;
    return padding.left + Math.max(0, Math.min(chartWidth, x));
  };

  const yScale = (value) => {
    return height - padding.bottom - (value / maxValue) * chartHeight;
  };

  // Grid lines
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    svg.appendChild(el("line", {
      x1: String(padding.left),
      y1: String(y),
      x2: String(width - padding.right),
      y2: String(y),
      stroke: "#374151",
      "stroke-dasharray": "2,2"
    }));
    
    // Y-axis labels
    const value = Math.round(maxValue * (1 - i / 5));
    svg.appendChild(el("text", {
      x: String(padding.left - 10),
      y: String(y + 5),
      "text-anchor": "end",
      "font-size": "12",
      fill: "#9ca3af"
    }, [String(value)]));
  }

  // Render metrics
  metrics.forEach((metric, metricIndex) => {
    const color = colors[metricIndex % colors.length];
    const points = data.map(d => {
      const x = xScale(new Date(d.timestamp));
      const y = yScale(d[metric] || 0);
      return `${x},${y}`;
    }).join(" ");

    // Main line
    svg.appendChild(el("polyline", {
      points: points,
      fill: "none",
      stroke: color,
      "stroke-width": "2.5"
    }));

    // Data points
    data.forEach(d => {
      const x = xScale(new Date(d.timestamp));
      const y = yScale(d[metric] || 0);
      
      svg.appendChild(el("circle", {
        cx: String(x),
        cy: String(y),
        r: "4",
        fill: color,
        stroke: "#1f2937",
        "stroke-width": "2"
      }));

      // Tooltip
      const tooltip = el("title", {}, [
        `${metric}: ${d[metric] || 0}\nTime: ${new Date(d.timestamp).toLocaleString()}`
      ]);
      svg.appendChild(tooltip);
    });

    // Confidence bands (if enabled)
    if (showConfidence && d[`${metric}_upper`] && d[`${metric}_lower`]) {
      const upperPoints = data.map(d => {
        const x = xScale(new Date(d.timestamp));
        const y = yScale(d[`${metric}_upper`] || 0);
        return `${x},${y}`;
      }).join(" ");

      const lowerPoints = data.map(d => {
        const x = xScale(new Date(d.timestamp));
        const y = yScale(d[`${metric}_lower`] || 0);
        return `${x},${y}`;
      }).join(" ");

      // Confidence area
      const areaPath = `M ${upperPoints} L ${lowerPoints.split(' ').reverse().join(' L')} Z`;
      svg.appendChild(el("path", {
        d: areaPath,
        fill: color,
        opacity: "0.2"
      }));
    }
  });

  // X-axis time labels
  const timeLabels = data.filter((_, i) => i % Math.ceil(data.length / 8) === 0);
  timeLabels.forEach(d => {
    const x = xScale(new Date(d.timestamp));
    svg.appendChild(el("text", {
      x: String(x),
      y: String(height - padding.bottom + 20),
      "text-anchor": "middle",
      "font-size": "11",
      fill: "#9ca3af"
    }, [new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })]));
  });

  // Legend
  const legendY = height - 20;
  metrics.forEach((metric, i) => {
    const color = colors[i % colors.length];
    svg.appendChild(el("rect", {
      x: String(padding.left + i * 120),
      y: String(legendY),
      width: "12",
      height: "12",
      fill: color,
      rx: "2"
    }));
    svg.appendChild(el("text", {
      x: String(padding.left + i * 120 + 18),
      y: String(legendY + 10),
      "font-size": "12",
      fill: "#9ca3af"
    }, [metric.replace(/_/g, ' ')]));
  });

  container.innerHTML = "";
  container.appendChild(svg);
}

export function renderCorrelationMatrix(container, data, options = {}) {
  const {
    title = "Metric Correlations",
    width = 500,
    height = 500,
    metrics = []
  } = options;

  const cellSize = Math.min(width, height) / (metrics.length + 1);
  const svg = el("svg", {
    width: String(width),
    height: String(height),
    class: "correlation-matrix"
  }, []);

  // Title
  svg.appendChild(el("text", {
    x: String(width / 2),
    y: "25",
    "text-anchor": "middle",
    class: "chart-title"
  }, [title]));

  // Calculate correlation matrix
  const correlations = [];
  for (let i = 0; i < metrics.length; i++) {
    correlations[i] = [];
    for (let j = 0; j < metrics.length; j++) {
      const correlation = calculateCorrelation(
        data.map(d => d[metrics[i]]),
        data.map(d => d[metrics[j]])
      );
      correlations[i][j] = correlation;
    }
  }

  // Render matrix
  const maxValue = 1;
  metrics.forEach((metric1, i) => {
    metrics.forEach((metric2, j) => {
      const correlation = correlations[i][j];
      const intensity = Math.abs(correlation);
      const color = correlation > 0 ? "#34d399" : "#ef4444";
      const opacity = 0.2 + (intensity / maxValue) * 0.8;

      const x = 50 + j * cellSize;
      const y = 50 + i * cellSize;

      const rect = el("rect", {
        x: String(x),
        y: String(y),
        width: String(cellSize - 2),
        height: String(cellSize - 2),
        fill: color,
        opacity: String(opacity),
        rx: "2"
      });

      const tooltip = el("title", {}, [
        `${metric1} vs ${metric2}: ${correlation.toFixed(3)}`
      ]);
      rect.appendChild(tooltip);
      svg.appendChild(rect);
    });

    // Row labels
    svg.appendChild(el("text", {
      x: String(45),
      y: String(50 + i * cellSize + cellSize / 2),
      "text-anchor": "end",
      "font-size": "11",
      fill: "#9ca3af"
    }, [metric1.replace(/_/g, ' ')]));
  });

  // Column labels
  metrics.forEach((metric, j) => {
    svg.appendChild(el("text", {
      x: String(50 + j * cellSize + cellSize / 2),
      y: String(45),
      "text-anchor": "middle",
      "font-size": "11",
      fill: "#9ca3af"
    }, [metric2.replace(/_/g, ' ')]));
  });

  container.innerHTML = "";
  container.appendChild(svg);
}

function calculateCorrelation(x, y) {
  const n = x.length;
  if (n === 0) return 0;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumXX = x.reduce((a, b) => a + b * b, 0);
  const sumYY = y.reduce((a, b) => a + b * b, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}
