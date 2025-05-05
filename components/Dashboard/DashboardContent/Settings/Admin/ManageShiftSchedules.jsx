"use client";

import { useEffect, useMemo, useState } from "react";
import { PlusCircle, Edit3, Trash2, ChevronUp, ChevronDown, Search, Calendar, AlertCircle, RefreshCw, XCircle, Filter, Users } from "lucide-react";
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

/* ---------- helpers ---------- */
const DAY_OPTIONS = [
  { value: "MO", label: "MO" },
  { value: "TU", label: "TU" },
  { value: "WE", label: "WE" },
  { value: "TH", label: "TH" },
  { value: "FR", label: "FR" },
  { value: "SA", label: "SA" },
  { value: "SU", label: "SU" },
];

// Add this mapping function near the top of the file, after the DAY_OPTIONS constant
const dayCodeToName = {
  MO: "Mon",
  TU: "Tues",
  WE: "Wed",
  TH: "Thurs",
  FR: "Fri",
  SA: "Sat",
  SU: "Sun",
};

function buildRRule(byday, dtStartISO) {
  return new RRule({
    freq: RRule.WEEKLY,
    byweekday: byday.map((d) => RRule[d]),
    dtstart: new Date(dtStartISO),
  }).toString();
}

function parseRRule(rule) {
  try {
    const r = RRule.fromString(rule);
    return (r.options.byweekday || []).map((w) => w.toString().slice(0, 2));
  } catch {
    return [];
  }
}

function ManageShiftSchedules() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  /* ---------- state ---------- */
  const [schedules, setSchedules] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    shiftId: "",
    byday: ["MO", "TU", "WE", "TH", "FR"],
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: "",
    assignedToAll: true,
    assignedUserId: "",
  });

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ ...createForm, id: null });

  const [showDelete, setShowDelete] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [filters, setFilters] = useState({ name: "" });
  const [sortConfig, setSortConfig] = useState({ key: "startDate", direction: "descending" });

  /* ---------- fetch ---------- */
  useEffect(() => {
    if (token) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [schRes, shiftRes, userRes] = await Promise.all([
        fetch(`${API_URL}/api/shiftschedules`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/shifts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/employee`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const [schData, shiftData, userData] = await Promise.all([schRes.json(), shiftRes.json(), userRes.json()]);
      if (schRes.ok) setSchedules(schData.data || []);
      else toast.message(schData.error || "Failed to fetch schedules.");
      if (shiftRes.ok) setShifts(shiftData.data || []);
      else toast.message(shiftData.error || "Failed to fetch shifts.");
      if (userRes.ok) setUsers(userData.data || []);
      else toast.message(userData.error || "Failed to fetch users.");
    } catch (e) {
      console.error(e);
      toast.message("Failed to fetch data.");
    }
    setLoading(false);
  }

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await fetchAll();
      toast.message("Data refreshed");
    } catch (e) {
      console.error(e);
      toast.message("Failed to refresh data.");
    }
    setRefreshing(false);
  };

  /* ---------- helpers ---------- */
  const shiftMap = useMemo(() => Object.fromEntries(shifts.map((s) => [s.id, s.shiftName])), [shifts]);

  function filteredSorted() {
    const data = schedules.filter((s) => shiftMap[s.shiftId]?.toLowerCase().includes(filters.name.toLowerCase()));
    if (sortConfig.key) {
      data.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === "startDate") {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        } else {
          aVal = (aVal ?? "").toString().toLowerCase();
          bVal = (bVal ?? "").toString().toLowerCase();
        }
        if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }

  /* ---------- create ---------- */
  function openCreate() {
    setCreateForm({
      shiftId: shifts[0]?.id || "",
      byday: ["MO", "TU", "WE", "TH", "FR"],
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: "",
      assignedToAll: true,
      assignedUserId: "",
    });
    setShowCreate(true);
  }

  async function handleCreate() {
    if (!createForm.shiftId) return toast.message("Select shift template.");
    if (createForm.byday.length === 0) return toast.message("Select day(s).");
    setActionLoading(true);

    const payload = {
      shiftId: createForm.shiftId,
      recurrencePattern: buildRRule(createForm.byday, `${createForm.startDate}T00:00:00Z`),
      startDate: createForm.startDate,
      endDate: createForm.endDate || null,
      assignedToAll: createForm.assignedToAll,
      assignedUserId: createForm.assignedToAll ? null : createForm.assignedUserId,
    };

    try {
      const res = await fetch(`${API_URL}/api/shiftschedules/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 201 || res.status === 200) {
        toast.message(data.message || "Schedule created.");
        setShowCreate(false);
        fetchAll();
      } else toast.message(data.error || "Failed to create schedule.");
    } catch (e) {
      console.error(e);
      toast.message("Failed to create schedule.");
    } finally {
      setActionLoading(false);
    }
  }

  /* ---------- edit ---------- */
  function openEdit(sch) {
    setEditForm({
      id: sch.id,
      shiftId: sch.shiftId,
      byday: parseRRule(sch.recurrencePattern),
      startDate: sch.startDate.slice(0, 10),
      endDate: sch.endDate?.slice(0, 10) || "",
      assignedToAll: sch.assignedToAll,
      assignedUserId: sch.assignedUserId || "",
    });
    setShowEdit(true);
  }

  async function handleSaveEdit() {
    const { id, shiftId, byday, startDate, endDate, assignedToAll, assignedUserId } = editForm;

    if (!shiftId) return toast.message("Select shift template.");
    if (byday.length === 0) return toast.message("Select day(s).");
    setActionLoading(true);

    const payload = {
      shiftId,
      recurrencePattern: buildRRule(byday, `${startDate}T00:00:00Z`),
      startDate,
      endDate: endDate || null,
      assignedToAll,
      assignedUserId: assignedToAll ? null : assignedUserId,
    };

    try {
      const res = await fetch(`${API_URL}/api/shiftschedules/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.message(data.message || "Schedule updated.");
        setShowEdit(false);
        fetchAll();
      } else toast.message(data.error || "Failed to update schedule.");
    } catch (e) {
      console.error(e);
      toast.message("Failed to update schedule.");
    } finally {
      setActionLoading(false);
    }
  }

  /* ---------- delete ---------- */
  function openDelete(schedule) {
    setScheduleToDelete(schedule);
    setShowDelete(true);
  }

  async function confirmDelete() {
    if (!scheduleToDelete) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/shiftschedules/${scheduleToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast.message(data.message || "Schedule deleted.");
        setSchedules((p) => p.filter((s) => s.id !== scheduleToDelete.id));
      } else toast.message(data.error || "Failed to delete schedule.");
    } catch (e) {
      console.error(e);
      toast.message("Failed to delete schedule.");
    } finally {
      setActionLoading(false);
      setShowDelete(false);
      setScheduleToDelete(null);
    }
  }

  /* ---------- render ---------- */
  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      <Toaster position="top-center" />

      {/* header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-7 w-7 text-orange-500" />
            Manage Shift Schedules
          </h2>
          <p className="text-muted-foreground mt-1">Create and manage recurring shift schedules</p>
        </div>

        <div className="flex gap-2">
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
              <TooltipContent>
                <p>Refresh data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Schedule
              </Button>
            </DialogTrigger>

            {/* create dialog */}
            <DialogContent className="border-2 dark:border-white/10 max-w-xl">
              <div className="h-1 w-full bg-orange-500 -mt-6 mb-4"></div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                    <PlusCircle className="h-5 w-5" />
                  </div>
                  Create New Schedule
                </DialogTitle>
                <DialogDescription>Add a new recurring shift schedule</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* shift template */}
                <div className="grid grid-cols-4 items-center gap-4 text-sm">
                  <label className="text-right font-medium">Shift Template</label>
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
                            setCreateForm((p) => {
                              const exists = p.byday.includes(d.label);
                              const list = exists ? p.byday.filter((x) => x !== d.label) : [...p.byday, d.label];
                              return { ...p, byday: list };
                            })
                          }
                        >
                          {dayCodeToName[d.label] || d.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* dates */}
                {["startDate", "endDate"].map((field) => (
                  <div key={field} className="grid grid-cols-4 items-center gap-4 text-sm">
                    <label className="text-right font-medium">{field === "startDate" ? "Start Date" : "End Date (opt.)"}</label>
                    <Input
                      type="date"
                      className="col-span-3"
                      value={createForm[field]}
                      onChange={(e) => setCreateForm((p) => ({ ...p, [field]: e.target.value }))}
                    />
                  </div>
                ))}

                {/* assign to all */}
                <div className="grid grid-cols-4 items-center gap-4 text-sm">
                  <label className="text-right font-medium">Assign to</label>
                  <div className="col-span-3">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="assignToAll"
                        className="mr-2"
                        checked={createForm.assignedToAll}
                        onChange={(e) =>
                          setCreateForm((p) => ({
                            ...p,
                            assignedToAll: e.target.checked,
                          }))
                        }
                      />
                      <label htmlFor="assignToAll" className="text-sm">
                        Assign to all users
                      </label>
                    </div>
                    {!createForm.assignedToAll && (
                      <Select value={createForm.assignedUserId} onValueChange={(v) => setCreateForm((p) => ({ ...p, assignedUserId: v }))}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {users.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={actionLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
                  {actionLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    <span>Create Schedule</span>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* filters and search */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Filter className="h-5 w-5" />
            </div>
            Search & Filter
          </CardTitle>
          <CardDescription>Find schedules by shift name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center border rounded-md px-3 py-2 bg-black/5 dark:bg-white/5">
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Filter by shift name"
                  value={filters.name}
                  onChange={(e) => setFilters({ name: e.target.value })}
                  className="border-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {filters.name && (
                  <Button variant="ghost" size="icon" onClick={() => setFilters({ name: "" })} className="h-6 w-6 p-0 text-muted-foreground">
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Showing {filteredSorted().length} of {schedules.length} schedules
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSortConfig({
                          key: "startDate",
                          direction: sortConfig.key === "startDate" && sortConfig.direction === "ascending" ? "descending" : "ascending",
                        })
                      }
                      className={`${sortConfig.key === "startDate" ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}`}
                    >
                      Date{" "}
                      {sortConfig.key === "startDate" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sort by start date</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* table */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Calendar className="h-5 w-5" />
            </div>
            Shift Schedules
          </CardTitle>
          <CardDescription>Manage your organization's recurring shift schedules</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() =>
                      setSortConfig({
                        key: "shift",
                        direction: sortConfig.key === "shift" && sortConfig.direction === "ascending" ? "descending" : "ascending",
                      })
                    }
                  >
                    <div className="flex items-center">
                      Shift{" "}
                      {sortConfig.key === "shift" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </div>
                  </TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() =>
                      setSortConfig({
                        key: "startDate",
                        direction: sortConfig.key === "startDate" && sortConfig.direction === "ascending" ? "descending" : "ascending",
                      })
                    }
                  >
                    <div className="flex items-center">
                      Start Date{" "}
                      {sortConfig.key === "startDate" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </div>
                  </TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-20 ml-auto" />
                        </TableCell>
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
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
                            {shiftMap[s.shiftId] || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {parseRRule(s.recurrencePattern).map((day) => (
                              <Badge key={day} variant="outline" className="border-orange-500/30 text-orange-700 dark:text-orange-400">
                                {dayCodeToName[day] || day}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-orange-500" />
                            {s.startDate.slice(0, 10)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {s.endDate ? (
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1 text-orange-500" />
                              {s.endDate.slice(0, 10)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No end date</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {s.assignedToAll ? (
                            <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                              <Users className="h-3 w-3 mr-1" />
                              All users
                            </Badge>
                          ) : (
                            <span className="text-sm">{users.find((u) => u.id === s.assignedUserId)?.email || "—"}</span>
                          )}
                        </TableCell>
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
                                <TooltipContent>
                                  <p>Edit schedule</p>
                                </TooltipContent>
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
                                <TooltipContent>
                                  <p>Delete schedule</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Calendar className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p>No schedules found matching your filters</p>
                        {filters.name && (
                          <Button variant="link" onClick={() => setFilters({ name: "" })} className="text-orange-500 hover:text-orange-600 mt-2">
                            Clear all filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* edit dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="border-2 dark:border-white/10 max-w-xl">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4"></div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <Edit3 className="h-5 w-5" />
              </div>
              Edit Schedule
            </DialogTitle>
            <DialogDescription>Update shift schedule information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* shift */}
            <div className="grid grid-cols-4 items-center gap-4 text-sm">
              <label className="text-right font-medium">Shift Template</label>
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
                        setEditForm((p) => {
                          const exists = p.byday.includes(d.label);
                          const list = exists ? p.byday.filter((x) => x !== d.label) : [...p.byday, d.label];
                          return { ...p, byday: list };
                        })
                      }
                    >
                      {dayCodeToName[d.label] || d.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* dates */}
            {["startDate", "endDate"].map((field) => (
              <div key={field} className="grid grid-cols-4 items-center gap-4 text-sm">
                <label className="text-right font-medium">{field === "startDate" ? "Start Date" : "End Date (opt.)"}</label>
                <Input
                  type="date"
                  className="col-span-3"
                  value={editForm[field]}
                  onChange={(e) => setEditForm((p) => ({ ...p, [field]: e.target.value }))}
                />
              </div>
            ))}

            {/* assign */}
            <div className="grid grid-cols-4 items-center gap-4 text-sm">
              <label className="text-right font-medium">Assign to</label>
              <div className="col-span-3">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="editAssignToAll"
                    className="mr-2"
                    checked={editForm.assignedToAll}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        assignedToAll: e.target.checked,
                      }))
                    }
                  />
                  <label htmlFor="editAssignToAll" className="text-sm">
                    Assign to all users
                  </label>
                </div>
                {!editForm.assignedToAll && (
                  <Select value={editForm.assignedUserId} onValueChange={(v) => setEditForm((p) => ({ ...p, assignedUserId: v }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {users.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={actionLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {actionLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete confirmation dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-800/50">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4"></div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              Delete Schedule
            </DialogTitle>
            <DialogDescription>Are you sure you want to delete this schedule? This action cannot be undone.</DialogDescription>
          </DialogHeader>

          {scheduleToDelete && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-red-600 dark:text-red-400">
                <div>
                  <span className="opacity-70">Shift:</span> <span className="font-medium">{shiftMap[scheduleToDelete.shiftId] || "—"}</span>
                </div>
                <div>
                  <span className="opacity-70">Days:</span>{" "}
                  <span className="font-medium">
                    {parseRRule(scheduleToDelete.recurrencePattern)
                      .map((day) => dayCodeToName[day] || day)
                      .join(", ")}
                  </span>
                </div>
                <div>
                  <span className="opacity-70">Start Date:</span> <span className="font-medium">{scheduleToDelete.startDate.slice(0, 10)}</span>
                </div>
                <div>
                  <span className="opacity-70">Assigned:</span>{" "}
                  <span className="font-medium">
                    {scheduleToDelete.assignedToAll ? "All users" : users.find((u) => u.id === scheduleToDelete.assignedUserId)?.email || "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setShowDelete(false)}
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              {actionLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Deleting...
                </span>
              ) : (
                <span>Delete Schedule</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ManageShiftSchedules;
