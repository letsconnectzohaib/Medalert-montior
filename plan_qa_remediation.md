# Phase 4: Production Hardening & QA Remediation

**Goal:** Address all critical and high-priority issues identified in the QA review to make the application secure, reliable, and production-ready.

---

### Part 1: Immediate Security Remediation (Critical Priority)

-   [x] **Environment Variables:**
    -   [x] Move the `JWT_SECRET` from `authRoutes.js` to a secure environment variable.
    -   [x] Create a `.env.example` file to document required variables.
-   [x] **Authentication:**
    -   [x] Remove the hardcoded default admin credentials from the database seeding process.
    -   [ ] Implement a "force password change on first login" mechanism for default accounts.
-   [x] **SQL Injection:**
    -   [x] Review all database queries and ensure 100% are parameterized, especially in `summary.js` and `agentRoutes.js`.
-   [x] **API Response Standardization:**
    -   [x] Enforce a single, consistent error response format (`{ success: false, error: '...' }`) across all backend endpoints.

---

### Part 2: High Priority Fixes & Performance

-   [x] **Database Performance:**
    -   [x] Create a new SQL script to add indexes to the `agent_log` table for `campaign`, `user_group`, and `timestamp`.
    -   [x] Execute the indexing script on the database.
-   [x] **API Security:**
    -   [x] Implement rate limiting on authentication endpoints (`/api/auth/login`) to prevent brute-force attacks.
-   [x] **Frontend Reliability:**
    -   [x] Wrap key components in React Error Boundaries to prevent UI crashes from unexpected data or errors.
-   [x] **Functionality Fixes:**
    -   [x] Correct the broken query in the summary routes (the one referencing `vicidial_log`).
    -   [x] Fix the login endpoint to return the standardized response format.
    -   [x] Add proper 401/403 error handling to the token verification middleware.
    -   [x] Correct the column name mismatch for filtering (`agent_group` vs `group`).
-   [x] **Database Connection Management:**
    -   [x] Implement connection pooling to handle concurrent requests more efficiently.

---

### Part 3: Medium Priority Enhancements

-   [ ] **Observability:**
    -   [ ] Add request/response logging middleware to the backend for better debugging.
    -   [ ] Implement a simple `/api/health` health check endpoint.
-   [ ] **Development & Maintenance:**
    -   [ ] Add basic unit tests for critical functions like authentication and data validation.
    -   [ ] Begin documenting the API endpoints (e.g., using Swagger/OpenAPI).
-   [ ] **Frontend Optimization:**
    -   [ ] Optimize the real-time polling strategy (e.g., consider WebSockets or at least conditional polling).
    -   [ ] Add debouncing to filter inputs to reduce unnecessary API calls.
