# Code Review — Critical Flow Logic Bugs

Date: 2026-04-28

---

## 1. Clients.jsx — approveProposal flow

### BUG 1.1: Project created before billing modal — no rollback if user skips
**File:** `Clients.jsx`, lines 316-369
**Issue:** `approveProposal()` creates the project and tasks BEFORE showing the billing split modal. If the user clicks "Skip" (line 816-818) or closes the browser, the project exists with `project_price` set but zero payment records. This is by design (Skip button calls `fetchAll()`), but there is no way to re-open the billing split modal later for that project. The billing data is permanently lost.

### BUG 1.2: Billing split hardcodes 30%/10% advance/completion — ignores actual phases
**File:** `Clients.jsx`, lines 352-365
**Issue:** The `remaining` is hardcoded to `60` (line 358), assuming advance is always 30% and completion is always 10%. But the user can edit advance/completion percentages in the modal. The initial distribution math is only cosmetic (auto-fill), so this is minor — user can adjust before saving.

### BUG 1.3: `projectPrice` of 0 causes billing split modal with 0 amounts
**File:** `Clients.jsx`, line 317
**Issue:** `parseFloat(approvePrice) || 0` means if no price is entered, projectPrice = 0. The billing split modal will show `0` for every amount (`Math.round(0 * pct / 100) = 0`). All payments inserted will have `amount: 0`. No guard against this.

### BUG 1.4: `createTasksFromScope` — crash if `propItems` contains items with null `contents`
**File:** `Clients.jsx`, lines 391-513
**Issue:** `propItems` comes from a join query (`select('*, contents(*)')`). If a `proposal_item` references a deleted `content_id`, `pi.contents` will be null. The code at line 349 (`pi.contents?.category`) handles this with optional chaining, but `getContent(pi.content_id)` at line 400 will also return undefined, and `c.parent_id` at line 406 will throw. The `if (!c) return` guard at line 405 prevents the crash for the forEach, but orphaned subtask content_ids at line 477 (`c.parent_id`) could still fail if `getContent` returns undefined — though line 478 has a guard (`if (!c) continue`).

### BUG 1.5: Phase IDs included in `selectedScope` are inserted as proposal_items but never used as tasks
**File:** `Clients.jsx`, lines 242-246
**Issue:** When selecting scope, phase-level IDs are added to `selectedScope` and inserted into `proposal_items`. But `createTasksFromScope` only processes `level === 'task'` and `level === 'subtask'` items. Phase-level proposal_items are wasted rows in the DB. Not a bug per se, but unnecessary data.

### BUG 1.6: `approveProposal` can be called on `sent` status proposals too — button only shows for `draft`
**File:** `Clients.jsx`, line 615
**Issue:** The "Approve Project" button only shows when `proposal?.status === 'draft'`. This means proposals with status `sent` cannot be approved from the UI. If the workflow is draft -> sent -> approved, there is no approve button for `sent` proposals. Likely a missing condition: should also show for `sent`.

---

## 2. Projects.jsx — phase completion detection

### BUG 2.1: Phase completion only triggers on `done`, never un-triggers
**File:** `Projects.jsx`, lines 899-921
**Issue:** `updateTaskStatus` only checks phase completion when `newStatus === 'done'` (line 906). If a user moves a task FROM `done` back to `pending` or `in_progress`, no "phase un-completed" logic runs. The phase completion log entry remains, which is misleading. The UI phase status indicators (lines 1045-1051) do recalculate dynamically, so the visual state is correct — but the log entry is never retracted.

### BUG 2.2: Phase completion correctly excludes subtasks
**File:** `Projects.jsx`, line 909
**Issue:** The filter `t.level !== 'subtask'` is correct — only main tasks are checked for phase completion. No bug here.

### BUG 2.3: `updateTaskStatus` updates local state but not subtask cascade
**File:** `Projects.jsx`, lines 899-921
**Issue:** When a parent task is marked `done`, its subtasks are NOT automatically marked done. Conversely, when all subtasks are done, the parent task is NOT automatically marked done. The subtask completion is purely visual (progress bar) with no status cascade. This may be intentional but could confuse users.

---

## 3. FinanceDashboard.jsx

### BUG 3.1: Adi calculation is correct
**File:** `FinanceDashboard.jsx`, lines 92-94
The formula: `adiPayment = (price * adiPct) - (totalExpenses * adiPct)` which equals `adiPct * (price - totalExpenses)`. This matches the stated formula: 30% of project price MINUS 30% of expenses. Correct.

### BUG 3.2: Gross profit formula is correct
**File:** `FinanceDashboard.jsx`, line 97
`grossProfit = price - totalExpenses - adiPayment`. Correct.

### BUG 3.3: `project_price` of 0 or null — no crash, but misleading display
**File:** `FinanceDashboard.jsx`, line 60
**Issue:** If `project_price` is null or 0, `price = 0`. Then `adiFromRevenue = 0`, `adiPayment = -(totalExpenses * adiPct)` (negative), and `grossProfit = 0 - totalExpenses - (negative number) = -totalExpenses + totalExpenses*adiPct = -totalExpenses * (1 - adiPct)`. This means with no price set, Adi's "payment" becomes negative (Adi owes money), which is displayed without any warning. The UI shows `fmt(f.adiPayment)` which could show a negative number like "₪-3,000" — confusing.

### BUG 3.4: Supplier commissions calculated but never used
**File:** `FinanceDashboard.jsx`, lines 84-86
**Issue:** `supplierCommissions` is computed but never added to revenue or profit. It's returned in the finance object but not displayed or factored into any calculation. Dead code.

---

## 4. SignaturePage.jsx

### BUG 4.1: Invalid/expired tokens handled correctly
**File:** `SignaturePage.jsx`, lines 103-109
**Issue:** If `sigRequest` is null (no matching token), it shows "invalid or expired" message. However, there is no actual expiration mechanism — tokens never expire. If you want expiry, you'd need a `created_at` check. Currently any old token works forever.

### BUG 4.2: Task correctly updated to `done` after signing
**File:** `SignaturePage.jsx`, lines 86-92
The code updates the task status to `done` and inserts a log. Correct.

### BUG 4.3: No error handling on signature update failure
**File:** `SignaturePage.jsx`, lines 78-83
**Issue:** If the `supabase.from('signatures').update(...)` fails (e.g., network error), no error is shown to the user. The code proceeds to update the task and show "Signed Successfully" even if the signature data wasn't saved. Should check for errors.

### BUG 4.4: If signatures table doesn't exist — handled at creation, not at read
**File:** `SignaturePage.jsx`, lines 17-21
**Issue:** The `load()` function queries the `signatures` table. If the table doesn't exist, `data` will be null and the page shows "invalid or expired" — a misleading message. No crash, but bad UX. The `sendForSignature` function in Projects.jsx (line 126-128) does handle table-not-exist at insert time by falling back to a log.

### BUG 4.5: Already-signed tokens can be re-visited but not re-signed
**File:** `SignaturePage.jsx`, line 23
The code checks `data?.status === 'signed'` and sets `setSigned(true)`, showing the success screen. This is correct — prevents double-signing.

---

## 5. WorkLog.jsx + PublicWorkLog.jsx

### BUG 5.1: Column names are correct
**File:** `WorkLog.jsx` line 46, `PublicWorkLog.jsx` line 31
Both use `work_date` (correct column name). No bug.

### BUG 5.2: PublicWorkLog has no authentication — anyone can submit
**File:** `PublicWorkLog.jsx`
**Issue:** The public form has no rate limiting, CAPTCHA, or authentication. Anyone with the URL can submit unlimited work log entries to any active project. This is a data integrity risk.

### BUG 5.3: PublicWorkLog doesn't require `description`
**File:** `PublicWorkLog.jsx`, lines 26-27, 117-118
**Issue:** The submit button is disabled only if `!form.project_id || !form.worker_name || !form.hours`. Description is optional. But in `WorkLog.jsx` (line 43), the internal form requires `form.description.trim()` but NOT project_id, hours, or worker_name. The validation rules are inconsistent between the two forms.

### BUG 5.4: WorkLog internal form allows empty hours and no project
**File:** `WorkLog.jsx`, lines 43-51
**Issue:** The `save()` function only checks `if (!form.description.trim()) return`. It allows: no project (`project_id: null`), no hours (`hours: null`), no worker name. This means entries can exist with null hours, which breaks the finance dashboard's hour calculations (they'd contribute 0 hours but still show in the role breakdown).

---

## Summary of Critical Issues

| # | File | Severity | Description |
|---|------|----------|-------------|
| 1.1 | Clients.jsx | Medium | No way to re-open billing split after skipping |
| 1.3 | Clients.jsx | Medium | Price=0 creates 0-amount payment milestones |
| 1.6 | Clients.jsx | Medium | "Approve" button missing for `sent` status proposals |
| 2.1 | Projects.jsx | Low | Phase completion log not retracted on undo |
| 2.3 | Projects.jsx | Low | No subtask/parent status cascade |
| 3.3 | FinanceDashboard.jsx | Medium | Negative Adi payment when price is 0/null |
| 3.4 | FinanceDashboard.jsx | Low | supplierCommissions calculated but unused |
| 4.1 | SignaturePage.jsx | Low | Signature tokens never expire |
| 4.3 | SignaturePage.jsx | Medium | No error handling on sign — shows success even on failure |
| 5.2 | PublicWorkLog.jsx | High | No auth/rate-limit on public form |
| 5.3-5.4 | WorkLog + Public | Medium | Inconsistent validation between internal and public forms |
