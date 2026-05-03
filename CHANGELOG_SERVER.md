# Server-Side Changelog

Tracks required backend changes that must be coordinated with client releases.

---

## Change 13 — `DELETE /api/timelogs/:id`: Hard-delete a punch log

**Ticket:** Company punch log admin view needs a Delete action. Admins, HR, and supervisors must be able to permanently remove a single timelog record from the company panel.

**Status:** Pending.

---

### What changes

- Add `DELETE /api/timelogs/:id` route.
- Authorization: only `admin`, `superadmin`, `hr`, `supervisor` roles may call this. Return `403` for anyone else.
- If the log is tied to a `CutoffApproval` record, either cascade-delete or return `409` with a descriptive message (e.g. *"Cannot delete a log that is part of a closed cutoff period"*) — your call on policy, client will surface the error message from `j.message`.
- Return `{ message: "Deleted successfully" }` on success with `200` (or `204` with no body — client checks `res.ok`).

---

## Change 12 — `PATCH /api/timelogs/:id/punch-type`: Update punch type on an existing log

**Ticket:** DayCare company admins need to correct the punch type on a timelog (e.g. change `REGULAR` → `DRIVER_AIDE_AM` if an employee was mis-tagged). Only relevant for DayCare companies, but the endpoint itself has no company-type restriction — the client gate is sufficient.

**Status:** Pending.

---

### What changes

- Add `PATCH /api/timelogs/:id/punch-type` route.
- Authorization: `admin`, `superadmin`, `hr`, `supervisor` only.
- Request body:
  ```json
  { "punchType": "REGULAR" | "DRIVER_AIDE" | "DRIVER_AIDE_AM" | "DRIVER_AIDE_PM" }
  ```
- Validate that `punchType` is one of the four allowed values; return `400` otherwise.
- After updating `TimeLog.punchType`, re-run the segment-hour calculation (same logic used on clock-out) so `driverAmSegmentHours`, `regularSegmentHours`, `driverPmSegmentHours`, and `netWorkedHours` are immediately consistent.
- Return the updated timelog object (or at minimum `{ message: "Updated", punchType }`) so the client can confirm.

---

## Change 11 — `POST /api/shiftschedules/create`: Accept `targetIds[]` for Multi-Employee Individual Assignment

**Ticket:** "Create Recurring Schedule" currently only allows assigning one employee at a time (`targetId: string`). The UI is being updated to a multi-select checkbox list — users pick N employees in one form submission, expecting one schedule record created per employee in a single operation. The current endpoint forces the client to fire N separate requests, which makes conflict aggregation and error reporting fragmented.

**Status:** Pending.

---

### What changes

Only `POST /api/shiftschedules/create` needs updating. `GET`, `PUT`, and `DELETE` endpoints are unaffected — the server continues creating one `ShiftSchedule` row per employee, so the table/edit/delete flows stay exactly the same.

---

### Updated request body

```json
{
  "shiftId": "string (required)",
  "daysOfWeek": [1, 2, 3, 4, 5],
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "assignmentType": "individual" | "department" | "all",
  "targetIds": ["uuid-emp-1", "uuid-emp-2"],
  "replaceConflicts": false,
  "skipConflicts": false
}
```

**Field changes vs current contract:**

| Field | Before | After |
|---|---|---|
| `targetId` | `string` — single employee/dept ID | **Removed** for `individual` type |
| `targetIds` | _(did not exist)_ | `string[]` — array of employee IDs, required when `assignmentType === "individual"` |
| `targetId` for dept/all | `string \| null` | Unchanged — still a single string for `department`, `null` for `all` |

> **Backwards-compat note:** To avoid breaking anything during the transition, the server may also accept the old `targetId: string` for individual type (treat it as `targetIds: [targetId]`) if that's easier to implement. The client will always send `targetIds[]` once updated.

---

### Server logic for `assignmentType === "individual"`

1. **Validate** — all IDs in `targetIds` must belong to the authenticated company. Reject 400 if any are foreign or missing.

2. **Conflict detection (first pass, no flags set):**
   - Run the existing conflict check for **each** employee in `targetIds`.
   - Aggregate all conflicts across all employees into a **single 409 response**.
   - Response shape (same structure as current, extended with `targetId` per conflict entry):

   ```json
   {
     "message": "Scheduling conflicts detected",
     "totalConflicts": 7,
     "conflicts": [
       {
         "targetId": "uuid-emp-1",
         "userName": "Juan dela Cruz",
         "userEmail": "juan@biz.com",
         "conflictCount": 3
       },
       {
         "targetId": "uuid-emp-2",
         "userName": "Maria Santos",
         "userEmail": "maria@biz.com",
         "conflictCount": 4
       }
     ]
   }
   ```

3. **`skipConflicts: true`** — for each employee, create `ShiftSchedule` + `UserShift` records only for dates that don't conflict. Employees with zero non-conflicting dates get no record created (do not error, just skip).

4. **`replaceConflicts: true`** — for each employee, delete the conflicting `UserShift` records first, then create all dates. Same behavior as current but applied per employee.

5. **Creation** — create one `ShiftSchedule` row per employee (same schema as today, `targetId` = single employee ID). The result is N separate schedule records, each independently editable and deletable.

6. **Response on success:**

   ```json
   {
     "message": "Schedules created successfully",
     "created": 3,
     "skipped": 1,
     "results": [
       { "targetId": "uuid-emp-1", "scheduleId": "...", "assignedDates": 10 },
       { "targetId": "uuid-emp-2", "scheduleId": "...", "assignedDates": 8 },
       { "targetId": "uuid-emp-3", "scheduleId": "...", "assignedDates": 10 },
       { "targetId": "uuid-emp-4", "skipped": true, "reason": "no non-conflicting dates" }
     ]
   }
   ```

   `skipped` count is only relevant when `skipConflicts: true`.

---

### What does NOT change

- `POST /api/shiftschedules/create` with `assignmentType: "department"` — still accepts `targetId: string` (department ID), no change.
- `POST /api/shiftschedules/create` with `assignmentType: "all"` — still accepts `targetId: null`, no change.
- `GET /api/shiftschedules` — no change, still returns one record per `targetId`.
- `PUT /api/shiftschedules/:id` — no change.
- `DELETE /api/shiftschedules/:id` — no change.
- `GET /api/shifts` — no change. `startTime` and `endTime` are already included in the response (used by the updated shift dropdown on the client). No new fields needed.

---

**Client side:** `Schedules.jsx` — Create Recurring Schedule modal. `scheduleForm.targetId` replaced with `scheduleForm.targetIds[]` for individual type. On submit: sends one `POST /api/shiftschedules/create` with the full `targetIds` array. Conflict dialog updated to show per-employee conflict list. No change to edit or delete flows.

---

## Change 10 — `DELETE /api/time-logs/:id/auto-breaks`

**Ticket:** Admins have no correction path for wrongly auto-injected breaks. Direct DB intervention is the only option today, which is unacceptable for a production payroll system.

**Status:** Shipped.

**Endpoint spec (as implemented):**

- **Auth:** Admin/superadmin only, same company enforced.
- **Body:** `{ lunch: true }`, `{ coffee: true }`, or `{ lunch: true, coffee: true }` — granular, client specifies which to clear.
- **Lunch clear:** Nulls `lunchBreak` and `autoLunchDeductionMinutes`, sets `autoLunchApplied = false`.
- **Coffee clear:** Strips only `auto: true` entries from `coffeeBreaks` (manual ones preserved), sets `autoCoffeeApplied = false`.
- **Post-clear:** Runs `computeTimeLogSummary` so net hours, deductions, and OT update immediately. Emits `timeLogUpdated` socket event.

**Client side:** Admin punch log edit dialog (`EmployeesPunchLogs.jsx`) — "Clear Auto-Breaks & Reset Flags" button shown only when `autoLunchApplied || autoCoffeeApplied`. Sends `{ lunch: autoLunchApplied, coffee: autoCoffeeApplied }` in body, re-fetches logs on success.

---

## Change 9 — `GET /api/cutoff-periods/:id/approvals`: Include `segmentType` + Emit One Record Per Driver Segment

**Ticket:** Driver employees assigned 3 shifts (driver_am / regular / driver_pm) appear as a single flat "Punch" row in the Cutoff Review page instead of a grouped "Driver Day" with 3 segments.

**Status:** Shipped. Both `syncApprovalRecords` and `createCutoffPeriod` correctly split `DRIVER_AIDE` punches into 3 segment records, and `enrichApprovals` passes `segmentType` through with per-segment hours (`driverAmSegmentHours`, `regularSegmentHours`, `driverPmSegmentHours`).

**Client side:** No changes needed. `groupDriverRecords()` in `CutoffReview.jsx` already handles grouping by `segmentType` and the Driver Day UI is fully implemented.

**⚠️ Backfill required for existing open cutoffs:**

Cutoffs created or last synced **before** this implementation was deployed will have stale approval records with `segmentType: null` for DRIVER_AIDE employees. These will continue to display as flat Punch rows until fixed.

**Fix options (pick one):**

- **Option A (preferred) — re-run sync per cutoff:** Call `POST /api/cutoff-periods/:id/sync` on each affected open cutoff. The sync path already handles DRIVER_AIDE splitting correctly — it will delete the stale null-segment records and recreate them as 3 segment rows.

- **Option B — targeted DB migration:** Find all `CutoffApproval` records in open cutoffs where `segmentType IS NULL` and the associated `TimeLog.punchType = 'DRIVER_AIDE'`, delete them, and reinsert as 3 records (`driver_am`, `regular`, `driver_pm`) using the same logic in `syncApprovalRecords`.

**Scope:** Only open cutoffs are affected. Locked/processed cutoffs should not be backfilled.

---

## Change 8 — `GET /api/timelogs`: Include `shiftToday` + `userShift` Per Log

**Ticket:** "Unscheduled: Uses default company settings" badge always shown in Company Panel → Punch Logs; Schedule Details dialog empty even for scheduled employees.

**Status:** Fully shipped.

**Final response shape per log:**

```json
"shiftToday":  "Regular Shift, Driver Aide PM",
"userShift":   { "id": "...", "assignedDate": "2026-04-22", "shift": { "shiftName": "Regular Shift", "startTime": "...", "endTime": "..." } },
"userShifts":  [
  { "id": "...", "assignedDate": "2026-04-22", "shift": { "shiftName": "Regular Shift",   "startTime": "...", "endTime": "..." } },
  { "id": "...", "assignedDate": "2026-04-22", "shift": { "shiftName": "Driver Aide PM",  "startTime": "...", "endTime": "..." } }
]
```

- `shiftToday` — joined name string; used for `isScheduled: !!(t.shiftToday)` check
- `userShift` — `shifts[0]`, kept for backwards compat
- `userShifts` — full array; client uses this for the Schedule Details dialog so all shifts appear

`null` / `[]` when no `UserShift` exists for that date.

**Root cause (fixed server-side):** `shiftMap[s.userId] = {...}` was last-write-wins — for DA employees with two shifts, one was silently overwritten. Fixed to accumulate all shifts into an array.

**Client usage:**
- `scheduleList: t.userShifts?.length ? t.userShifts : (t.userShift ? [t.userShift] : [])` — all shifts shown in dialog

---

## Change 7 — Date-Only Fields Must Be Serialized as `YYYY-MM-DD` (not ISO timestamps)

**Ticket:** Calendar day-shift bug — shifts assigned on Saturday appear on Friday for users in UTC-negative timezones (e.g. US timezones). Root cause: date-only fields are serialized as `"2025-01-11T00:00:00.000Z"` (UTC midnight ISO timestamp). When the client parses this, it applies the browser's local timezone offset, shifting the date backward for any timezone behind UTC.

**Affected APIs:**

### `GET /api/usershifts`
### `GET /api/usershifts/employee/:employeeId`
### `GET /api/usershifts/company-employees`
### `GET /api/usershifts/company-stats`

Field to fix on `UserShift` response objects:

| Field | Current | Required |
|---|---|---|
| `assignedDate` | `"2025-01-11T00:00:00.000Z"` | `"2025-01-11"` |

**Implementation:** In the serializer/response builder, format the field as a plain date string before returning:
```js
assignedDate: record.assignedDate.toISOString().slice(0, 10)
// or with date-fns: format(record.assignedDate, 'yyyy-MM-dd')
```

---

### `GET /api/leaves`
### `GET /api/leaves/my`
### `POST /api/leaves/submit` (response body)

Fields to fix on `Leave` response objects:

| Field | Current | Required |
|---|---|---|
| `startDate` | `"2025-01-11T00:00:00.000Z"` | `"2025-01-11"` |
| `endDate`   | `"2025-01-11T00:00:00.000Z"` | `"2025-01-11"` |

**Note:** `createdAt`, `updatedAt`, and all punch-related timestamps (`timeIn`, `timeOut`, `shift.startTime`, `shift.endTime`) are true datetimes and should remain as full ISO timestamps — do NOT change those.

**Client changes shipped alongside this (v2.11.0):**
- `Schedule.jsx` — replaced `parseISO(assignedDate) → format(...)` with `.slice(0, 10)` for grouping key; `toLocalDate()` for display and month filter
- `employee-schedules/page.jsx` — same as above
- `LeaveLogs.jsx` — added `toLocalDate()` helper; replaced all `new Date(startDate/endDate)` display usages
- `EmployeesLeaveRequests.jsx` — replaced all remaining `new Date(startDate/endDate)` display/calculation usages with `toLocalDate()`

---

## Change 6 — `POST /api/shiftschedules/:scheduleId/apply-to-employee`

New endpoint required. See previous entries.

## Change 5 — `/api/employment-details/me` Must Include Department Name/ID

See previous entries.

## Change 4 — Smart OT Query Params

See previous entries.

## Change 3 — All Three OT Thresholds in `GET /api/company-settings`

See previous entries.

## Change 2 — Auto-Lunch Fields on Department

See previous entries.

## Change 1 — `driverAideThresholdMinutes` in CompanySettings

See previous entries.
