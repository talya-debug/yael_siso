# Stitch Prompt — Yael Siso Interior Design Management System

## General Instructions

Design a complete, modern, premium web application UI for an **interior design studio management system**. The interface is **fully in English (LTR — left-to-right)**. The design should feel like a high-end SaaS product — clean, elegant, and luxurious — fitting for an interior designer who values aesthetics.

## Design Language & Style

- **Light mode** — white/off-white main content area (#FAFAFA or #F8F9FC)
- **Dark sidebar** — deep navy/charcoal (#1E293B or #1A1F2E) on the LEFT side (LTR layout)
- **Accent color**: Muted gold/bronze (#B8860B or #C9A96E) OR deep teal (#2D6A6F) — something that conveys luxury + order + style
- **Cards**: White with subtle shadows (`shadow-sm`), rounded corners (12-16px), thin borders (#F0F0F0)
- **Typography**: Clean, modern, good hierarchy — large bold headings, medium subheadings, small secondary text in gray
- **Status badges**: Soft colored pills — green for active/complete, amber for pending, red for overdue, gray for inactive
- **Buttons**: Primary = accent color filled, Secondary = outlined, minimal rounded
- **Charts/Graphs**: Use the accent color palette with complementary shades
- **Spacing**: Generous whitespace, breathing room between elements
- **Icons**: Lucide-style line icons, thin stroke
- **Overall feel**: Like Monday.com meets a luxury brand — organized but beautiful

## Layout Structure

Every screen shares the same shell:
- **Sidebar (RIGHT side, ~240px)**: Dark background, logo at top, 11 navigation items with icons, studio name at bottom
- **Main content area (RIGHT)**: Light background, scrollable, with page title and content

### Sidebar Navigation Items (top to bottom):
1. Dashboard — grid icon
2. Clients — users icon
3. Projects — folder icon
4. Scope Templates — boxes icon
5. Client Billing — wallet icon
6. Supplier Billing — receipt icon
7. Supplier Directory — book-user icon
8. Monthly Report — chart icon
9. Finance Dashboard — bar-chart icon
10. Work Log — calendar icon
11. Knowledge Base — book icon

Active item = highlighted with accent color background or left border indicator

---

## SCREEN 1: Dashboard (Home)

Top section — Welcome message: "Welcome, Yael" with date

**4 KPI Cards in a row:**
- Total Clients — number + small trend arrow
- Active Projects — number + progress ring
- Pending Billing — amount in ₪ + warning indicator
- Completed Tasks — ratio like "45/60" + percentage bar

**Below KPIs, 2 columns:**

Left column — "Recent Projects":
- Table/cards showing 4-5 projects with: project name, client name, status badge (active/completed/on hold), progress bar, last updated date

Right column — "Upcoming Tasks":
- List of 5 tasks with: task name, project name, due date, priority indicator (colored dot), status

Optional: Small chart showing "Project Statistics" — bar chart of tasks by status this week

---

## SCREEN 2: Clients

**Top bar**: Search input + "New Client" button

**Client cards grid (3 per row)**:
Each card shows:
- Client name (large, bold)
- Phone, email, address
- Proposal status badge (draft/sent/approved)
- Number of active projects
- Action buttons: Approve project, Edit, Delete
- Created date

**New Client Modal (2 steps)**:
- Step 1: Contact details form (name, phone, email, address, notes)
- Step 2: Select scope items from template (checkbox tree of phases → tasks)

---

## SCREEN 3: Projects

**Top bar**: Project selector dropdown + view toggle (Kanban / Gantt / List)

**Project header card**:
- Project name, client name, budget (₪), status, start date, progress percentage ring

**Main view — Gantt Timeline**:
- Horizontal timeline with phases as swim lanes
- Tasks as colored bars showing duration
- Today marker line
- Drag-able task bars

**Alternative view — Kanban columns by phase**:
- Each column = project phase
- Cards inside = tasks with status, assignee avatar, priority dot, estimated days

**Task detail side panel (slides from left)**:
- Task name (editable)
- Status dropdown, Priority selector
- Estimated days, Actual days
- Subtasks checklist
- Notes/logs section
- Attached files

---

## SCREEN 4: Scope Templates

**Top bar**: "Import Default Template" button + Expand/Collapse all

**Hierarchical tree view**:
- **Phase** — large row, collapsible, with task count badge
  - **Task** — medium row, indented, with subtask count
    - **Subtask** — small row, further indented

Each row shows: name, estimated days, notes preview, edit/delete icons

Add buttons at each level: "+ New Phase", "+ New Task", "+ New Subtask"

---

## SCREEN 5: Client Billing

**Top bar**: Project filter dropdown + "Add Payment" button

**Billing summary cards**:
- Total contract amount (₪)
- Total paid (₪) — green
- Remaining (₪) — amber
- Percentage collected — circular progress

**Payment milestones table**:
| Milestone | % | Amount | Status | Date | Notes |
- Template rows: 30% advance, 20% approval, 30% progress, 20% completion
- Status badges: pending/sent/paid/overdue
- Each row has edit/delete actions

**"Download CSV"** button at bottom

---

## SCREEN 6: Supplier Billing

Similar layout to Client Billing but for outgoing payments to suppliers:

**Table columns**: Supplier name, Project, Amount, Commission %, Payment status, Date, Notes
- Filter by project and supplier
- Add payment button
- Status: pending/paid

---

## SCREEN 7: Supplier Directory

**Top bar**: Search + Category filter dropdown + "New Supplier" button

**Category chips/tabs**: Contractors, Electricians, Plumbers, Carpenters, AC, Painters, Drywall, Tilers, Furniture, Lighting

**Supplier cards grid**:
Each card:
- Supplier name, category badge
- Phone, email, website
- Address
- Commission % indicator
- Edit/Delete buttons

---

## SCREEN 8: Monthly Report

**Top bar**: Project selector + Month/Year picker

**Report content**:
- Project progress summary (tasks completed vs total)
- Phase-by-phase breakdown with progress bars
- Supplier payments summary (paid vs pending)
- "Email Report" button
- Attachment section for invoices/proofs

---

## SCREEN 9: Finance Dashboard

**KPI cards row**:
- Total budget across projects
- Total spent
- Remaining budget
- Cost per hour average

**Charts section**:
- Bar chart: Budget vs Spent per project
- Pie chart: Cost breakdown by category (workers, suppliers, materials)

**Worker rates table**:
- Worker name, Role, Hourly rate (₪), Project, Total hours, Total cost

---

## SCREEN 10: Work Log

**Top bar**: Date range picker + Project filter + Role filter + "New Entry" button

**Log table**:
| Date | Project | Role | Worker | Hours | Description |

**Roles**: Project Manager, Designer, CAD Drafter, Other

**Summary cards at top**: Total hours this month by role (4 small cards)

**"Share Public Link"** button

---

## SCREEN 11: Knowledge Base

**Top bar**: Search + Category filter + "New Article" button

**Article cards grid**:
- Title, category tag, preview text (2 lines)
- Created date
- Click to expand full article

---

## Important Notes for the Designer

1. **ALL text is in English, left-to-right**
2. The sidebar is on the LEFT side
3. Keep consistent spacing, card styles, and color palette across all screens
4. The app should look premium — this is for an interior designer who cares deeply about aesthetics
5. Use subtle animations hints (hover states, transitions)
6. Make data visualization beautiful — rounded charts, gradient fills
7. Tables should have alternating row backgrounds and generous padding
8. Empty states should have elegant illustrations or icons with helpful text
