// components/Dashboard/DashboardContent/Settings/Admin/ManageShifts.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState } from "react";
import { PlusCircle, Edit3, Trash2, ChevronUp, ChevronDown, Clock, RefreshCw, Filter, Check } from "lucide-react";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

const toUtcIso = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m)).toISOString();
};

const fmtClock = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString([], { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });

const totalHours = (a, b) => {
  if (!a || !b) return "—";
  let diff = new Date(b) - new Date(a);
  if (diff < 0) diff += 86400000;
  return (diff / 3600000).toFixed(2);
};

const columnOptions = [
  { value: "shiftName", label: "Shift Template" },
  { value: "startTime", label: "Start" },
  { value: "endTime", label: "End" },
  { value: "differentialMultiplier", label: "Multiplier" },
  { value: "totalHours", label: "Total hrs" },
  { value: "createdAt", label: "Created At" },
  { value: "updatedAt", label: "Updated At" },
];

export default function Shifts() {
  const { token } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    shiftName: "",
    startTime: "08:00",
    endTime: "17:00",
    differentialMultiplier: "1.0",
  });

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    shiftName: "",
    startTime: "",
    endTime: "",
    differentialMultiplier: "1.0",
  });

  const [showDelete, setShowDelete] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [filters, setFilters] = useState({ name: "" });
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "ascending" });
  const [columnVisibility, setColumnVisibility] = useState(columnOptions.map((c) => c.value));

  useEffect(() => {
    if (token) fetchShifts();
  }, [token]);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/shifts`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      if (r.ok) setShifts(j.data || []);
      else toast.message(j.message || "Failed to fetch shifts.");
    } catch {
      toast.message("Failed to fetch shifts.");
    }
    setLoading(false);
  };

  const refreshShifts = async () => {
    setRefreshing(true);
    await fetchShifts();
    setRefreshing(false);
  };

  const filteredSorted = useMemo(() => {
    const data = shifts.filter((s) => s.shiftName.toLowerCase().includes(filters.name.toLowerCase()));
    if (sortConfig.key) {
      data.sort((a, b) => {
        const aVal =
          sortConfig.key === "totalHours"
            ? Number(totalHours(a.startTime, a.endTime))
            : sortConfig.key === "differentialMultiplier"
            ? Number(a[sortConfig.key])
            : (a[sortConfig.key] ?? "").toString().toLowerCase();
        const bVal =
          sortConfig.key === "totalHours"
            ? Number(totalHours(b.startTime, b.endTime))
            : sortConfig.key === "differentialMultiplier"
            ? Number(b[sortConfig.key])
            : (b[sortConfig.key] ?? "").toString().toLowerCase();
        if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [shifts, filters, sortConfig]);

  const toggleColumn = (c) => setColumnVisibility((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const MultiColumnSelect = () => {
    const allChecked = columnVisibility.length === columnOptions.length;
    const toggle = (val) => {
      if (val === "all") return setColumnVisibility(allChecked ? [] : columnOptions.map((o) => o.value));
      setColumnVisibility((prev) => (prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]));
    };
    const label = allChecked
      ? "All columns"
      : columnVisibility.length === 0
      ? "No columns"
      : `${columnVisibility.length} selected`;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[180px] justify-between">
            {label}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 space-y-1" align="start">
          <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => toggle("all")}>
            <Checkbox checked={allChecked} />
            <span>All columns</span>
            {allChecked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {columnOptions.map((opt) => {
              const checked = columnVisibility.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => toggle(opt.value)}
                >
                  <Checkbox checked={checked} />
                  <span>{opt.label}</span>
                  {checked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const openCreate = () => {
    setCreateForm({ shiftName: "", startTime: "08:00", endTime: "17:00", differentialMultiplier: "1.0" });
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!createForm.shiftName.trim()) return toast.message("Shift name required.");
    setActionLoading(true);
    try {
      const payload = {
        shiftName: createForm.shiftName.trim(),
        startTime: toUtcIso(createForm.startTime),
        endTime: toUtcIso(createForm.endTime),
        differentialMultiplier: parseFloat(createForm.differentialMultiplier),
      };
      const r = await fetch(`${API}/api/shifts/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (r.status === 201 || r.status === 200) {
        toast.message(j.message || "Shift created.");
        setShowCreate(false);
        fetchShifts();
      } else toast.message(j.message || "Failed to create shift.");
    } catch {
      toast.message("Failed to create shift.");
    }
    setActionLoading(false);
  };

  const openEdit = (s) => {
    setEditForm({
      id: s.id,
      shiftName: s.shiftName,
      startTime: fmtClock(s.startTime),
      endTime: fmtClock(s.endTime),
      differentialMultiplier: String(s.differentialMultiplier),
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.shiftName.trim()) return toast.message("Shift name required.");
    setActionLoading(true);
    try {
      const payload = {
        shiftName: editForm.shiftName.trim(),
        startTime: toUtcIso(editForm.startTime),
        endTime: toUtcIso(editForm.endTime),
        differentialMultiplier: parseFloat(editForm.differentialMultiplier),
      };
      const r = await fetch(`${API}/api/shifts/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (r.ok) {
        toast.message(j.message || "Shift updated.");
        setShowEdit(false);
        fetchShifts();
      } else toast.message(j.message || "Failed to update shift.");
    } catch {
      toast.message("Failed to update shift.");
    }
    setActionLoading(false);
  };

  const openDelete = (s) => {
    setShiftToDelete(s);
    setShowDelete(true);
  };

  const confirmDelete = async () => {
    if (!shiftToDelete) return;
    setActionLoading(true);
    try {
      const r = await fetch(`${API}/api/shifts/${shiftToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (r.ok) {
        toast.message(j.message || "Shift deleted.");
        setShifts((p) => p.filter((x) => x.id !== shiftToDelete.id));
      } else toast.message(j.message || "Failed to delete shift.");
    } catch {
      toast.message("Failed to delete shift.");
    }
    setActionLoading(false);
    setShowDelete(false);
    setShiftToDelete(null);
  };

  const labelClass = "my-auto shrink-0 text-sm font-medium text-muted-foreground";

  return (
    <div className="max-w-full mx-auto p-4 lg:px-4 px-1 space-y-8">
      <Toaster />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-7 w-7 text-orange-500" />
            Company Shift Templates
          </h2>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link href="/dashboard/company/shifts">Shift Schedules</Link>
          </Button>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={refreshShifts} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh shifts</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Shift
              </Button>
            </DialogTrigger>
            <DialogContent className="border-2 dark:border-white/10">
              <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                    <PlusCircle className="h-5 w-5" />
                  </div>
                  Create New Shift
                </DialogTitle>
                <DialogDescription>Add a new shift template to your organization</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {[
                  ["shiftName", "Shift Template", "text"],
                  ["startTime", "Start Time", "time"],
                  ["endTime", "End Time", "time"],
                  ["differentialMultiplier", "Multiplier", "number"],
                ].map(([field, label, type]) => (
                  <div key={field} className="grid grid-cols-4 items-center gap-4 text-sm">
                    <label className="text-right font-medium" htmlFor={`c-${field}`}>
                      {label}
                    </label>
                    <Input
                      id={`c-${field}`}
                      type={type}
                      step={field === "differentialMultiplier" ? "0.1" : undefined}
                      className="col-span-3"
                      value={createForm[field]}
                      onChange={(e) => setCreateForm((p) => ({ ...p, [field]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={actionLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
                  {actionLoading ? "Creating..." : "Create Shift"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2 relative">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Filter className="h-5 w-5" />
            </div>
            Table Controls
          </CardTitle>
          <span className="absolute top-2 right-4 text-sm text-muted-foreground">
            {filteredSorted.length} of {shifts.length}
          </span>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <span className={labelClass}>Columns:</span>
              <MultiColumnSelect />
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <span className={labelClass}>Filter:</span>
              <Input
                placeholder="Shift name"
                value={filters.name}
                onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))}
                className="h-8 max-w-xs"
              />
              {filters.name && (
                <Button variant="outline" size="sm" onClick={() => setFilters({ name: "" })}>
                  Clear Filter
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Clock className="h-5 w-5" />
            </div>
            Shift Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columnOptions
                    .filter((c) => columnVisibility.includes(c.value))
                    .map(({ value, label }) => (
                      <TableHead
                        key={value}
                        className="text-center text-nowrap cursor-pointer"
                        onClick={() =>
                          setSortConfig((p) => ({
                            key: value,
                            direction: p.key === value && p.direction === "ascending" ? "descending" : "ascending",
                          }))
                        }
                      >
                        <div className="flex items-center justify-center">
                          {label}
                          {sortConfig.key === value &&
                            (sortConfig.direction === "ascending" ? (
                              <ChevronUp className="h-4 w-4 ml-1" />
                            ) : (
                              <ChevronDown className="h-4 w-4 ml-1" />
                            ))}
                        </div>
                      </TableHead>
                    ))}
                  <TableHead className="text-center text-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        {columnVisibility.concat("actions").map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                ) : filteredSorted.length ? (
                  <AnimatePresence>
                    {filteredSorted.map((s) => (
                      <motion.tr
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        {columnVisibility.includes("shiftName") && <TableCell>{s.shiftName}</TableCell>}
                        {columnVisibility.includes("startTime") && <TableCell>{fmtClock(s.startTime)}</TableCell>}
                        {columnVisibility.includes("endTime") && <TableCell>{fmtClock(s.endTime)}</TableCell>}
                        {columnVisibility.includes("differentialMultiplier") && (
                          <TableCell>{s.differentialMultiplier}x</TableCell>
                        )}
                        {columnVisibility.includes("totalHours") && <TableCell>{totalHours(s.startTime, s.endTime)}</TableCell>}
                        {columnVisibility.includes("createdAt") && (
                          <TableCell className="text-nowrap">{fmtDateTime(s.createdAt)}</TableCell>
                        )}
                        {columnVisibility.includes("updatedAt") && (
                          <TableCell className="text-nowrap">{fmtDateTime(s.updatedAt)}</TableCell>
                        )}
                        <TableCell>
                          <div className="flex justify-center gap-1">
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
                                <TooltipContent>Edit shift</TooltipContent>
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
                                <TooltipContent>Delete shift</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columnVisibility.length + 1} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Clock className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p>No shifts found matching your filters</p>
                        {filters.name && (
                          <Button
                            variant="link"
                            onClick={() => setFilters({ name: "" })}
                            className="text-orange-500 hover:text-orange-600 mt-2"
                          >
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

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <Edit3 className="h-5 w-5" />
              </div>
              Edit Shift
            </DialogTitle>
            <DialogDescription>Update shift template information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {[
              ["shiftName", "Shift Template", "text"],
              ["startTime", "Start Time", "time"],
              ["endTime", "End Time", "time"],
              ["differentialMultiplier", "Multiplier", "number"],
            ].map(([field, label, type]) => (
              <div key={field} className="grid grid-cols-4 items-center gap-4 text-sm">
                <label className="text-right font-medium" htmlFor={`e-${field}`}>
                  {label}
                </label>
                <Input
                  id={`e-${field}`}
                  type={type}
                  step={field === "differentialMultiplier" ? "0.1" : undefined}
                  className="col-span-3"
                  value={editForm[field]}
                  onChange={(e) => setEditForm((p) => ({ ...p, [field]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={actionLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {actionLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-800/50">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                <Clock className="h-5 w-5" />
              </div>
              Delete Shift
            </DialogTitle>
            <DialogDescription>Are you sure you want to delete this shift? This action cannot be undone.</DialogDescription>
          </DialogHeader>

          {shiftToDelete && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-red-600 dark:text-red-400">
                <div>
                  <span className="opacity-70">Shift Template:</span>{" "}
                  <span className="font-medium">{shiftToDelete.shiftName}</span>
                </div>
                <div>
                  <span className="opacity-70">Hours:</span>{" "}
                  <span className="font-medium">{totalHours(shiftToDelete.startTime, shiftToDelete.endTime)}</span>
                </div>
                <div>
                  <span className="opacity-70">Start Time:</span>{" "}
                  <span className="font-medium">{fmtClock(shiftToDelete.startTime)}</span>
                </div>
                <div>
                  <span className="opacity-70">End Time:</span>{" "}
                  <span className="font-medium">{fmtClock(shiftToDelete.endTime)}</span>
                </div>
                <div>
                  <span className="opacity-70">Created:</span>{" "}
                  <span className="font-medium">{fmtDateTime(shiftToDelete.createdAt)}</span>
                </div>
                <div>
                  <span className="opacity-70">Updated:</span>{" "}
                  <span className="font-medium">{fmtDateTime(shiftToDelete.updatedAt)}</span>
                </div>
              </div>
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
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={actionLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              {actionLoading ? "Deleting..." : "Delete Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
