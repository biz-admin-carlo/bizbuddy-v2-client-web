/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { PlusCircle, Edit3, Trash2, ChevronUp, ChevronDown, Search, Clock, AlertCircle, RefreshCw, XCircle, Filter } from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* ────────── helper functions ────────── */
const toUtcIso = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m)).toISOString();
};

const fmtClock = (iso) =>
  new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC", // keep as fixed wall-clock value
  });

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const totalHours = (startISO, endISO) => {
  if (!startISO || !endISO) return "—";
  let diff = new Date(endISO) - new Date(startISO);
  if (diff < 0) diff += 24 * 60 * 60 * 1000;
  return (diff / 36e5).toFixed(2);
};

/* ────────── component ────────── */
function ManageShifts() {
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
  const [sortConfig, setSortConfig] = useState({
    key: "shiftName",
    direction: "ascending",
  });

  /* ────────── fetch ────────── */
  useEffect(() => {
    if (token) fetchShifts();
  }, [token]);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/shifts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  /* ────────── filter + sort ────────── */
  const filteredSorted = () => {
    const data = shifts.filter((s) => s.shiftName.toLowerCase().includes(filters.name.toLowerCase()));
    if (sortConfig.key) {
      data.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === "differentialMultiplier") {
          aVal = Number(aVal);
          bVal = Number(bVal);
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
  };

  /* ────────── create ────────── */
  const openCreate = () => {
    setCreateForm({
      shiftName: "",
      startTime: "08:00",
      endTime: "17:00",
      differentialMultiplier: "1.0",
    });
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
        differentialMultiplier: Number.parseFloat(createForm.differentialMultiplier),
      };
      const r = await fetch(`${API}/api/shifts/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

  /* ────────── edit ────────── */
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
        differentialMultiplier: Number.parseFloat(editForm.differentialMultiplier),
      };
      const r = await fetch(`${API}/api/shifts/${editForm.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

  /* ────────── delete ────────── */
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

  /* ────────── render ────────── */
  return (
    <div className="max-w-full mx-auto p-4 lg:px-10 px-2 space-y-8">
      <Toaster position="top-center" />

      {/* header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-7 w-7 text-orange-500" />
            Manage Shift Templates
          </h2>
          <p className="text-muted-foreground mt-1">Create and manage shift templates for your organization</p>
        </div>

        <div className="flex gap-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refreshShifts}
                  disabled={refreshing}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh shifts</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Shift
              </Button>
            </DialogTrigger>

            {/* create dialog */}
            <DialogContent className="border-2 dark:border-white/10">
              <div className="h-1 w-full bg-orange-500 -mt-6 mb-4"></div>
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
                  ["shiftName", "Shift Name", "text"],
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
                      onChange={(e) =>
                        setCreateForm((p) => ({
                          ...p,
                          [field]: e.target.value,
                        }))
                      }
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

      {/* filters */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Filter className="h-5 w-5" />
            </div>
            Search & Filter
          </CardTitle>
          <CardDescription>Find shifts by name</CardDescription>
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
              Showing {filteredSorted().length} of {shifts.length} shifts
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              {[
                ["shiftName", "Name"],
                ["differentialMultiplier", "Multiplier"],
              ].map(([key, label]) => (
                <TooltipProvider key={key} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSortConfig({
                            key,
                            direction: sortConfig.key === key && sortConfig.direction === "ascending" ? "descending" : "ascending",
                          })
                        }
                        className={sortConfig.key === key ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}
                      >
                        {label}{" "}
                        {sortConfig.key === key ? (
                          sortConfig.direction === "ascending" ? (
                            <ChevronUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-1 h-4 w-4" />
                          )
                        ) : null}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sort by {label.toLowerCase()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
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
              <Clock className="h-5 w-5" />
            </div>
            Shift Templates
          </CardTitle>
          <CardDescription>Manage your organization's shift templates</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift Name</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Multiplier</TableHead>
                  <TableHead>Total hrs</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        {Array(8)
                          .fill(0)
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
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
                            {s.shiftName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1 text-orange-500" />
                            {fmtClock(s.startTime)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1 text-orange-500" />
                            {fmtClock(s.endTime)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-orange-500/30 text-orange-700 dark:text-orange-400">
                            {s.differentialMultiplier}x
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-orange-500 hover:bg-orange-600 text-white">{totalHours(s.startTime, s.endTime)} hrs</Badge>
                        </TableCell>
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
                                <TooltipContent>
                                  <p>Edit shift</p>
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
                                  <p>Delete shift</p>
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
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Clock className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p>No shifts found matching your filters</p>
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
              ["shiftName", "Shift Name", "text"],
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

      {/* delete dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-800/50">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              Delete Shift
            </DialogTitle>
            <DialogDescription>Are you sure you want to delete this shift? This action cannot be undone.</DialogDescription>
          </DialogHeader>

          {shiftToDelete && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-red-600 dark:text-red-400">
                <div>
                  <span className="opacity-70">Shift Name:</span> <span className="font-medium">{shiftToDelete.shiftName}</span>
                </div>
                <div>
                  <span className="opacity-70">Hours:</span>{" "}
                  <span className="font-medium">{totalHours(shiftToDelete.startTime, shiftToDelete.endTime)}</span>
                </div>
                <div>
                  <span className="opacity-70">Start Time:</span> <span className="font-medium">{fmtClock(shiftToDelete.startTime)}</span>
                </div>
                <div>
                  <span className="opacity-70">End Time:</span> <span className="font-medium">{fmtClock(shiftToDelete.endTime)}</span>
                </div>
                <div>
                  <span className="opacity-70">Created:</span> <span className="font-medium">{fmtDateTime(shiftToDelete.createdAt)}</span>
                </div>
                <div>
                  <span className="opacity-70">Updated:</span> <span className="font-medium">{fmtDateTime(shiftToDelete.updatedAt)}</span>
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
            <Button variant="destructive" onClick={confirmDelete} disabled={actionLoading} className="bg-red-500 hover:bg-red-600">
              {actionLoading ? "Deleting..." : "Delete Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ManageShifts;
