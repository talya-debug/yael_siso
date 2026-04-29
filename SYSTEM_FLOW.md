# Yael Siso — System Flow Map

## The Big Picture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        YAEL SISO SYSTEM                            │
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │  CLIENTS │───>│ PROPOSALS│───>│ PROJECTS │───>│COMPLETION│      │
│  │  (Leads) │    │ (Scope)  │    │ (Active) │    │  (End)   │      │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│       │               │               │               │            │
│       │               │               │               │            │
│  ┌────┴────┐    ┌─────┴─────┐   ┌─────┴─────┐   ┌────┴────┐      │
│  │SUPPLIER │    │ KNOWLEDGE │   │  FINANCE  │   │ MONTHLY │      │
│  │DIRECTORY│    │   BASE    │   │ DASHBOARD │   │ REPORT  │      │
│  └─────────┘    └───────────┘   └───────────┘   └─────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Flow 1: Lead → Project

```
NEW CLIENT                    PROPOSAL                      PROJECT
─────────                     ────────                      ───────
Yael adds client         Yael selects scope items      System creates project
with contact info   ───> from template (phases,   ───> + all tasks + subtasks
(name, phone,            tasks, subtasks)              with automatic scheduling
email, address)
                         Status: DRAFT                 Status: ACTIVE
                                │                            │
                         Yael reviews            Tasks organized by PHASE:
                                │                 Phase 1: Project Initiation
                         Status: SENT             Phase 2: Initial Planning
                                │                 Phase 3: Working Plans
                         Client approves          Phase 4: Material Selection
                                │                 ...
                         Status: APPROVED
                                │
                    ┌───────────┴───────────┐
                    │  PROJECT IS CREATED   │
                    │  Tasks auto-generated │
                    │  Dates auto-calculated│
                    └───────────────────────┘
```

**What exists today:** ✅ Full flow works
**What's missing:**
- ❌ Billing milestones NOT auto-created when project opens
- ❓ Need to ask Yael: which phase triggers which payment?

---

## Flow 2: Working on a Project

```
PROJECT VIEW
─────────────

📂 Phase 1: Project Initiation          ✅ COMPLETED (collapsed)
   All tasks done → phase auto-collapses

📂 Phase 2: Initial Planning            🔄 CURRENT (open, gold border)
   ✅ Perform measurement
   ✅ Needs clarification meeting        📎 Template attached
   🔄 Present layout alternatives        ✍️ Needs signature
   ⬜ Final layout approval              ✍️ Needs signature

📂 Phase 3: Working Plans               ⬜ UPCOMING (collapsed)
   Tasks visible but not started yet

Each task can have:
├── Status: Pending / In Progress / Done / Blocked
├── Subtasks: checklist (e.g. 3/5 done)
├── Dates: start + due
├── Priority: Low / Normal / High / Urgent
├── Assignee: who's responsible
├── Description: instructions
├── Activity Log: notes and updates
├── Related Resources: auto-linked from Knowledge Base
└── Signature: Send for Signature button (if applicable)
```

**What exists today:** ✅ Phase view with status, subtasks, task panel, resources, signatures
**What's missing:**
- ❌ Gantt needs testing with real data
- ❓ Are subtasks showing properly? (added 96 subtasks to demo data)

---

## Flow 3: Signatures

```
SIGNATURE FLOW
──────────────

Task: "Client signs proposal"
        │
        ▼
Yael clicks "Send for Signature"
        │
        ▼
┌─────────────────────────────┐
│ System creates:             │
│ • Unique link               │
│ • Record in signatures DB   │
│ • Opens email with link     │
└─────────────────────────────┘
        │
        ▼
Yael sends email to client
(can attach files in email)
        │
        ▼
Client opens link
        │
        ▼
┌─────────────────────────────┐
│ SIGNATURE PAGE              │
│ • Sees "YAEL SISO"          │
│ • Sees task name + phase    │
│ • Enters full name          │
│ • Signs with finger/mouse   │
│ • Clicks "Confirm & Sign"   │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ AFTER SIGNING:              │
│ • Signature saved in DB     │
│ • Task status → Done        │
│ • Activity log updated      │
│ • Yael sees ✅ in project   │
└─────────────────────────────┘
```

**What exists today:** ✅ Full flow built
**What's missing:** Nothing — as long as SQL was run ✅

---

## Flow 4: Client Billing

```
BILLING FLOW (TODAY — MANUAL)
─────────────────────────────

Yael goes to Client Billing
        │
        ▼
Option A: "Project Template"
   • Select project
   • Enter contract total (e.g. ₪80,000)
   • Template: 30% / 20% / 30% / 20%
   • System calculates amounts
   • Creates 4 payment milestones

Option B: "Single Payment"
   • Add individual payment manually
        │
        ▼
Payment milestones appear:
┌──────────────────────────────────────────────┐
│ Cohen Penthouse               ₪45K / ₪150K  │
│ ├── ✅ Advance Payment     ₪45,000   PAID    │
│ ├── ✅ Layout Approval     ₪30,000   PAID    │
│ ├── ⬜ Working Drawings    ₪45,000   PENDING │
│ └── ⬜ Project Completion  ₪30,000   PENDING │
└──────────────────────────────────────────────┘
        │
        ▼
When status changes → Dashboard updates
Email button → opens email to client
CSV export available
```

**What exists today:** ✅ Manual billing works
**What's missing:**
- ❌ Billing NOT auto-created when project opens
- ❌ Billing NOT linked to phase completion
- ❌ No split between "Current" (due now) vs "Future" billing in dashboard
- ❓ Need Yael's input: which phase = which payment?

---

## Flow 5: Supplier Billing (Commissions)

```
SUPPLIER COMMISSION FLOW
────────────────────────

Yael adds order from supplier
        │
        ▼
┌─────────────────────────────────┐
│ • Select supplier (or add new)  │
│ • Commission % auto-filled      │
│ • Enter order amount            │
│ • Commission auto-calculated    │
│ • Link to project               │
└─────────────────────────────────┘
        │
        ▼
KPIs show:
• Total commissions: ₪X
• Collected: ₪Y
• Pending collection: ₪Z
        │
        ▼
When ready to collect:
📧 Email button → Hebrew email to supplier
   with order details + commission amount
        │
        ▼
Mark as "Paid" when commission received
```

**What exists today:** ✅ Full flow works
**What's missing:** Nothing

---

## Flow 6: Finance Dashboard

```
FINANCE PER PROJECT
───────────────────

┌─────────────────────────────────────────────┐
│ Project Price:              ₪80,000         │
│─────────────────────────────────────────────│
│ Revenue (milestones paid):  ₪24,000         │
│                                             │
│ Expenses:                                   │
│   Labor (hours × rate):    ₪6,000           │
│   Direct expenses:         ₪11,100          │
│     • Carpentry plans      ₪3,500           │
│     • Working plans        ₪7,600           │
│   Total expenses:          ₪17,100          │
│                                             │
│ Adi's Share:                                │
│   30% of project price:    ₪24,000          │
│   - 30% of expenses:      -₪5,130          │
│   Payment to Adi:          ₪18,870          │
│                                             │
│ Gross Profit (Yael):        ₪44,030         │
│ Target (40%):               ₪32,000         │
│ Met target?                 ✅ YES           │
└─────────────────────────────────────────────┘

Data sources:
• Project price → manual input
• Revenue → auto from Client Billing
• Labor cost → auto from Work Log × Hourly Rates
• Direct expenses → manual input
• Adi's share → auto calculated
```

**What exists today:** ✅ Full dashboard built
**What's missing:** Nothing — works with all data sources

---

## Flow 7: Monthly Report to Client

```
MONTHLY REPORT
──────────────

Yael selects: Project + Month
        │
        ▼
System generates report:
┌─────────────────────────────────┐
│ PROGRESS: 65%                   │
│                                 │
│ ✅ Completed This Month (4)     │
│   • Perform measurement         │
│   • Needs clarification meeting │
│   • ...                         │
│                                 │
│ 🔄 In Progress (2)             │
│   • Layout alternatives         │
│   • ...                         │
│                                 │
│ 📋 Next Steps — May (3)        │
│   • Final layout approval       │
│   • Construction plan            │
│   • ...                         │
│                                 │
│ ⚠️ Waiting on Client (1)       │
│   • Client signs proposal        │
│                                 │
│ 💰 Pending Payments (1)        │
│   • Working Drawings  ₪45,000   │
└─────────────────────────────────┘
        │
        ▼
"Send to Client Email" → opens email with full report
"Export" → downloads text file
```

**What exists today:** ✅ Full flow works
**What's missing:** Nothing

---

## Flow 8: Knowledge Base → Tasks

```
KNOWLEDGE BASE CONNECTION
─────────────────────────

IN KNOWLEDGE BASE:                    IN PROJECT:
─────────────────                     ──────────

Yael creates resource:                When opening task
• Title: "Construction                "Construction plan":
  Plan Checklist"
• Type: Checklist                     ┌─────────────────────┐
• Related Task: ─────────────────────>│ 📎 Related Resources│
  "Construction plan" (DROPDOWN)      │ • Construction Plan  │
• Drive Link: google.com/...          │   Checklist          │
• Content: step-by-step guide         │   [Open in Drive →]  │
                                      └─────────────────────┘

The connection is by TASK NAME.
Dropdown shows all 84 tasks from scope template.
When a project has a task with that name,
resources appear automatically.
```

**What exists today:** ✅ Dropdown + auto-link in project
**What's missing:** Nothing

---

## Flow 9: Work Log

```
WORK LOG
────────

Worker fills form:
• Date
• Project (dropdown)
• Role (PM / Designer / CAD Drafter / Other)
• Worker name
• Hours
• Description

Data feeds into:
├── Work Log page (internal tracking)
├── Finance Dashboard (hours × rate = labor cost)
├── Public Work Log (shareable link: /worklog-public)
└── Monthly Report (hours summary)
```

**What exists today:** ✅ Full flow works
**What's missing:** Nothing

---

## SUMMARY — What's Missing

### Must Have (before delivery):
1. **Login + Permissions** — waiting for emails from Yael
2. **Billing auto-creation** — when project opens, create payment milestones
3. **Billing linked to phases** — when phase completes → billing becomes "due now"
4. **Current vs Future billing** in dashboard

### Nice to Have:
5. Mobile responsive design
6. Gantt chart testing with real data
7. Client portal (read-only project view)
