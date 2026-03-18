import { el } from "../ui/dom.js";

export function timelineChart(series, shiftHours) {
  const width = 760;
  const height = 180;
  const pad = 28;
  const barW = Math.max(
    14,
    Math.floor((width - pad * 2) / Math.max(1, shiftHours.length)) - 6,
  );

  const palette = [
    { key: "oncall_gt_5m", label: "purple", color: "#8b5cf6" },
    { key: "oncall_gt_1m", label: "violet", color: "#a78bfa" },
    { key: "waiting_gt_1m", label: "blue", color: "#60a5fa" },
    { key: "in_call", label: "in-call", color: "#34d399" },
    { key: "ready", label: "ready", color: "#fbbf24" },
    { key: "unknown", label: "unknown", color: "#9ca3af" },
  ];

  const maxTotal = Math.max(
    1,
    ...shiftHours.map((h) => {
      const row = series?.[h] || {};
      return Object.values(row).reduce((a, b) => a + Number(b || 0), 0);
    }),
  );

  const svg = el(
    "svg",
    {
      class: "shiftChart",
      width: String(width),
      height: String(height),
      viewBox: `0 0 ${width} ${height}`,
    },
    [],
  );

  // Axes baseline
  svg.appendChild(
    el("line", {
      x1: pad,
      y1: height - pad,
      x2: width - pad,
      y2: height - pad,
      stroke: "#2a3550",
      "stroke-width": "1",
    }),
  );

  shiftHours.forEach((h, i) => {
    const row = series?.[h] || {};
    const total = Object.values(row).reduce((a, b) => a + Number(b || 0), 0);
    let y = height - pad;
    const x = pad + i * (barW + 6);
    const barH = Math.round(((height - pad * 2) * total) / maxTotal);

    // background bar
    svg.appendChild(
      el("rect", {
        x: String(x),
        y: String(height - pad - barH),
        width: String(barW),
        height: String(barH),
        fill: "#111827",
        opacity: "0.35",
        rx: "3",
      }),
    );

    let used = 0;
    for (const p of palette) {
      const v = Number(row[p.key] || 0);
      if (!v) continue;
      const seg = Math.max(1, Math.round((barH * v) / Math.max(1, total)));
      used += seg;
      const segH = used > barH ? seg - (used - barH) : seg;
      if (segH <= 0) continue;
      y -= segH;
      svg.appendChild(
        el("rect", {
          x: String(x),
          y: String(y),
          width: String(barW),
          height: String(segH),
          fill: p.color,
          rx: "3",
        }),
      );
    }

    // hour label (every bar)
    svg.appendChild(
      el(
        "text",
        {
          x: String(x + barW / 2),
          y: String(height - 10),
          fill: "#9ca3af",
          "font-size": "10",
          "text-anchor": "middle",
        },
        [String(h)],
      ),
    );

    // tooltip via title
    const title = el("title", {}, [`${String(h).padStart(2, "0")}:00 total=${total}`]);
    svg.appendChild(title);
  });

  // Legend
  let lx = pad;
  const ly = 14;
  for (const p of palette.slice(0, 5)) {
    svg.appendChild(
      el("rect", {
        x: String(lx),
        y: String(ly),
        width: "10",
        height: "10",
        fill: p.color,
        rx: "2",
      }),
    );
    svg.appendChild(
      el(
        "text",
        { x: String(lx + 14), y: String(ly + 9), fill: "#cbd5e1", "font-size": "11" },
        [p.label],
      ),
    );
    lx += 90;
  }

  return svg;
}

export function callflowChart(callflow) {
  const rows = callflow?.series || [];
  const shiftHours = callflow?.shiftHours || [];
  if (!rows.length || !shiftHours.length) return null;

  const width = 760;
  const height = 200;
  const pad = 28;

  const maxY = Math.max(
    1,
    ...rows.map((r) =>
      Math.max(
        Number(r.active_calls_max || 0),
        Number(r.calls_waiting_max || 0),
      ),
    ),
  );

  const svg = el(
    "svg",
    {
      class: "shiftChart",
      width: String(width),
      height: String(height),
      viewBox: `0 0 ${width} ${height}`,
    },
    [],
  );
  svg.appendChild(
    el("line", {
      x1: pad,
      y1: height - pad,
      x2: width - pad,
      y2: height - pad,
      stroke: "#2a3550",
      "stroke-width": "1",
    }),
  );

  const xForHour = (h) => {
    const idx = shiftHours.indexOf(Number(h));
    const n = Math.max(1, shiftHours.length - 1);
    return pad + ((width - pad * 2) * idx) / n;
  };
  const yFor = (v) =>
    height - pad - ((height - pad * 2) * Number(v || 0)) / maxY;

  const pointsActive = rows
    .map((r) => `${xForHour(r.hour)},${yFor(r.active_calls_max)}`)
    .join(" ");
  const pointsWait = rows
    .map((r) => `${xForHour(r.hour)},${yFor(r.calls_waiting_max)}`)
    .join(" ");

  svg.appendChild(
    el("polyline", {
      points: pointsActive,
      fill: "none",
      stroke: "#34d399",
      "stroke-width": "2",
    }),
  );
  svg.appendChild(
    el("polyline", {
      points: pointsWait,
      fill: "none",
      stroke: "#60a5fa",
      "stroke-width": "2",
    }),
  );

  // Legend
  svg.appendChild(
    el("rect", {
      x: String(pad),
      y: "10",
      width: "10",
      height: "10",
      fill: "#34d399",
      rx: "2",
    }),
  );
  svg.appendChild(
    el(
      "text",
      { x: String(pad + 14), y: "19", fill: "#cbd5e1", "font-size": "11" },
      ["active (max)"],
    ),
  );
  svg.appendChild(
    el("rect", {
      x: String(pad + 120),
      y: "10",
      width: "10",
      height: "10",
      fill: "#60a5fa",
      rx: "2",
    }),
  );
  svg.appendChild(
    el(
      "text",
      { x: String(pad + 134), y: "19", fill: "#cbd5e1", "font-size": "11" },
      ["waiting (max)"],
    ),
  );

  // Hour labels
  shiftHours.forEach((h) => {
    const x = xForHour(h);
    svg.appendChild(
      el(
        "text",
        {
          x: String(x),
          y: String(height - 10),
          fill: "#9ca3af",
          "font-size": "10",
          "text-anchor": "middle",
        },
        [String(h)],
      ),
    );
  });

  return svg;
}
