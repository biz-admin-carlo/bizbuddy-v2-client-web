# WIP — Superadmin Support Account (Client-Side)

**Branch:** `wip/superadmin-support-account`
**Session Date:** 2026-04-03
**Status:** Parked — resumable when server-side `x-company-id` rollout is complete

---

## Goal

Allow a platform-level support account to log in, select any company from a dropdown, and manage that company's data (employees, departments, etc.) — without being tied to a single company in the database.

The simpler short-term workaround is a shared admin email added to each company manually.

---

## Approach Decided

Use the existing `superadmin` role with `companyId: null` in the DB (Option A — no schema migration). The client passes the selected company via `x-company-id` request header on every API call. The server reads that header when `role === "superadmin"`.

---

## Server Changes (Done — separate repo)

Documented in `docs/change-for-this-session.md` on the server.

1. **`signIn`** — `companyId` no longer required for superadmin; lookup uses `{ email, companyId: null }`
2. **`getUserProfile`** — token with `companyId: null` no longer rejected; subscription lookup skipped
3. **`GET /api/company/all`** — existing endpoint, confirmed working for superadmin role

**Still needed on server before this branch can ship:**
- All company-scoped controllers must read `x-company-id` header when `role === "superadmin"` (employees, departments, shifts, punch logs, leave, overtime, cutoff, locations, settings, etc.)

---

## Client Changes (This Branch)

### `store/useAuthStore.js`
- Added `activeCompanyId: null` state (persisted to localStorage)
- Added `setActiveCompanyId(id)` action
- `logout()` now clears `activeCompanyId`

### `app/(auth)/sign-in/page.jsx`
- Detects superadmin (`companyId: null` + `role: superadmin`) after step 1 email lookup
- Step 2 skips company selection entirely — shows a "Super Admin" badge instead
- Login body omits `companyId` for superadmin
- Password form shows immediately without needing a company selected

### `components/Dashboard/sidebar.jsx`
- Company switcher dropdown (superadmin only) — calls `GET /api/company/all`, appears between user info and nav panels
- Selecting a company sets `activeCompanyId` in the store (persisted across sessions)
- Superadmin with no company selected → clean slate with empty-state prompt, all nav panels hidden
- Superadmin with company selected → both Employee Panel and Company Panel visible
- Counts/notification fetch skipped when superadmin + no company; passes `x-company-id` header when company is active
- BizBuddy Panel always visible for superadmin (platform-level, not company-scoped)
- Superadmin always gets `"pro"` plan to bypass feature locks

### `lib/apiFetch.js` *(new file)*
- Thin `fetch` wrapper that auto-injects `Authorization: Bearer ${token}` and `x-company-id: ${activeCompanyId}` headers
- Reads from `useAuthStore.getState()` — safe to call outside React components
- Intended to replace all raw `fetch()` calls in dashboard components

---

## What's Left Before This Can Ship

1. **Server:** Audit all company-scoped controllers to read `x-company-id` header when `role === "superadmin"` (~10–15 controllers)
2. **Client:** Roll out `apiFetch` across ~47 dashboard component files (~190 fetch calls) to replace raw `fetch()` — mechanical but wide-surface change
3. **Test:** End-to-end flow — login as superadmin, select company, verify all panels show correct company data

---

## Files Changed

| File | Change |
|---|---|
| `store/useAuthStore.js` | Added `activeCompanyId`, `setActiveCompanyId`, clear on logout |
| `app/(auth)/sign-in/page.jsx` | Superadmin login bypass |
| `components/Dashboard/sidebar.jsx` | Company switcher, panel visibility, plan bypass |
| `lib/apiFetch.js` | New shared fetch utility |
