# Phase 4: Production Hardening & QA Remediation

**Goal:** Address all critical and high-priority issues identified in the QA review to make the application secure, reliable, and production-ready.

---

### Part 1: Immediate Security Remediation (Critical Priority)

-   [ ] **Environment Variables:**
    -   [ ] Move the `JWT_SECRET` from `authRoutes.js` to a secure environment variable.
    -   [ ] Create a `.env.example` file to document required variables.
-   [ ] **Authentication:**
    -   [ ] Remove the hardcoded default admin credentials from the database seeding process.
    -   [ ] Implement a "force password change on first login" mechanism for default accounts.
-   [ ] **SQL Injection:**
    -   [ ] Review all database queries and ensure 100% are parameterized, especially in `summary.js` and `agentRoutes.js`.
-   [ ] **API Response Standardization:**
    -   [ ] Enforce a single, consistent error response format (`{ success: false, error: '...' }`) across all backend endpoints.

---

### Part 2: High Priority Fixes & Performance

-   [ ] **Database Performance:**
    -   [ ] Create a new SQL script to add indexes to the `agent_log` table for `campaign`, `user_group`, and `timestamp`.
    -   [ ] Execute the indexing script on the database.
-   [ ] **API Security:**
    -   [ ] Implement rate limiting on authentication endpoints (`/api/auth/login`) to prevent brute-force attacks.
-   [ ] **Frontend Reliability:**
    -   [ ] Wrap key components in React Error Boundaries to prevent UI crashes from unexpected data or errors.
-   [ ] **Functionality Fixes:**
    -   [ ] Correct the broken query in the summary routes (the one referencing `vicidial_log`).
    -   [ ] Fix the login endpoint to return the standardized response format.
    -   [ ] Add proper 401/403 error handling to the token verification middleware.
    -   [ ] Correct the column name mismatch for filtering (`agent_group` vs `group`).
-   [ ] **Database Connection Management:**
    -   [ ] Implement connection pooling to handle concurrent requests more efficiently.

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
