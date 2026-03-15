# Vici-Monitor Dashboard Overhaul Plan

This document outlines the systematic plan to transform the Vici-Monitor dashboard from a production-ready, fully-featured application.

---

### Phase 1: Backend Restructuring & Authentication

**Goal:** Establish a robust, secure backend foundation and implement a complete user authentication system.

- [x] **Database:** Create a new `users` table in the SQLite database to store user credentials.
- [x] **Backend (Dashboard Server):** Create a new, organized server structure within the dashboard project.
    - [x] Create dedicated route files (e.g., `authRoutes.js`, `proxyRoutes.js`).
    - [x] Implement a secure login endpoint (`/api/auth/login`).
    - [x] Implement session management (e.g., using JWT or sessions) to protect routes.
- [x] **Frontend (Dashboard):**
    - [x] Create a professional `LoginPage.tsx` component.
    - [x] Remove all hardcoded data and integrate the login page with the backend auth endpoint.
    - [x] Implement protected routing to redirect unauthenticated users to the login page.
- [x] **Cleanup:** Remove all mock data related to users and authentication.

---

### Phase 2: Real-Time Monitor Enhancement

**Goal:** Convert the static real-time view into a dynamic, filterable, and genuinely live monitoring tool.

- [x] **Analysis:** Critically evaluate the current `RealTime.tsx` page for UI/UX weaknesses.
- [x] **Backend (Database Server):**
    - [x] Create a new endpoint in `agentRoutes.js` to fetch real-time agent status.
    - [x] Enhance the endpoint to support filtering by `campaign` and `group`.
    - [x] Optimize the query for frequent polling.
- [x] **Backend (Dashboard Server):** Create a new proxy route to securely access the new real-time endpoint.
- [x] **Frontend (Dashboard):**
    - [x] Redesign the `RealTime.tsx` component.
    - [x] Implement UI filter controls (dropdowns for campaign, group).
    - [x] Implement logic for frequent data polling to simulate live updates.
    - [x] Add visual indicators for agent status (e.g., colored dots).
    - [x] Remove all related mock data.

---

### Phase 3: Agent Performance Deep Dive

**Goal:** Transform the agent performance section into a powerful analytical tool for individual performance review.

- [x] **Analysis:** Review the existing `AgentPerformance.tsx` page.
- [x] **Backend (Database Server):**
    - [x] Create a new endpoint to fetch aggregated agent performance data over a specified date range.
    - [x] Create a new endpoint to fetch a detailed daily breakdown for a single agent (for drill-down view).
- [x] **Backend (Dashboard Server):** Create proxy routes for the new performance endpoints.
- [x] **Frontend (Dashboard):**
    - [x] Implement a date range picker for performance analysis.
    - [x] Implement a "Drill-Down" feature (e.g., clicking an agent's name navigates to a new details page).
    - [x] Create a new `AgentDetailsPage.tsx` to visualize the single-agent breakdown.
    - [x] Remove all related mock data.

---

### Phase 4: Advanced Analytics Refinement

**Goal:** Enhance the already advanced `ShiftSummary` page with granular filtering capabilities.

- [ ] **Analysis:** Review the `ShiftSummary.tsx` page for new opportunities. The core views are strong, but lack filtering.
- [ ] **Backend (Database Server):**
    - [ ] Update all `summaryRoutes.js` endpoints (`analytical-breakdown`, `historical-trends`, `heatmap-data`) to accept optional filtering parameters (e.g., `campaign`, `group`).
- [ ] **Backend (Dashboard Server):** Update the proxy routes (`summary.ts`, `trends.ts`, `heatmap.ts`) to pass through the new filter parameters.
- [ ] **Frontend (Dashboard):**
    - [ ] Add filter dropdowns to the `ShiftSummary.tsx` page.
    - [ ] Pass the selected filter values to the backend when fetching data for all views (Hourly, Comparison, Trends, Heatmap).
    - [ ] Ensure the UI clearly indicates when a filter is active.

---
