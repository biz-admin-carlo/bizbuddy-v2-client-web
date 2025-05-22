/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PlusCircle, Edit3, Trash2, Search, Calendar, AlertCircle, RefreshCw, XCircle, Filter, Check, Info, ChevronDown, Mail } from "lucide-react";
import { toast, Toaster } from "sonner";
import { RRule } from "rrule";
import { format } from "date-fns";
import useAuthStore from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

/* ════════════ CONSTANTS ════════════ */
const DAY_OPTIONS = [
  { value: "MO", label: "MO" },
  { value: "TU", label: "TU" },
  { value: "WE", label: "WE" },
  { value: "TH", label: "TH" },
  { value: "FR", label: "FR" },
  { value: "SA", label: "SA" },
  { value: "SU", label: "SU" },
];

const NUM_TO_CODE = {
  0: "MO",
  1: "TU",
  2: "WE",
  3: "TH",
  4: "FR",
  5: "SA",
  6: "SU",
};

const DAY_NAME = {
  0: "Mon",
  1: "Tue",
  2: "Wed",
  3: "Thu",
  4: "Fri",
  5: "Sat",
  6: "Sun",
  SU: "Sun",
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
};

/* ════════════ UTILITIES ════════════ */
const buildRRule = (byday, startISO) =>
  new RRule({
    freq: RRule.WEEKLY,
    byweekday: byday.map((d) => RRule[d]).filter(Boolean),
    dtstart: new Date(startISO),
  }).toString();

const parseRRule = (str) => {
  try {
    return RRule.fromString(str).options.byweekday.map((w) => w.toString().slice(0, 2));
  } catch {
    const m = str.match(/BYDAY=([^;]+)/i);
    if (!m) return [];
    return m[1].split(",").map((s) => (/^\d+$/.test(s) ? NUM_TO_CODE[s] || s : s.trim()));
  }
};

const totalHours = (a, b) => {
  let diff = new Date(b) - new Date(a);
  if (diff < 0) diff += 86_400_000;
  return (diff / 3_600_000).toFixed(2);
};

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/* ════════════ HOOKS ════════════ */
function useClickOutside(cb) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && cb();
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("touchstart", h);
    };
  }, [cb]);
  return ref;
}

/* ════════════ SELECT HELPERS ════════════ */
const labelForList = (ids, items, empty) => {
  if (!ids.length) return empty;
  if (ids.length === 1) return items.find((i) => i.id === ids[0])?.email || items.find((i) => i.id === ids[0])?.name || empty;
  return `${ids.length} selected`;
};

/* ---- USER SELECT ---- */
function MultiUserSelect({ list, setList, users, singleSelect = false }) {
  const selected = Array.isArray(list) ? list : [];
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  const sorted = useMemo(() => [...users].sort((a, b) => a.email.toLowerCase().localeCompare(b.email.toLowerCase())), [users]);

  const toggle = (id) => setList(selected.includes(id) ? selected.filter((x) => x !== id) : singleSelect ? [id] : [...selected, id]);

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" className="w-full justify-between" onClick={() => setOpen((o) => !o)}>
        {labelForList(selected, users, "Select user(s)")}
        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-64 rounded-md border bg-popover p-2 shadow-lg max-h-72 overflow-y-auto space-y-1">
          {sorted.map((u) => {
            const checked = selected.includes(u.id);
            return (
              <div key={u.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer select-none" onClick={() => toggle(u.id)}>
                <Checkbox checked={checked} />
                <span className="truncate">{u.email}</span>
                {checked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════ MAIN COMPONENT ════════════ */
function ManageShiftSchedules() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  /* ---------- STATE ---------- */
  const blankForm = {
    shiftId: "",
    departmentId: "",
    byday: ["MO", "TU", "WE", "TH", "FR"],
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: "",
    assignedUserIds: [],
  };

  const [schedules, setSchedules] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showShiftInfo, setShowShiftInfo] = useState(false);

  const [createForm, setCreateForm] = useState(blankForm);
  const [editForm, setEditForm] = useState({ ...blankForm, id: null });

  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [filters, setFilters] = useState({
    name: "",
    email: "",
  });
  const [sortConfig, setSortConfig] = useState({
    key: "startDate",
    direction: "descending",
  });

  /* ---------- FETCH ---------- */
  useEffect(() => {
    token && fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [schRes, shiftRes, userRes, deptRes] = await Promise.all([
        fetch(`${API_URL}/api/shiftschedules`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/shifts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/employee?all=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/departments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const [schData, shiftData, userData, deptData] = await Promise.all([schRes.json(), shiftRes.json(), userRes.json(), deptRes.json()]);

      if (schRes.ok) setSchedules(schData.data || []);
      else toast.message(schData.error || "Schedules error");

      if (shiftRes.ok) setShifts(shiftData.data || []);
      else toast.message(shiftData.error || "Shifts error");

      if (userRes.ok) setUsers(userData.data || []);
      else toast.message(userData.error || "Users error");

      if (deptRes.ok) setDepartments(deptData.data || []);
      else toast.message(deptData.error || "Departments error");
    } catch {
      toast.message("Fetch failed");
    }
    setLoading(false);
  }
  const refreshData = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  /* ---------- MAPS ---------- */
  const shiftMap = useMemo(() => Object.fromEntries(shifts.map((s) => [s.id, s.shiftName])), [shifts]);
  const shiftObjMap = useMemo(() => Object.fromEntries(shifts.map((s) => [s.id, s])), [shifts]);
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.email])), [users]);
  const userObjMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const usersByDept = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      const dId = u.department?.id;
      if (!dId) return;
      (map[dId] = map[dId] || []).push(u.id);
    });
    return map;
  }, [users]);

  /* ---------- FILTER & SORT ---------- */
  const passesFilters = (s) => {
    const shiftOk = shiftMap[s.shiftId]?.toLowerCase().includes(filters.name.toLowerCase()) ?? false;
    const user = userObjMap[s.assignedUserId];
    const emailOk = !filters.email ? true : user?.email?.toLowerCase().includes(filters.email.toLowerCase());
    return shiftOk && emailOk;
  };

  const filteredSorted = () => {
    const data = schedules.filter(passesFilters);
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      let A = a[sortConfig.key],
        B = b[sortConfig.key];
      if (sortConfig.key === "startDate") {
        A = new Date(A).getTime();
        B = new Date(B).getTime();
      } else {
        A = (A ?? "").toString().toLowerCase();
        B = (B ?? "").toString().toLowerCase();
      }
      if (A < B) return sortConfig.direction === "ascending" ? -1 : 1;
      if (A > B) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
  };

  /* ---------- CREATE HELPERS ---------- */
  const handleDeptSelect = (deptId) => {
    if (deptId === "none") {
      setCreateForm((p) => ({ ...p, departmentId: "", assignedUserIds: [] }));
      return;
    }
    const memberIds = usersByDept[deptId] || [];
    setCreateForm((p) => ({
      ...p,
      departmentId: deptId,
      assignedUserIds: memberIds,
    }));
  };

  /* ---------- CREATE ---------- */
  const openCreate = () => {
    setCreateForm({
      ...blankForm,
      shiftId: shifts[0]?.id || "",
    });
    setShowCreate(true);
  };

  const apiCreate = async (payload) => {
    const res = await fetch(`${API_URL}/api/shiftschedules/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).message || "Create fail");
  };

  const handleCreate = async () => {
    if (!createForm.shiftId) return toast.message("Select shift");
    if (!createForm.assignedUserIds.length) return toast.message("Select user(s)");
    const rule = buildRRule(createForm.byday, `${createForm.startDate}T00:00:00Z`);
    setActionLoading(true);
    try {
      for (const uid of createForm.assignedUserIds)
        await apiCreate({
          shiftId: createForm.shiftId,
          recurrencePattern: rule,
          startDate: createForm.startDate,
          endDate: createForm.endDate || null,
          assignedUserId: uid,
        });
      toast.message("Created");
      setShowCreate(false);
      fetchAll();
    } catch (e) {
      toast.message(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  /* ---------- EDIT ---------- */
  const openEdit = (s) => {
    setEditForm({
      ...blankForm,
      id: s.id,
      shiftId: s.shiftId,
      byday: parseRRule(s.recurrencePattern),
      startDate: s.startDate.slice(0, 10),
      endDate: s.endDate?.slice(0, 10) || "",
      assignedUserIds: [s.assignedUserId],
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    const { id, shiftId, byday, startDate, endDate, assignedUserIds } = editForm;
    if (!shiftId) return toast.message("Select shift");
    if (!byday.length) return toast.message("Select days");
    if (!assignedUserIds.length) return toast.message("Select at least one user");
    const rule = buildRRule(byday, `${startDate}T00:00:00Z`);
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/shiftschedules/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shiftId,
          recurrencePattern: rule,
          startDate,
          endDate: endDate || null,
          assignedUserId: assignedUserIds[0],
        }),
      });
      const j = await res.json();
      if (res.ok) {
        toast.message(j.message || "Updated");
        setShowEdit(false);
        fetchAll();
      } else toast.message(j.error || "Update failed");
    } catch {
      toast.message("Update failed");
    } finally {
      setActionLoading(false);
    }
  };

  /* ---------- DELETE ---------- */
  const openDelete = (s) => {
    setScheduleToDelete(s);
    setShowDelete(true);
  };
  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/shiftschedules/${scheduleToDelete.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (res.ok) {
        toast.message(j.message || "Deleted");
        setSchedules((p) => p.filter((x) => x.id !== scheduleToDelete.id));
      } else toast.message(j.error || "Delete failed");
    } finally {
      setActionLoading(false);
      setShowDelete(false);
      setScheduleToDelete(null);
    }
  };

  const openShiftInfo = (id) => {
    setSelectedShift(shiftObjMap[id] || null);
    setShowShiftInfo(true);
  };

  /* ════════════ RENDER ════════════ */
  return (
    <div className="max-w-full mx-auto p-4 lg:px-10 px-2 space-y-8">
      <Toaster position="top-center" />

      {/* ===== HEADER ===== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-7 w-7 text-orange-500" />
            Manage Shift Schedules
          </h2>
          <p className="text-muted-foreground mt-1">Create and manage recurring shift schedules</p>
        </div>

        <div className="flex gap-2">
          {/* refresh */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refreshData}
                  disabled={refreshing}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* ===== CREATE DIALOG ===== */}
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Schedule
              </Button>
            </DialogTrigger>

            <DialogContent className="border-2 dark:border-white/10 max-w-xl">
              <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-orange-500" />
                  Create New Schedule
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* shift */}
                <div className="grid grid-cols-4 items-center gap-4 text-sm">
                  <label className="text-right font-medium">Shift</label>
                  <Select value={createForm.shiftId} onValueChange={(v) => setCreateForm((p) => ({ ...p, shiftId: v }))}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {shifts.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.shiftName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* department */}
                <div className="grid grid-cols-4 items-center gap-4 text-sm">
                  <label className="text-right font-medium">Department</label>
                  <Select value={createForm.departmentId || "none"} onValueChange={handleDeptSelect}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments
                        .slice()
                        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
                        .map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* days */}
                <div className="grid grid-cols-4 items-start gap-4 text-sm">
                  <label className="text-right font-medium">Days</label>
                  <div className="col-span-3 flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((d) => {
                      const active = createForm.byday.includes(d.label);
                      return (
                        <Button
                          key={d.label}
                          size="sm"
                          variant={active ? "default" : "outline"}
                          className={`px-2 ${
                            active
                              ? "bg-orange-500 hover:bg-orange-600"
                              : "border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                          }`}
                          onClick={() =>
                            setCreateForm((p) => ({
                              ...p,
                              byday: active ? p.byday.filter((x) => x !== d.label) : [...p.byday, d.label],
                            }))
                          }
                        >
                          {DAY_NAME[d.label]}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* dates */}
                {["startDate", "endDate"].map((f) => (
                  <div key={f} className="grid grid-cols-4 items-center gap-4 text-sm">
                    <label className="text-right font-medium">{f === "startDate" ? "Start Date" : "End Date (opt.)"}</label>
                    <Input
                      type="date"
                      className="col-span-3"
                      value={createForm[f]}
                      onChange={(e) => setCreateForm((p) => ({ ...p, [f]: e.target.value }))}
                    />
                  </div>
                ))}

                {/* users */}
                <div className="grid grid-cols-4 items-start gap-4 text-sm">
                  <label className="text-right font-medium">Assign to</label>
                  <div className="col-span-3">
                    <MultiUserSelect
                      list={createForm.assignedUserIds}
                      setList={(arr) => setCreateForm((p) => ({ ...p, assignedUserIds: arr }))}
                      users={users}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={actionLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
                  {actionLoading ? "Creating…" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ===== FILTER CARD ===== */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-orange-500" />
            Search & Filter
          </CardTitle>
          <CardDescription>Filter schedules by shift name or user email</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            {/* shift filter */}
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-center border rounded-md px-3 py-2 bg-black/5 dark:bg-white/5">
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Shift name"
                  value={filters.name}
                  onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))}
                  className="border-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {/* email filter */}
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-center border rounded-md px-3 py-2 bg-black/5 dark:bg-white/5">
                <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="User email"
                  value={filters.email}
                  onChange={(e) => setFilters((p) => ({ ...p, email: e.target.value }))}
                  className="border-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {(filters.name || filters.email) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFilters({ name: "", email: "" })}
                className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
              >
                Clear
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Showing {filteredSorted().length} of {schedules.length} schedules
          </p>
        </CardContent>
      </Card>

      {/* ===== TABLE ===== */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            Shift Schedules
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Created&nbsp;At</TableHead>
                  <TableHead>Updated&nbsp;At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {Array(8)
                        .fill(null)
                        .map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))
                ) : filteredSorted().length ? (
                  <AnimatePresence>
                    {filteredSorted().map((s) => (
                      <motion.tr
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">
                          <Button variant="link" className="p-0 text-left flex items-center" onClick={() => openShiftInfo(s.shiftId)}>
                            <div className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
                            {shiftMap[s.shiftId] || "—"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {parseRRule(s.recurrencePattern).map((d) => (
                              <Badge key={d} variant="outline" className="border-orange-500/30 text-orange-700 dark:text-orange-400">
                                {DAY_NAME[d] || d}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{s.startDate.slice(0, 10)}</TableCell>
                        <TableCell>{s.endDate ? s.endDate.slice(0, 10) : "—"}</TableCell>
                        <TableCell>{userMap[s.assignedUserId] || "—"}</TableCell>
                        <TableCell>{fmtDateTime(s.createdAt)}</TableCell>
                        <TableCell>{fmtDateTime(s.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEdit(s)}
                                    className="text-orange-700 hover:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDelete(s)}
                                    className="text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      No schedules
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ===== EDIT DIALOG ===== */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="border-2 dark:border-white/10 max-w-xl">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-orange-500" />
              Edit Schedule
            </DialogTitle>
            <DialogDescription>Update shift schedule information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* shift */}
            <div className="grid grid-cols-4 items-center gap-4 text-sm">
              <label className="text-right font-medium">Shift</label>
              <Select value={editForm.shiftId} onValueChange={(v) => setEditForm((p) => ({ ...p, shiftId: v }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.shiftName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* days */}
            <div className="grid grid-cols-4 items-start gap-4 text-sm">
              <label className="text-right font-medium">Days</label>
              <div className="col-span-3 flex flex-wrap gap-2">
                {DAY_OPTIONS.map((d) => {
                  const active = editForm.byday.includes(d.label);
                  return (
                    <Button
                      key={d.label}
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className={`px-2 ${
                        active
                          ? "bg-orange-500 hover:bg-orange-600"
                          : "border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                      }`}
                      onClick={() =>
                        setEditForm((p) => ({
                          ...p,
                          byday: active ? p.byday.filter((x) => x !== d.label) : [...p.byday, d.label],
                        }))
                      }
                    >
                      {DAY_NAME[d.label]}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* dates */}
            {["startDate", "endDate"].map((f) => (
              <div key={f} className="grid grid-cols-4 items-center gap-4 text-sm">
                <label className="text-right font-medium">{f === "startDate" ? "Start Date" : "End Date (opt.)"}</label>
                <Input type="date" className="col-span-3" value={editForm[f]} onChange={(e) => setEditForm((p) => ({ ...p, [f]: e.target.value }))} />
              </div>
            ))}

            {/* users */}
            <div className="grid grid-cols-4 items-start gap-4 text-sm">
              <label className="text-right font-medium">Assign to</label>
              <div className="col-span-3">
                <MultiUserSelect
                  list={editForm.assignedUserIds}
                  setList={(arr) => setEditForm((p) => ({ ...p, assignedUserIds: arr }))}
                  users={users}
                  singleSelect
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={actionLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {actionLoading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE DIALOG ===== */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-800/50">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete Schedule
            </DialogTitle>
          </DialogHeader>

          {scheduleToDelete && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4 text-sm text-red-600 dark:text-red-400">
              <p>
                <span className="opacity-70">Shift:</span> {shiftMap[scheduleToDelete.shiftId] || "—"}
              </p>
              <p>
                <span className="opacity-70">User:</span> {userMap[scheduleToDelete.assignedUserId] || "—"}
              </p>
              <p>
                <span className="opacity-70">Days:</span>{" "}
                {parseRRule(scheduleToDelete.recurrencePattern)
                  .map((d) => DAY_NAME[d] || d)
                  .join(", ")}
              </p>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setShowDelete(false)}
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={actionLoading} className="bg-red-500 hover:bg-red-600">
              {actionLoading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== SHIFT DETAILS ===== */}
      <Dialog open={showShiftInfo} onOpenChange={setShowShiftInfo}>
        {selectedShift && (
          <DialogContent className="border-2 dark:border-white/10 max-w-md">
            <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-orange-500" />
                {selectedShift.shiftName}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-2 pt-2 text-sm">
              <div>
                <span className="opacity-70">Start:&nbsp;</span>
                {new Date(selectedShift.startTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div>
                <span className="opacity-70">End:&nbsp;</span>
                {new Date(selectedShift.endTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div>
                <span className="opacity-70">Total Hours:&nbsp;</span>
                {totalHours(selectedShift.startTime, selectedShift.endTime)}
              </div>
              <div>
                <span className="opacity-70">Multiplier:&nbsp;</span>
                {selectedShift.differentialMultiplier}x
              </div>
              {selectedShift.description && (
                <p className="pt-2">
                  <span className="opacity-70">Description:&nbsp;</span>
                  {selectedShift.description}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setShowShiftInfo(false)} className="bg-orange-500 hover:bg-orange-600 text-white">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

export default ManageShiftSchedules;
