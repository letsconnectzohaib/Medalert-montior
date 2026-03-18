# Dashboard Remastered — Implementation Plan

## Why Remaster?

The existing `dashboard/` is vanilla JS with no build step, dark-only, emoji icons, and SVG charts drawn by hand with DOM calls. The remaster upgrades it to a proper React app with a professional light/dark design system, real chart library, and accessible UI components — while keeping 100% of the existing backend API + WebSocket contract.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Build | **Vite 6** | Zero-config, instant HMR, ESM native |
| UI framework | **React 18** | Component model, hooks, context |
| Styling | **Tailwind CSS v3** | Utility-first, `darkMode: class`, CSS vars |
| Icons | **Lucide React** | Crisp 24px SVG icons — replaces emoji in nav |
| Charts | **Recharts 2** | Responsive, composable, works great with React |
| Accessible primitives | **@radix-ui** (tabs, switch, select, tooltip, separator) | Keyboard + screen-reader accessible |
| Theme toggle | **next-themes** | `ThemeProvider` + `useTheme`, persists to localStorage |
| Class utilities | **clsx + tailwind-merge** | `cn()` helper for conditional classes |

---

## Design System

### Light Theme (default)
- **Background**: `#F8FAFC` (slate-50)
- **Card surface**: `#FFFFFF` white
- **Primary text**: `#0F172A` (slate-900)
- **Secondary text**: `#475569` (slate-600)
- **Muted text**: `#94A3B8` (slate-400)
- **Border**: `#E2E8F0` (slate-200)
- **Primary action**: `#2563EB` (blue-600)
- **Sidebar**: `#FFFFFF` with subtle right border

### Dark Theme
- **Background**: `#080C12` (matches existing)
- **Card surface**: `#0D1117`
- **Primary text**: `#E4ECFF`
- **Border**: `rgba(255,255,255,0.07)`
- **Primary action**: `#4C8DFF`
- **Sidebar**: `#0A0E17`

### Status Colors
- **Good/Connected**: `hsl(142 71% 45%)` — green
- **Warning**: `hsl(37 92% 50%)` — amber
- **Bad/Error**: `hsl(0 84% 60%)` — red

### Component Style Rules
- Cards: `rounded-xl border bg-card shadow-sm`
- Buttons: rounded-lg, transition hover, active scale
- Inputs: rounded-md border, focus ring matches primary
- Tables: sticky `<thead>`, hover rows, scrollable wrapper
- Badges: pill shape, colored bg + text per severity

---

## Folder Structure

```
dashboard-remastered/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
└── src/
    ├── main.jsx                   Entry point
    ├── App.jsx                    ThemeProvider + AppProvider + routing
    ├── index.css                  CSS variables (light+dark) + Tailwind directives
    ├── lib/
    │   ├── utils.js               cn() helper
    │   ├── api.js                 All gateway API calls (ported from apiClient.js)
    │   └── storage.js             localStorage helpers (ported from storage.js)
    ├── config/
    │   └── navigation.js          PAGE_GROUPS with Lucide icon components
    ├── context/
    │   └── AppContext.jsx          Global state: WS, auth, snapshots, toasts, beep
    └── components/
        ├── layout/
        │   ├── Shell.jsx           2-column layout (sidebar + content)
        │   ├── Sidebar.jsx         Nav groups, footer, status badges
        │   ├── ThemeToggle.jsx     Sun/Moon icon button
        │   └── Toast.jsx           Toast notification stack
        ├── ui/
        │   ├── Button.jsx
        │   ├── Card.jsx
        │   ├── Badge.jsx
        │   ├── Input.jsx
        │   ├── Label.jsx
        │   ├── NativeSelect.jsx
        │   ├── Switch.jsx          (Radix Switch)
        │   ├── Tabs.jsx            (Radix Tabs)
        │   ├── Separator.jsx
        │   └── Skeleton.jsx
        ├── charts/
        │   ├── SparklineChart.jsx  Recharts AreaChart for Overview trends
        │   ├── ShiftBarChart.jsx   Stacked bar chart for hourly agent buckets
        │   └── ShiftLineChart.jsx  Dual-line chart for callflow (active + waiting)
        └── pages/
            ├── Login.jsx
            ├── Overview.jsx        KPI grid + meta + trends + agent buckets
            ├── ShiftAnalytics.jsx  Date picker + stat cards + charts + hourly table
            ├── Reports.jsx         Generate/store/download reports
            ├── Alerts.jsx          Filters + alert table + ack/resolve actions
            ├── AdvancedDB.jsx      Table explorer + filter + schema + rows
            ├── Intelligence/
            │   ├── index.jsx       Date picker + stat bar + section assembly
            │   ├── FoundationSection.jsx
            │   ├── PatternSection.jsx
            │   ├── PredictionSection.jsx
            │   ├── RiskSection.jsx
            │   ├── NarrativeSection.jsx
            │   └── AdvancedSection.jsx
            └── Settings/
                ├── index.jsx       Tabs shell + load/save buttons
                ├── PanelGateway.jsx
                ├── PanelShift.jsx
                ├── PanelRetention.jsx
                ├── PanelAlerts.jsx
                └── PanelSlack.jsx
```

---

## Ported Logic (1:1 mapping)

| Original | Remastered |
|---|---|
| `src/appShell.js` createApp() | `AppContext.jsx` + `App.jsx` |
| `src/app/runtime.js` | `AppContext.jsx` hooks |
| `src/apiClient.js` | `src/lib/api.js` |
| `src/storage.js` | `src/lib/storage.js` |
| `src/config/navigation.js` | `src/config/navigation.js` (Lucide icons) |
| `src/ui/shell.js` | `components/layout/Shell.jsx` + `Sidebar.jsx` |
| `src/pages/overview.js` | `components/pages/Overview.jsx` |
| `src/pages/shiftAnalytics*.js` | `components/pages/ShiftAnalytics.jsx` + chart components |
| `src/pages/reports.js` | `components/pages/Reports.jsx` |
| `src/pages/alerts.js` | `components/pages/Alerts.jsx` |
| `src/pages/intelligence*.js` | `components/pages/Intelligence/` |
| `src/pages/settings/*.js` | `components/pages/Settings/` |
| `src/pages/advancedDb.js` | `components/pages/AdvancedDB.jsx` |

---

## Key Architecture Decisions

### AppContext state shape
```js
{
  page: 'overview',
  token: null,
  user: null,
  baseUrl: 'http://localhost:3100',
  wsStatus: 'disconnected', // 'connecting' | 'connected' | 'unauthorized'
  latestSnapshot: null,
  recentPoints: [],          // ring buffer, max 90
  adminSettingsCache: null,
  shiftIntelCache: null,
  settingsTab: 'gateway',
}
```

### Hash-based routing
`App.jsx` reads `window.location.hash` → renders the matching page component. `setPage()` in context calls `history.replaceState` and updates state.

### WS connection
Connects on login, auto-reconnects after 1500ms on close. Sends `{ type: 'subscribe', token }` on open. Handles `snapshot`, `alert`, and `error: unauthorized` messages.

### Theme persistence
`next-themes` stores `'light'` or `'dark'` in `localStorage` key `theme`. Default is `'light'`.

---

## How to Run

```bash
cd Vici-Monitor-Medalert-Pro/dashboard-remastered
npm install
npm run dev
# Open http://localhost:5173
# Gateway must be running on port 3100
```

---

## What's Better vs Original

| Feature | Original | Remastered |
|---|---|---|
| Theme | Dark only | Light (default) + Dark toggle |
| Icons | Emoji strings | Lucide React SVG |
| Charts | Hand-drawn SVG DOM | Recharts (responsive, animated) |
| Build | None (raw `<script>`) | Vite (HMR, tree-shaking) |
| Components | Manual `el()` factory | React JSX components |
| Accessibility | Minimal | Radix UI primitives |
| Typography | Fixed 13px | Inter, responsive scale |
| Color system | Hardcoded hex vars | CSS variable tokens |
| State mgmt | Module-level mutable objects | React context + useState |
| Settings save | `buildPatchFromDom()` querySelectorAll | Controlled React form state |
