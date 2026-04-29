# Server-Side Changelog

Tracks required backend changes that must be coordinated with client releases.

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
