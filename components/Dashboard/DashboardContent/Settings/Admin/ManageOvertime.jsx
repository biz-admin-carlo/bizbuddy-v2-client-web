// components/Dashboard/DashboardContent/Settings/Admin/ManageOvertime.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Filter,
  CheckCircle2,
  XCircle,
  Trash2,
  Info,
  AlertCircle,
  Search,
  UserCheck,
  FileText,
  Eye,
  Smartphone,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";

/* ───── shadcn/ui ───── */
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

/* ───── helpers ───── */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const statusClasses = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusIcons = {
  pending: <Clock className="h-3 w-3 mr-1" />,
  approved: <CheckCircle2 className="h-3 w-3 mr-1" />,
  rejected: <XCircle className="h-3 w-3 mr-1" />,
};

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const diffHours = (inTs, outTs) => {
  if (!inTs || !outTs) return 0;
  const ms = new Date(outTs) - new Date(inTs);
  return +(ms / 3_600_000).toFixed(2);
};

export default function ManageOvertime() {
  const { token } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortKey, setSortKey] = useState("newest");
  const [search, setSearch] = useState("");
  const [dialogType, setDialogType] = useState(null);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logData, setLogData] = useState(null);

  const fetchRows = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/overtime`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Failed to fetch overtime list.");
      const withLate = (j.data || []).map((o) => ({
        ...o,
        lateHours: o.lateHours ?? o.timeLog?.lateHours ?? null,
      }));
      setRows(withLate);
    } catch (e) {
      toast.message(e.message || "Fetch error");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[status] || ""}`}>
      {statusIcons[status]}
      {status}
    </span>
  );

  const otVal = (r) =>
    r.requestedHours != null ? Number(r.requestedHours).toFixed(2) : r.timeLog?.otHours ?? diffHours(r.timeLog?.timeIn, r.timeLog?.timeOut) ?? "—";

  const lateVal = (r) =>
    r.lateHours != null ? Number(r.lateHours).toFixed(2) : r.timeLog?.lateHours != null ? Number(r.timeLog.lateHours).toFixed(2) : "—";
  const viewRows = useMemo(() => {
    let list = [...rows];
    if (filterStatus !== "all") list = list.filter((r) => r.status === filterStatus);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          (r.timeLogId || "").toLowerCase().includes(q) ||
          (r.requester?.email || "").toLowerCase().includes(q) ||
          (r.requester?.username || "").toLowerCase().includes(q) ||
          (r.requesterReason || "").toLowerCase().includes(q)
      );
    }

    switch (sortKey) {
      case "oldest":
        list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case "requester":
        list.sort((a, b) => (a.requester?.username || "").localeCompare(b.requester?.username || ""));
        break;
      case "status":
        list.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case "newest":
      default:
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  }, [rows, filterStatus, sortKey, search]);

  const openDialog = (type, row) => {
    setDialogType(type);
    setSelected(row);
    setComment("");
  };
  const closeDialog = () => {
    setDialogType(null);
    setSelected(null);
    setComment("");
  };

  const doAction = async (endpoint) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/overtime/${selected.id}/${endpoint}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ approverComments: comment }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Operation failed.");
      toast.message(j.message || "Success");
      fetchRows();
      closeDialog();
    } catch (e) {
      toast.message(e.message || "Error");
    }
    setActionLoading(false);
  };

  const doDelete = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/overtime/${selected.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Delete failed.");
      toast.message(j.message || "Deleted");
      setRows((p) => p.filter((r) => r.id !== selected.id));
      setShowDelete(false);
      setSelected(null);
    } catch (e) {
      toast.message(e.message || "Delete failed");
    }
    setActionLoading(false);
  };

  return (
    <div className="max-w-full mx-auto p-4 lg:px-10 px-2 space-y-8">
      <Toaster position="top-center" richColors />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-7 w-7 text-orange-500" />
            Manage Overtime Requests
          </h2>
          <p className="text-muted-foreground mt-1">Review and manage employee overtime</p>
        </div>
        <div className="flex gap-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchRows}
                  disabled={loading}
                  className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black"
                >
                  <RefreshCw className={`h-4 w-4 ${loading && "animate-spin"}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh overtime list</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* ===== filters ===== */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
              <Filter className="h-5 w-5" />
            </div>
            Filters
          </CardTitle>
          <CardDescription>Filter requests or search</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {["all", "pending", "approved", "rejected"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filterStatus === s ? "default" : "outline"}
                className={`capitalize ${
                  filterStatus === s
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : "border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                }`}
                onClick={() => setFilterStatus(s)}
              >
                {s === "pending" && <Clock className="h-4 w-4 mr-1" />}
                {s === "approved" && <CheckCircle2 className="h-4 w-4 mr-1" />}
                {s === "rejected" && <XCircle className="h-4 w-4 mr-1" />}
                {s === "all" && <Filter className="h-4 w-4 mr-1" />}
                {s}
              </Button>
            ))}
          </div>

          <div className="flex items-center border rounded-md px-3 py-2 bg-black/5 dark:bg-white/5">
            <Search className="h-4 w-4 mr-2 text-muted-foreground" />
            <Input
              placeholder="Search requester, reason, IDs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {search && (
              <Button variant="ghost" size="icon" onClick={() => setSearch("")} className="h-6 w-6 p-0 text-muted-foreground">
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
              <Calendar className="h-5 w-5" />
            </div>
            Overtime Requests
          </CardTitle>
          <CardDescription>Review overtime approvals</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OT&nbsp;ID</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSortKey("requester")}>
                    <div className="flex items-center gap-1">Requester {sortKey === "requester" && <ChevronDown className="h-4 w-4" />}</div>
                  </TableHead>
                  <TableHead>TimeLog ID</TableHead>
                  <TableHead>OT&nbsp;(h)</TableHead>
                  <TableHead>Late&nbsp;(h)</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSortKey(sortKey === "newest" ? "oldest" : "newest")}>
                    <div className="flex items-center gap-1">
                      Requested&nbsp;At{" "}
                      {sortKey === "newest" ? <ChevronDown className="h-4 w-4" /> : sortKey === "oldest" ? <ChevronUp className="h-4 w-4" /> : null}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSortKey("status")}>
                    <div className="flex items-center gap-1">Status {sortKey === "status" && <ChevronDown className="h-4 w-4" />}</div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {Array(9)
                        .fill(0)
                        .map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))
                ) : viewRows.length ? (
                  <AnimatePresence>
                    {viewRows.map((r) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b hover:bg-muted/50"
                      >
                        <TableCell className="font-mono text-xs">{r.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mr-2">
                              <UserCheck className="h-4 w-4 text-orange-500" />
                            </div>
                            {r.requester?.email || r.requester?.username || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.timeLogId || "—"}</TableCell>
                        <TableCell>{otVal(r)}</TableCell>
                        <TableCell>{lateVal(r)}</TableCell>
                        <TableCell className="max-w-xs truncate">{r.requesterReason || <span className="italic text-muted-foreground">—</span>}</TableCell>
                        <TableCell>{fmt(r.createdAt)}</TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-sky-700 hover:bg-sky-500/10 dark:text-sky-400 dark:hover:bg-sky-500/20"
                                    onClick={() => {
                                      setLogData(r.timeLog);
                                      setLogOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Time Log</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-orange-700 hover:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
                                    onClick={() => {
                                      setSelected(r);
                                      setDetailsOpen(true);
                                    }}
                                  >
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Overtime Details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {r.status === "pending" && (
                              <>
                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-green-700 hover:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20"
                                        onClick={() => openDialog("approve", r)}
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Approve</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                        onClick={() => openDialog("reject", r)}
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reject</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                    onClick={() => {
                                      setSelected(r);
                                      setShowDelete(true);
                                    }}
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
                    <TableCell colSpan={9} className="h-28 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Calendar className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p>No overtime requests found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={!!dialogType} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogType === "approve" ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
              {dialogType === "approve" ? "Approve" : "Reject"} Overtime
            </DialogTitle>
            <DialogDescription>{dialogType === "approve" ? "Add optional approval comments" : "Provide rejection reason (optional)"}</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="border rounded-md p-3 bg-muted/50 text-sm space-y-1">
              <p>
                <strong>OT ID:</strong> {selected.id}
              </p>
              <p>
                <strong>TimeLog ID:</strong> {selected.timeLogId}
              </p>
              <p>
                <strong>Requester:</strong> {selected.requester?.email || selected.requester?.username}
              </p>
              <p>
                <strong>OT Hours:</strong> {otVal(selected)}
              </p>
              <p>
                <strong>Late Hours:</strong> {lateVal(selected)}
              </p>
              {selected.requesterReason && (
                <p>
                  <strong>Reason:</strong> {selected.requesterReason}
                </p>
              )}
            </div>
          )}

          <Textarea
            placeholder={dialogType === "approve" ? "Approval comments (optional)" : "Rejection reason (optional)"}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <DialogFooter className="pt-4 gap-2">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              disabled={actionLoading}
              onClick={() => doAction(dialogType)}
              className={dialogType === "approve" ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}
            >
              {actionLoading ? (dialogType === "approve" ? "Approving…" : "Rejecting…") : dialogType === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Overtime Details
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <h3 className="font-medium text-lg">{otVal(selected)} OT Hours</h3>
                <p className="text-sm">
                  <strong>Late Hours:&nbsp;</strong>
                  {lateVal(selected)}
                </p>
                <StatusBadge status={selected.status} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">OT ID</p>
                  <p className="font-mono text-xs">{selected.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">TimeLog ID</p>
                  <p className="font-mono text-xs">{selected.timeLogId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Requester</p>
                  <p className="font-medium">{selected.requester?.email || selected.requester?.username}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Requested At</p>
                  <p className="font-medium">{fmt(selected.createdAt)}</p>
                </div>
              </div>

              {selected.requesterReason && (
                <div className="space-y-1 pt-2 border-t border-black/10 dark:border-white/10">
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <div className="bg-muted p-3 rounded-md">{selected.requesterReason}</div>
                </div>
              )}

              {selected.approverComments && (
                <div className="space-y-1 pt-2 border-t border-black/10 dark:border-white/10">
                  <p className="text-sm text-muted-foreground">{selected.status === "approved" ? "Approval" : "Rejection"} Comments</p>
                  <div
                    className={`p-3 rounded-md ${
                      selected.status === "approved"
                        ? "bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30"
                        : "bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30"
                    }`}
                  >
                    {selected.approverComments}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setDetailsOpen(false)} className="bg-orange-500 hover:bg-orange-600 text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="sm:max-w-lg border-2 dark:border-white/10">
          <div className="h-1 w-full bg-sky-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-sky-500" />
              Time Log Details
            </DialogTitle>
          </DialogHeader>

          {logData ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Time In</p>
                  <p className="font-medium">{fmt(logData.timeIn)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Time Out</p>
                  <p className="font-medium">{fmt(logData.timeOut)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{logData.status ? "Active" : "Completed"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Raw Hours</p>
                  <p className="font-medium">{diffHours(logData.timeIn, logData.timeOut)}</p>
                </div>
              </div>

              {Array.isArray(logData.coffeeBreaks) && logData.coffeeBreaks.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-black/10 dark:border-white/10">
                  <p className="text-muted-foreground">Coffee Breaks</p>
                  <ul className="list-disc ml-4">
                    {logData.coffeeBreaks.map((b, idx) => (
                      <li key={idx}>
                        {fmt(b.start)} – {b.end ? fmt(b.end) : "ongoing"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {logData.lunchBreak && (
                <div className="space-y-1 pt-2 border-t border-black/10 dark:border-white/10">
                  <p className="text-muted-foreground">Lunch Break</p>
                  <p className="font-medium">
                    {fmt(logData.lunchBreak.start)} – {logData.lunchBreak.end ? fmt(logData.lunchBreak.end) : "ongoing"}
                  </p>
                </div>
              )}

              {(logData.deviceInfo?.start || logData.deviceInfo?.end) && (
                <div className="space-y-1 pt-2 border-t border-black/10 dark:border-white/10">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Smartphone className="h-4 w-4" /> Device Info
                  </p>
                  <pre className="bg-muted/50 rounded-md p-2 whitespace-pre-wrap break-all text-[11px]">{JSON.stringify(logData.deviceInfo, null, 2)}</pre>
                </div>
              )}

              {(logData.location?.start || logData.location?.end) && (
                <div className="space-y-1 pt-2 border-t border-black/10 dark:border-white/10">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> Location
                  </p>
                  <pre className="bg-muted/50 rounded-md p-2 whitespace-pre-wrap break-all text-[11px]">{JSON.stringify(logData.location, null, 2)}</pre>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No data</p>
          )}

          <DialogFooter>
            <Button onClick={() => setLogOpen(false)} className="bg-sky-500 hover:bg-sky-600 text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-900/40">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete Overtime Request
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4 space-y-1 text-sm">
              <p>
                <strong>OT ID:</strong> {selected.id}
              </p>
              <p>
                <strong>TimeLog ID:</strong> {selected.timeLogId}
              </p>
              <p>
                <strong>Requester:</strong> {selected.requester?.email || selected.requester?.username}
              </p>
              <p>
                <strong>OT Hours:</strong> {otVal(selected)}
              </p>
              <p>
                <strong>Late Hours:</strong> {lateVal(selected)}
              </p>
              <p>
                <strong>Status:</strong> <span className="capitalize">{selected.status}</span>
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDelete(false)}
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={doDelete} disabled={actionLoading} className="bg-red-500 hover:bg-red-600">
              {actionLoading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
