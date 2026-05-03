# Server-Side Changelog — v2.12.0

Tracks required backend changes that must be coordinated with client releases.

---

## Change 1 — `POST /api/shiftschedules/create`: Accept `targetIds[]` for Multi-Employee Individual Assignment

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

> **Backwards-compat note:** The server may also accept the old `targetId: string` for individual type (treat it as `targetIds: [targetId]`) if that's easier to implement. The client will always send `targetIds[]` once updated.

---

### Server logic for `assignmentType === "individual"`

1. **Validate** — all IDs in `targetIds` must belong to the authenticated company. Reject 400 if any are foreign or missing.

2. **Conflict detection (first pass, no flags set):**
   - Run the existing conflict check for **each** employee in `targetIds`.
   - Aggregate all conflicts across all employees into a **single 409 response**.
   - Response shape:

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

3. **`skipConflicts: true`** — create records only for dates that don't conflict per employee. Employees with zero non-conflicting dates get no record (do not error, just skip).

4. **`replaceConflicts: true`** — delete conflicting `UserShift` records first per employee, then create all dates.

5. **Creation** — one `ShiftSchedule` row per employee (same schema as today). Result is N separate records, each independently editable/deletable.

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

---

### What does NOT change

- `POST /api/shiftschedules/create` with `assignmentType: "department"` — still accepts `targetId: string`.
- `POST /api/shiftschedules/create` with `assignmentType: "all"` — still accepts `targetId: null`.
- `GET /api/shiftschedules`, `PUT /api/shiftschedules/:id`, `DELETE /api/shiftschedules/:id` — no change.
- `GET /api/shifts` — no change. `startTime` and `endTime` already included.

---

**Client side:** `Schedules.jsx` — Create Recurring Schedule modal. `scheduleForm.targetId` replaced with `scheduleForm.targetIds[]` for individual type. On submit: sends one `POST /api/shiftschedules/create` with the full `targetIds` array. Conflict dialog updated to show per-employee conflict list. No change to edit or delete flows.

---
