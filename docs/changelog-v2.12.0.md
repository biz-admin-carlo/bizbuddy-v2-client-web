# Server-Side Changelog — v2.12.0

Tracks required backend changes that must be coordinated with client releases.

---

## Change 1 — `POST /api/shiftschedules/create`: Accept `targetIds[]` for Multi-Employee Individual Assignment

**Ticket:** "Create Recurring Schedule" currently only allows assigning one employee at a time (`targetId: string`). The UI is being updated to a multi-select checkbox list — users pick N employees in one form submission, expecting one schedule record created per employee in a single operation. The current endpoint forces the client to fire N separate requests, which makes conflict aggregation and error reporting fragmented.

**Status:** Shipped.

**Endpoint spec (as implemented):**

- **Request body:** `targetIds: string[]` for `individual` type. `targetId` (single string) still used for `department`; `targetId: null` for `all`. Unchanged contract for `department` and `all` branches.

- **Conflict 409:** `userId` renamed to `targetId` in the public response. Internal fields (`conflictDates`, `conflictIds`) stripped from the JSON output — they remain on the internal conflict objects for `conflictMap` and `replaceConflicts` logic.

  ```json
  {
    "message": "Scheduling conflicts detected",
    "totalConflicts": 7,
    "conflicts": [
      { "targetId": "uuid-emp-1", "userName": "Juan dela Cruz", "userEmail": "juan@biz.com", "conflictCount": 3 },
      { "targetId": "uuid-emp-2", "userName": "Maria Santos",   "userEmail": "maria@biz.com", "conflictCount": 4 }
    ]
  }
  ```

- **Transaction (`individual` branch):** Tracks `assignedCount` per employee and builds a `scheduleResults[]` array. Employees with zero non-conflicting dates get `{ targetId, skipped: true, reason: "no non-conflicting dates" }` — no record created, no error thrown.

- **Success response (`individual` type):**

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

- **`department` and `all` types:** Untouched — still return the existing data wrapper shape.

**Client side:** `Schedules.jsx` — Create Recurring Schedule modal. `scheduleForm.targetId` replaced with `scheduleForm.targetIds[]` for individual type. On submit: sends one `POST /api/shiftschedules/create` with the full `targetIds` array. Conflict dialog updated to show per-employee conflict list. No change to edit or delete flows.

---
