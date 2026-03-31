# Server-Side Changes Required

**Client version:** v2.8.0 (pending)
**Date:** 2026-03-31

---

## Change 7 — In-App Feedback Widget

**New endpoint:** `POST /api/feedback`

### Context
A feedback widget is mounted on every dashboard page (fixed left-side tab). Any authenticated user can submit bug reports, suggestions, or questions during external testing. Each submission is stored in the database **and** forwarded to a Google Sheets Apps Script webhook — giving you a live, filterable feedback log in Google Sheets automatically.

---

### 1. Schema — `Feedback`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID / auto-increment | Primary key |
| `logNumber` | `Integer` | Auto-incrementing friendly number starting at 1000 |
| `category` | `Enum` | `bug`, `suggestion`, `question`, `other` |
| `title` | `String` | Max 120 chars |
| `description` | `String` | Max 1000 chars |
| `page` | `String` | Route/pathname where feedback was submitted |
| `submittedAt` | `DateTime` | ISO timestamp from client |
| `status` | `Enum` | `open`, `in_progress`, `resolved` — default `open` |
| `userId` | FK → User | Who submitted it (nullable — store from `submittedBy`) |
| `userAgent` | `String` | Raw browser/OS string |
| `screenResolution` | `String` | e.g. `"1920x1080"` |

---

### 2. `POST /api/feedback`

**Auth:** Required (Bearer token — any authenticated role)

**Request body:**
```json
{
  "category": "bug",
  "title": "Clock-out button not responding",
  "description": "Steps to reproduce: 1. Clock in 2. Wait 30 min 3. Click clock-out — nothing happens.",
  "page": "/dashboard/employee/timekeeping/punch",
  "submittedAt": "2026-03-31T10:23:00.000Z",
  "submittedBy": {
    "name": "Jane Doe",
    "email": "jane@company.com",
    "role": "employee"
  },
  "userAgent": "Mozilla/5.0 ...",
  "screenResolution": "1920x1080"
}
```

**Server behavior:**
1. Validate required fields: `category`, `title`, `description`
2. Parse `userAgent` into structured fields for the webhook (see section 3):
   - `browser` — e.g. `"Chrome 123"`
   - `os` — e.g. `"Windows 11"`
   - `device` — e.g. `"Desktop"` or `"Mobile"`
   - Use a lightweight UA parser library (e.g. `ua-parser-js`)
3. Assign next `logNumber` (auto-increment from 1000)
4. Save record to `Feedback` table
5. **Forward to Google Sheets webhook** (see section 3 below) — non-blocking
6. Return `201`:

```json
{
  "message": "Feedback submitted successfully",
  "data": {
    "id": "feedback-uuid",
    "logNumber": 1000
  }
}
```

> The client displays `"Your feedback has been logged as #1000"` using `logNumber` from this response.

---

### 3. Google Sheets Webhook Integration

Store the Apps Script web app URL in an environment variable:
```
FEEDBACK_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
```

After saving to DB, POST the following JSON to `FEEDBACK_WEBHOOK_URL` as a **non-blocking background call**:

```json
{
  "logNumber":     1000,
  "id":            "feedback-uuid",
  "submittedAt":   "2026-03-31T10:23:00.000Z",
  "employeeName":  "Jane Doe",
  "employeeEmail": "jane@company.com",
  "employeeRole":  "employee",
  "category":      "Bug Report",
  "title":         "Clock-out button not responding",
  "description":   "Steps to reproduce...",
  "page":          "/dashboard/employee/timekeeping/punch",
  "status":        "Open",
  "browser":       "Chrome 123",
  "os":            "Windows 11",
  "device":        "Desktop",
  "resolution":    "1920x1080"
}
```

> If the webhook fails, log the error server-side but still return `201` — the record is saved in DB regardless.

---

### 4. Google Sheets Apps Script Setup (for Carlo)

1. Open your Google Sheet → **Extensions → Apps Script**
2. Replace the default code with:

```javascript
function doPost(e) {
  try {
    const data  = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    sheet.appendRow([
      data.logNumber     || "",
      data.id            || "",
      data.submittedAt   || "",
      data.employeeName  || "",
      data.employeeEmail || "",
      data.employeeRole  || "",
      data.category      || "",
      data.title         || "",
      data.description   || "",
      data.page          || "",
      data.status        || "",
      data.browser       || "",
      data.os            || "",
      data.device        || "",
      data.resolution    || "",
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (the server POSTs to it — no user auth needed on this end)
4. Copy the **Web app URL** → set it as `FEEDBACK_WEBHOOK_URL` on the server

**Sheet column headers** (add these in Row 1 first):

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Log # | ID | Date | Employee | Email | Role | Category | Title | Description | Page | Status | Browser | OS | Device | Resolution |

---

### Migration
Add `Feedback` table as described in section 1. `logNumber` should auto-increment starting from `1000` (set sequence start in DB or handle in application layer).

---

## Change 1 — DayCare Driver-Aide Threshold (configurable)

**Affected endpoints:** `GET /api/company-settings` · `PATCH /api/company-settings`

### Context
The `driverAideThresholdMinutes` value — which controls how many minutes early on time-in or late on time-out triggers the AM/PM Driver-Aide modal for DayCare non-driver employees — was previously hardcoded to `45` on the client. It is now configurable per company via **Company Configurations → DayCare Settings** (visible to DayCare companies only).

### 1. Schema — `CompanySettings`

| Field | Type | Default | Constraints |
|---|---|---|---|
| `driverAideThresholdMinutes` | `Integer` | `45` | `> 0`, nullable |

### 2. `GET /api/company-settings` — response addition

```json
{
  "data": {
    "timezone": "...",
    "driverAideThresholdMinutes": 45
  }
}
```

### 3. `PATCH /api/company-settings` — accepted body addition

```json
{ "driverAideThresholdMinutes": 45 }
```

**Validation:** positive integer > 0. If omitted or `null`, keep existing value.

### Migration
Add `driverAideThresholdMinutes` column to `CompanySettings` with default `45`. No backfill needed.

### Notes
- Only DayCare companies configure this — non-DayCare companies will never send it, but the server should accept it gracefully.
- Client falls back to `45` if the field is absent.

---

## Change 2 — Per-Department Auto-Lunch Configuration

**Affected endpoints:** `GET /api/departments` · `PUT /api/departments/update/:id` · `GET /api/employment-details/me` · `POST /api/timelogs/time-out`

### Context
Departments with paid lunch (`paidBreak: true`) can now configure auto-lunch defaults:
- **Duration** — how long the auto-lunch deduction is (e.g., 60 min)
- **Trigger** — after how many hours of work it kicks in (e.g., 4 hours)

When an employee times out without having taken a manual lunch break and the threshold was crossed, the client signals the server to apply an automatic deduction.

### 1. Schema — `Department`

| Field | Type | Default | Constraints |
|---|---|---|---|
| `autoLunchDurationMinutes` | `Integer` | `60` | `>= 1`, nullable |
| `autoLunchAfterHours` | `Float` | `4.0` | `>= 0.5`, nullable |

Both fields are only meaningful when `paidBreak = true`.

### 2. `GET /api/departments` — response addition (per department object)

```json
{
  "id": "dept-id",
  "name": "Teachers",
  "paidBreak": true,
  "autoLunchDurationMinutes": 60,
  "autoLunchAfterHours": 4
}
```

### 3. `PUT /api/departments/update/:id` — accepted body additions

```json
{ "autoLunchDurationMinutes": 60 }
```
or
```json
{ "autoLunchAfterHours": 4 }
```

These are sent individually (on `blur` of each field). Both must be validated:
- `autoLunchDurationMinutes`: integer >= 1
- `autoLunchAfterHours`: float >= 0.5

### 4. `GET /api/employment-details/me` — response addition

The client reads auto-lunch config from the employee's department. Include the department's lunch fields in this response:

```json
{
  "data": {
    "jobTitle": "Teacher",
    "departmentId": "dept-id",
    "department": {
      "id": "dept-id",
      "name": "Teachers",
      "paidBreak": true,
      "autoLunchDurationMinutes": 60,
      "autoLunchAfterHours": 4
    }
  }
}
```

If the department has `paidBreak: false` or the fields are not set, the client will not show the banner or send the deduction signal.

### 5. `POST /api/timelogs/time-out` — new optional body fields

When the auto-lunch threshold was crossed and the employee never manually started a lunch break, the client will include:

```json
{
  "autoLunchApplied": true,
  "autoLunchMinutes": 60
}
```

**Server behavior:**
- If `autoLunchApplied: true` and `autoLunchMinutes` is provided → deduct `autoLunchMinutes` from the session's payable hours
- If not present or `autoLunchApplied: false` → no deduction (manual lunch or not applicable)
- This deduction should be recorded separately (e.g., `autoLunchDeductionMinutes` on the timelog) for audit/payroll visibility

### Migration
Add `autoLunchDurationMinutes` and `autoLunchAfterHours` columns to the `Department` table with defaults of `60` and `4.0` respectively.

### Notes
- The banner and deduction signal only fire when `paidBreak: true` **and** both `autoLunchDurationMinutes` and `autoLunchAfterHours` are set on the department.
- If the employee manually takes a lunch break (`lunchElapsed > 0`), `autoLunchApplied` is never sent — the manual break takes precedence.
- No breaking changes: the fields are optional on time-out, and the server should treat their absence as "no auto-lunch".

---

## Change 3 — OT Configuration: All Three Thresholds in Company Settings

**Affected endpoint:** `GET /api/company-settings` · `PATCH /api/company-settings`

### Context
The client's Punch Logs page previously only read `dailyOtThresholdHours`. It now reads all three thresholds to correctly compute per-session OT (daily), weekly cumulative OT (weekly), and cutoff-period cumulative OT (cutoff).

### `GET /api/company-settings` — response additions

```json
{
  "data": {
    "otBasis": "daily | weekly | cutoff",
    "dailyOtThresholdHours": 8,
    "weeklyOtThresholdHours": 40,
    "cutoffOtThresholdHours": 80
  }
}
```

All three fields must be returned regardless of which `otBasis` is active — the client stores them all.

### `PATCH /api/company-settings` — already handled
The `OvertimeConfigCard` in Company Configurations already sends the correct threshold field for the active basis. No change needed for the PATCH body.

### Migration
No migration needed if these columns already exist. If `weeklyOtThresholdHours` or `cutoffOtThresholdHours` are not yet persisted, add them with defaults of `40` and `80` respectively.

---

## Change 4 — Smart OT Detection: OT-Config-Aware Filtering

**Affected endpoint:** `GET /api/overtime/smart-detect`

### Context
Smart OT currently detects all sessions that appear to have overtime with no awareness of the company's configured OT basis or thresholds. The client now passes the full OT configuration as query parameters so the server can filter correctly.

### New Query Parameters

| Param | Type | When sent | Description |
|---|---|---|---|
| `otBasis` | `string` | Always | `"daily"`, `"weekly"`, or `"cutoff"` |
| `threshold` | `number` | Always | The relevant threshold for the active basis |
| `periodStart` | `ISO date` | Only when `otBasis=cutoff` | Start of the active open cutoff period |
| `periodEnd` | `ISO date` | Only when `otBasis=cutoff` | End of the active open cutoff period |

**Example requests:**
```
GET /api/overtime/smart-detect?otBasis=daily&threshold=8
GET /api/overtime/smart-detect?otBasis=weekly&threshold=40
GET /api/overtime/smart-detect?otBasis=cutoff&threshold=80&periodStart=2026-03-16&periodEnd=2026-03-31
```

### Server Behavior Per Basis

**`daily`**
- Return punch logs where `(timeOut - timeIn) > threshold hours`
- Each log is evaluated independently

**`weekly`**
- Determine the current week (Monday–Sunday) for the employee
- Sum all session hours within that week
- Return logs that pushed the cumulative total past the threshold
- The `overtimeHours` field on each returned log = hours contributed above the threshold

**`cutoff`**
- Use `periodStart`/`periodEnd` as the window (fall back to current open cutoff period for the employee's department if params absent)
- Sum all session hours within that window
- Return logs that pushed the cumulative total past the threshold
- If no active cutoff period is found, return an empty array (do not error)

### Backwards Compatibility
If `otBasis` is not provided, fall back to the current behavior (detect based on daily threshold = 8h). This ensures old clients continue to work.

---

## Change 5 — Employment Details: Include Department Info

**Affected endpoint:** `GET /api/employment-details/me`

### Context
Punch Logs now fetches employment details to get the employee's department, needed for:
- Displaying department name in the OT Info Panel
- Fetching the active cutoff period (`GET /api/cutoff-periods?departmentId=...`)

### Response Addition

```json
{
  "data": {
    "jobTitle": "Teacher",
    "departmentId": "dept-uuid",
    "department": {
      "id": "dept-uuid",
      "name": "Teachers"
    }
  }
}
```

If the department relation is already included in this response, no change needed. If not, add it.

---

## Change 6 — Department Schedule Inheritance for New/Transferred Employees

**Affected endpoints:** `GET /api/shiftschedules` · `POST /api/shiftschedules/:scheduleId/apply-to-employee`

### Context
When an employee is added to a department (new employee or department transfer), the client now checks whether that department has active recurring schedules and prompts the admin to apply them. Two endpoints are needed to support this.

### 1. `GET /api/shiftschedules` — new query parameters

The existing list endpoint must support filtering by department and status:

| Param | Type | Description |
|---|---|---|
| `departmentId` | `string` | Filter schedules assigned to this department (`assignmentType = "department"` and `targetId = departmentId`) |
| `status` | `"active"` | Return only active schedules (i.e., `isActive = true` and `endDate` is null or in the future) |

**Example:**
```
GET /api/shiftschedules?departmentId=dept-uuid&status=active
```

**Response** — same shape as existing list, filtered:
```json
{
  "data": [
    {
      "id": "schedule-uuid",
      "shiftId": "shift-uuid",
      "shift": { "shiftName": "Morning Shift" },
      "daysOfWeek": [1, 2, 3, 4, 5],
      "startDate": "2026-01-01",
      "endDate": null,
      "assignmentType": "department",
      "targetId": "dept-uuid",
      "isActive": true
    }
  ]
}
```

If neither param is provided, the existing behavior (return all) is preserved.

### 2. `POST /api/shiftschedules/:scheduleId/apply-to-employee` — new endpoint

Applies an existing recurring schedule to a single employee by generating their `UserShift` records.

**Request body:**
```json
{ "employeeId": "user-uuid" }
```

**Server behavior:**
- Look up the `ShiftSchedule` by `scheduleId`
- For every date in `startDate`–`endDate` (or from `startDate` forward if `endDate` is null, up to a reasonable horizon e.g. 1 year) that falls on a day in `daysOfWeek`:
  - Create a `UserShift` record for the employee on that date with that shift
  - Skip dates where the employee already has a `UserShift` (treat as `skipConflicts: true`)
- Return a summary of created records

**Response:**
```json
{
  "message": "Schedule applied successfully",
  "data": {
    "created": 52,
    "skipped": 3
  }
}
```

**Validation:**
- `scheduleId` must exist and belong to the same company
- `employeeId` must exist and belong to the same company
- If `isActive = false` or schedule is expired, return `400` with a clear message

### Notes
- This is always a **skip-on-conflict** operation — never overwrites existing `UserShift` records
- The client calls this endpoint once per selected schedule; multiple schedules are applied sequentially
- No breaking changes: existing `GET /api/shiftschedules` without params continues to return all schedules
