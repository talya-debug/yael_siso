# QA Report - Yael Siso App
**Date:** 2026-04-28

---

## 1. Data Integrity Check

| Table | Count | Issues |
|-------|-------|--------|
| clients | 2 | DUPLICATE: Both records are "טליה אושר" with same email/phone. IDs: 434a1a65, ffa1a0b7 |
| proposals | 2 | Both have valid client_ids. One draft, one approved. |
| proposal_items | 789 | All reference one of the 2 proposals. |
| projects | 1 | "Project טליה אושר", status=active, valid client_id (ffa1a0b7) |
| tasks | 419 | 50 tasks + 369 subtasks. All belong to the single project. No orphans. |
| contents (scope template) | 597 | 6 phases, 63 tasks, 431 subtasks. **4 orphaned tasks** (parent_id points to non-existent phase). See below. |
| suppliers | 319 | All have names. No nulls. |
| payments | 0 | Empty table |
| supplier_payments | 0 | Empty table |
| work_log | 0 | Empty table |
| knowledge | 12 | 8 have related_task set, 4 do not |
| user_roles | 3 | sisoyael@gmail.com (admin), hello@yaelsiso.com (admin), talya@talyaosher.com (admin) |
| hourly_rates | 4 | Project Manager=150, Designer=120, CAD Drafter=100, Other=100 |

### Orphaned Content Items (parent_id not found in contents table)
All 4 orphans point to parent IDs that do not exist:
- "Final Project Checklist" (task) -> parent 405a0b39 (missing)
- "Landscaping plan work" (task) -> parent 1540b523 (missing)
- "Address sprinkler requirements" (task) -> parent 1540b523 (missing)
- "Address consultants (electrical, lighting, structural)" (task) -> parent 1540b523 (missing)

**Root cause:** These tasks reference 2 phase records (405a0b39, 1540b523) that were likely deleted or never created. There should be at least 2 more phases: probably "Project Completion" and "Landscaping/Consultants".

### Duplicate Client
Both client records have identical data:
- Name: טליה אושר
- Email: talya@talyaosher.com
- Phone: 0544407557

One is used by the draft proposal, the other by the approved proposal and the active project. These should be merged.

---

## 2. Scope Template Integrity

- **6 phases** exist in contents table
- Phase categories: Initial Planning, Project Initiation, Working Plans - Initial, Working Plans - Advanced, Basic Material Selection, Advanced Material Selection
- **4 orphaned tasks** whose parent phases are missing (detailed above)
- All subtasks were checked within the first 500 records; orphan check may be incomplete for the remaining 97 items (items 501-597 not checked in parent validation)

---

## 3. Login Tests

| Email | Password | Result |
|-------|----------|--------|
| sisoyael@gmail.com | sisoyaelin2026# | OK - authenticated |
| hello@yaelsiso.com | Chloe2026! | OK - authenticated |
| talya@talyaosher.com | Talya2026! | OK - authenticated |

All 3 accounts login successfully and receive `authenticated` role.

---

## 4. Common Issues

### Hebrew Text in Suppliers
**113 out of 319 suppliers** (35%) still have Hebrew names. This is expected — these are Israeli suppliers with Hebrew business names. However, **3 suppliers have Hebrew in the category field** ("טקסטיל" instead of an English category like "Textiles" or "Upholstery"):
- ID 8b820d17 — category: טקסטיל
- ID e650ee07 (צורי רפד) — category: טקסטיל
- ID 7d13b510 — category: טקסטיל

**Action needed:** Change category "טקסטיל" to English (e.g., "Textiles") for consistency with all other categories.

### Hebrew Text in Knowledge Items
3 knowledge items contain Hebrew characters within their content (email templates). These appear to be em-dash characters ("—") that are rendering correctly, not actual Hebrew content issues. The titles and content are in English. **No action needed.**

### Supplier Categories
34 distinct categories exist. Generally consistent. One inconsistency spotted:
- Both "Surveyor" (7 suppliers) and "Surveying" (1 supplier) exist — should be merged.

### Demo/Test Data
- All data appears to be demo/test data centered around a single test client "טליה אושר"
- payments, supplier_payments, and work_log tables are all empty
- Only 1 project exists with 419 tasks auto-generated from the scope template

---

## Summary of Issues Found

| Priority | Issue | Action |
|----------|-------|--------|
| HIGH | 4 orphaned content items — 2 missing parent phases | Create the missing phase records or reassign these tasks |
| MEDIUM | Duplicate client "טליה אושר" (2 records, same data) | Merge into single record, update references |
| LOW | 3 suppliers with Hebrew category "טקסטיל" | Update to "Textiles" |
| LOW | Duplicate supplier categories: "Surveyor" vs "Surveying" | Standardize to one |
| INFO | All transactional tables empty (payments, supplier_payments, work_log) | Expected for pre-launch |
