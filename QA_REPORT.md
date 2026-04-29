# QA Report — Yael Siso Interior Design Management App
**Date:** 2026-04-25
**Tester:** Automated QA (Claude)
**Supabase Project:** ztbckbcwefnjpwgrdwkl

---

## DATA STATE

| Table | Rows | Notes |
|-------|------|-------|
| clients | 1 | "Talya" |
| projects | 1 | "Project Talya", active |
| tasks | 55 | All linked to single project, all status=pending |
| proposals | 1 | Status=approved |
| proposal_items | 58 | All linked to single proposal |
| contents | 586 | Scope template catalog (phases/tasks/subtasks) |
| suppliers | 1 | "Yossi Mizrachi" (Hebrew name in DB) |
| supplier_payments | 1 | 80,000 NIS, pending, linked to supplier |
| payments | 0 | Empty (client billing) |
| billing_clients | 0 | Empty |
| work_log | 0 | Empty |
| knowledge | 0 | Empty |
| project_contacts | 0 | Empty (exists, used by Projects page) |
| project_rates | **DOES NOT EXIST** | Referenced by FinanceDashboard |
| project_expenses | **DOES NOT EXIST** | Referenced by FinanceDashboard |

**Actual projects table columns:** `id, client_id, proposal_id, name, status, start_date, end_date, created_at`

---

## BUGS FOUND (Critical — will crash or fail silently)

### BUG-1: FinanceDashboard queries non-existent tables `project_rates` and `project_expenses`
**File:** `src/pages/FinanceDashboard.jsx` (lines ~155-165)
**Impact:** When expanding any project card, the `loadData()` function queries `project_rates` and `project_expenses` tables that DO NOT EXIST in the database. Supabase will return errors. The code does not handle the error — it will silently fail and show incorrect/empty data.
**Severity:** HIGH

### BUG-2: FinanceDashboard references non-existent columns on `projects` table
**File:** `src/pages/FinanceDashboard.jsx`
**Impact:** The code reads `project.project_price`, `project.profit_target_pct`, `project.adi_pct` — NONE of these columns exist on the `projects` table. The select query `select('id, name, status, project_price, profit_target_pct, adi_pct')` will fail with a Supabase error. The entire Finance Dashboard page will not load.
**Severity:** CRITICAL — entire page broken

### BUG-3: FinanceDashboard tries to UPDATE `projects.project_price` — column doesn't exist
**File:** `src/pages/FinanceDashboard.jsx` line ~186
**Impact:** `savePrice()` calls `supabase.from('projects').update({ project_price: ... })` which will fail.
**Severity:** HIGH

### BUG-4: MonthlyReport references non-existent columns on `projects` table
**File:** `src/pages/MonthlyReport.jsx`
**Impact:** The select query includes `client_name`, `client_email`, `budget` — none of these columns exist on the `projects` table. The query `select('id,name,client_name,client_email,budget,status')` will fail. Projects dropdown will be empty.
**Severity:** CRITICAL — entire page broken

### BUG-5: Home (Dashboard) queries `billing_clients` instead of `payments`
**File:** `src/pages/Home.jsx` line ~22
**Impact:** Dashboard queries `billing_clients` for billing KPIs. While this table exists, it is EMPTY and is NOT the table that Billing.jsx writes to (that one is `payments`). The "Pending Billing" KPI will always show 0 regardless of actual billing data.
**Severity:** HIGH — misleading dashboard data

### BUG-6: Home (Dashboard) uses `Math.random()` for progress bars
**File:** `src/pages/Home.jsx` line ~125
**Impact:** Project progress bars show `Math.random() * 60 + 20`% — completely random fake data. Progress changes on every re-render.
**Severity:** MEDIUM — displays fake/misleading data

### BUG-7: Login page is not integrated — no auth guard
**File:** `src/App.jsx`, `src/pages/Dashboard.jsx`
**Impact:** The Login.jsx component exists and has working Supabase auth code, but `App.jsx` routes directly to `Dashboard` with no authentication check. Anyone can access the app without logging in. The Login page is never shown.
**Severity:** HIGH — no authentication

---

## ISSUES (Works but has problems)

### ISSUE-1: Knowledge search uses `.includes()` instead of case-insensitive search
**File:** `src/pages/Knowledge.jsx` line ~37
**Impact:** Searching "materials" won't find "Materials". Same issue exists in Clients.jsx search.
**Severity:** LOW

### ISSUE-2: Knowledge articles cannot be edited, only deleted
**File:** `src/pages/Knowledge.jsx`
**Impact:** No edit functionality — user must delete and recreate to fix a typo.
**Severity:** LOW

### ISSUE-3: Clients page search is not case-insensitive
**File:** `src/pages/Clients.jsx` line ~391
**Impact:** `c.name.includes(search)` — searching "talya" won't find "Talya".
**Severity:** LOW

### ISSUE-4: Delete client has no cascade protection
**File:** `src/pages/Clients.jsx` line ~335
**Impact:** Deleting a client does not check or warn about associated proposals, projects, or tasks. If the database has foreign key constraints, the delete will fail silently. If no constraints, orphaned records remain.
**Severity:** MEDIUM

### ISSUE-5: Contents "Import Template" deletes ALL data destructively
**File:** `src/pages/Contents.jsx` lines ~40-70
**Impact:** Import deletes all contents first, but `proposal_items` reference content IDs. After import, all existing proposal_items will have broken `content_id` references (orphaned foreign keys).
**Severity:** HIGH

### ISSUE-6: Billing page `payments` table has no `pct` or `paid_at` columns verified
**File:** `src/pages/Billing.jsx`
**Impact:** The code writes `pct` and `paid_at` to the `payments` table. If these columns don't exist, inserts/updates will fail silently. The table exists but is empty so we cannot verify column schema.
**Severity:** MEDIUM — needs verification

### ISSUE-7: MonthlyReport does NOT filter tasks by month
**File:** `src/pages/MonthlyReport.jsx` lines ~44-55
**Impact:** The code computes `from` and `to` date variables but NEVER uses them in the query. It fetches ALL tasks for the project regardless of selected month. The "monthly" report is actually a full project report.
**Severity:** MEDIUM — misleading feature

### ISSUE-8: Supplier category stored in Hebrew ("renovation contractor" in Hebrew) but categories list is in English
**File:** `src/pages/Suppliers.jsx` + DB
**Impact:** Existing supplier has category "renovation contractor" (Hebrew) but the CATEGORIES constant is all English. The filter chips won't match — the existing supplier falls through to a separate Hebrew category button.
**Severity:** LOW — cosmetic/filter mismatch

### ISSUE-9: No confirmation before deleting work log entries
**File:** `src/pages/WorkLog.jsx` line ~58
**Impact:** `remove()` deletes immediately with no confirmation dialog.
**Severity:** LOW

### ISSUE-10: Export button says "Export Excel" but exports CSV
**File:** `src/pages/Billing.jsx`
**Impact:** Button text is misleading.
**Severity:** LOW — cosmetic

---

## MISSING FEATURES

### MISSING-1: No authentication/authorization
Login page exists but is not wired into routing. No session management, no role-based access.

### MISSING-2: No file/document upload or management
Interior design projects need photo uploads, floor plans, mood boards, material samples. No file storage integration exists.

### MISSING-3: No budget tracking per project
The `projects` table has no `budget`, `project_price`, or financial columns. FinanceDashboard tries to use them but they don't exist.

### MISSING-4: No client portal / client-facing views
Clients cannot view their project status, approve documents, or sign off on milestones. Only the public work log exists.

### MISSING-5: No notification system
Bell icon in header is non-functional. No email notifications, no alerts for overdue tasks or payments.

### MISSING-6: No calendar/scheduling view
No calendar integration for site visits, client meetings, or deadlines.

### MISSING-7: No invoice/receipt generation
Billing tracks payments but cannot generate actual invoices or receipts.

### MISSING-8: No project timeline dependencies
Tasks have `dependency_task_id` column but no UI to set or enforce dependencies. Gantt chart exists but is display-only.

### MISSING-9: No multi-user support
Hardcoded "Yael Siso" in sidebar. No user management, no team member accounts, no task assignment to team members.

### MISSING-10: No project duplication/template
Cannot create a new project from a previous one as template.

### MISSING-11: No mobile responsive design
Sidebar is fixed 240px. No mobile menu/hamburger. App will be difficult to use on phones.

### MISSING-12: No project notes/activity log
No audit trail of changes, no activity feed showing who did what.

### MISSING-13: No settings page
Settings gear icon in header is non-functional. No way to configure business details, email templates, tax rates, etc.

### MISSING-14: No data backup/export
No way to export all project data. Only individual CSV exports from billing pages.

### MISSING-15: No supplier rating/review system
Cannot track supplier quality, reliability, or past project performance.

---

## SUMMARY

| Category | Count |
|----------|-------|
| Critical Bugs (page won't load) | 2 (FinanceDashboard, MonthlyReport) |
| High Bugs (wrong data/broken feature) | 4 |
| Medium Bugs | 1 |
| Issues | 10 |
| Missing Features | 15 |

### Priority Fix Order:
1. **FinanceDashboard** — Add missing columns (`project_price`, `profit_target_pct`, `adi_pct`) to `projects` table, create `project_rates` and `project_expenses` tables
2. **MonthlyReport** — Add `client_name`, `client_email` columns to `projects` table (or join through `clients` via `client_id`)
3. **Home Dashboard** — Fix billing query to use `payments` table instead of `billing_clients`; replace `Math.random()` progress with real calculation
4. **Authentication** — Wire Login.jsx into App.jsx with auth guard
5. **Contents Import** — Add cascade handling or prevent import when proposals reference contents
