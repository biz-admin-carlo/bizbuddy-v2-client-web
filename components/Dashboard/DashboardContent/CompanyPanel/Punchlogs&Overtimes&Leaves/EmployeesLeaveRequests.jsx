// components/Dashboard/DashboardContent/Settings/Admin/ManageLeaveRequests.jsx
// components/Dashboard/DashboardContent/Settings/Admin/ManageLeaveRequests.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Trash2,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  RefreshCw,
  Info,
  FileText,
  AlertCircle,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import ColumnSelector from "@/components/common/ColumnSelector";
import MultiSelect from "@/components/common/MultiSelect";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/* ---------- helpers ---------- */

const statusColors = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusIcons = {
  pending: <Clock className="h-3 w-3 mr-1" />,
  approved: <CheckCircle2 className="h-3 w-3 mr-1" />,
  rejected: <XCircle className="h-3 w-3 mr-1" />,
};

const formatDate = (d) =>
  new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function EmployeesLeaveRequests() {
  const { token } = useAuthStore();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState("newest");
  const [dialogType, setDialogType] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [comment, setComment] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const columnOptions = [
    { value: "requester", label: "Requester" },
    { value: "leaveType", label: "Leave Type" },
    { value: "dateRange", label: "Date Range" },
    { value: "reason", label: "Reason" },
    { value: "status", label: "Status" },
    { value: "createdAt", label: "Created At" },
    { value: "updatedAt", label: "Updated At" },
  ];
  const [columnVisibility, setColumnVisibility] = useState(columnOptions.map((o) => o.value));

  const [filters, setFilters] = useState({
    statuses: ["all"],
    types: ["all"],
  });

  const toggleListFilter = (key, val) =>
    setFilters((prev) => {
      if (val === "all") return { ...prev, [key]: ["all"] };
      let list = prev[key].filter((x) => x !== "all");
      list = list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
      if (!list.length) list = ["all"];
      return { ...prev, [key]: list };
    });

  const clearAllFilters = () => setFilters({ statuses: ["all"], types: ["all"] });

  const fetchLeaves = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/leaves`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setLeaves(data.data || []);
      else toast.message(data.message || "Failed to fetch leave requests.");
    } catch {
      toast.message("Failed to fetch leave requests.");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const leaveTypeOptions = useMemo(
    () =>
      [...new Set(leaves.map((l) => l.leaveType))].map((t) => ({
        value: t,
        label: t,
      })),
    [leaves]
  );

  const processedLeaves = useMemo(() => {
    let list = [...leaves];
    if (!filters.statuses.includes("all")) list = list.filter((l) => filters.statuses.includes(l.status));
    if (!filters.types.includes("all")) list = list.filter((l) => filters.types.includes(l.leaveType));

    switch (sortKey) {
      case "newest":
        list.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        break;
      case "oldest":
        list.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        break;
      case "requesterAsc":
        list.sort((a, b) => (a.requester?.username || "").localeCompare(b.requester?.username || ""));
        break;
      case "requesterDesc":
        list.sort((a, b) => (b.requester?.username || "").localeCompare(a.requester?.username || ""));
        break;
      case "typeAsc":
        list.sort((a, b) => a.leaveType.localeCompare(b.leaveType));
        break;
      case "typeDesc":
        list.sort((a, b) => b.leaveType.localeCompare(a.leaveType));
        break;
      case "statusAsc":
        list.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case "statusDesc":
        list.sort((a, b) => b.status.localeCompare(a.status));
        break;

      case "createdNewest":
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "createdOld":
        list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case "updatedNewest":
        list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        break;
      case "updatedOld":
        list.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
        break;

      default:
        list.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    }

    return list;
  }, [leaves, filters, sortKey]);

  const openDialog = (type, leave) => {
    setDialogType(type);
    setSelectedLeave(leave);
    setComment("");
  };
  const closeDialog = () => {
    setDialogType(null);
    setSelectedLeave(null);
    setComment("");
  };
  const viewDetails = (leave) => {
    setSelectedLeave(leave);
    setDetailsDialogOpen(true);
  };

  async function handleAction(endpoint) {
    if (!selectedLeave) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/leaves/${selectedLeave.id}/${endpoint}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approverComments: comment }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.message(data.message || "Success");
        fetchLeaves();
        closeDialog();
      } else toast.message(data.message || "Something went wrong");
    } catch {
      toast.message("Something went wrong");
    }
    setActionLoading(false);
  }

  async function handleDelete() {
    if (!selectedLeave) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/leaves/${selectedLeave.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast.message(data.message || "Deleted");
        setLeaves((prev) => prev.filter((l) => l.id !== selectedLeave.id));
      } else toast.message(data.message || "Delete failed");
    } catch {
      toast.message("Delete failed");
    }
    setActionLoading(false);
    setShowDeleteModal(false);
    setSelectedLeave(null);
  }

  const StatusBadge = ({ status }) => (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        statusColors[status] || "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
      }`}
    >
      {statusIcons[status]}
      {status}
    </span>
  );

  const labelClass = "my-auto shrink-0 text-sm font-medium text-muted-foreground";

  return (
    <div className="max-w-full mx-auto p-4 lg:px-10 px-2 space-y-8">
      <Toaster />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Calendar className="h-7 w-7 text-orange-500" />
          Employee Leave Requests
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchLeaves}
          disabled={loading}
          className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2 relative">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
              <Filter className="h-5 w-5" />
            </div>
            Table Controls
          </CardTitle>
          <span className="absolute top-2 right-4 text-sm text-muted-foreground">
            {processedLeaves.length} of {leaves.length}
          </span>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* column selector */}
            <div className="flex flex-wrap gap-3 items-center">
              <span className={labelClass}>Column:</span>
              <ColumnSelector options={columnOptions} visible={columnVisibility} setVisible={setColumnVisibility} />
            </div>

            {/* filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <span className={labelClass}>Filter:</span>
              <MultiSelect
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                ]}
                selected={filters.statuses}
                onChange={(v) => toggleListFilter("statuses", v)}
                allLabel="All statuses"
                width={180}
              />
              <MultiSelect
                options={leaveTypeOptions}
                selected={filters.types}
                onChange={(v) => toggleListFilter("types", v)}
                allLabel="All leave types"
                width={180}
              />
              {(!filters.statuses.includes("all") || !filters.types.includes("all")) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* main table */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
              <Calendar className="h-5 w-5" />
            </div>
            Leave Requests
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* requester */}
                  {columnVisibility.includes("requester") && (
                    <TableHead
                      className="cursor-pointer whitespace-nowrap"
                      onClick={() => setSortKey((p) => (p === "requesterAsc" ? "requesterDesc" : "requesterAsc"))}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Requester
                        {sortKey === "requesterAsc" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : sortKey === "requesterDesc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : null}
                      </div>
                    </TableHead>
                  )}

                  {/* leave type */}
                  {columnVisibility.includes("leaveType") && (
                    <TableHead
                      className="cursor-pointer whitespace-nowrap"
                      onClick={() => setSortKey((p) => (p === "typeAsc" ? "typeDesc" : "typeAsc"))}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Leave&nbsp;Type
                        {sortKey === "typeAsc" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : sortKey === "typeDesc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : null}
                      </div>
                    </TableHead>
                  )}

                  {/* date range */}
                  {columnVisibility.includes("dateRange") && (
                    <TableHead
                      className="cursor-pointer whitespace-nowrap"
                      onClick={() => setSortKey((p) => (p === "newest" ? "oldest" : "newest"))}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Date&nbsp;Range
                        {sortKey === "newest" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : sortKey === "oldest" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : null}
                      </div>
                    </TableHead>
                  )}

                  {/* reason */}
                  {columnVisibility.includes("reason") && <TableHead className="whitespace-nowrap text-center">Reason</TableHead>}

                  {/* status */}
                  {columnVisibility.includes("status") && (
                    <TableHead
                      className="cursor-pointer whitespace-nowrap"
                      onClick={() => setSortKey((p) => (p === "statusAsc" ? "statusDesc" : "statusAsc"))}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Status
                        {sortKey === "statusAsc" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : sortKey === "statusDesc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : null}
                      </div>
                    </TableHead>
                  )}

                  {/* created at */}
                  {columnVisibility.includes("createdAt") && (
                    <TableHead
                      className="cursor-pointer whitespace-nowrap"
                      onClick={() => setSortKey((p) => (p === "createdNewest" ? "createdOld" : "createdNewest"))}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Created&nbsp;At
                        {sortKey === "createdNewest" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : sortKey === "createdOld" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : null}
                      </div>
                    </TableHead>
                  )}

                  {/* updated at */}
                  {columnVisibility.includes("updatedAt") && (
                    <TableHead
                      className="cursor-pointer whitespace-nowrap"
                      onClick={() => setSortKey((p) => (p === "updatedNewest" ? "updatedOld" : "updatedNewest"))}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Updated&nbsp;At
                        {sortKey === "updatedNewest" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : sortKey === "updatedOld" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : null}
                      </div>
                    </TableHead>
                  )}

                  <TableHead className="whitespace-nowrap text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* loading skeletons */}
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {Array(columnVisibility.length + 1)
                        .fill(0)
                        .map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))
                ) : processedLeaves.length ? (
                  <AnimatePresence>
                    {processedLeaves.map((l) => (
                      <motion.tr
                        key={l.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        {columnVisibility.includes("requester") && (
                          <TableCell className="text-center text-nowrap">
                            {l.User?.email || l.requester?.username || "—"}
                          </TableCell>
                        )}
                        {columnVisibility.includes("leaveType") && (
                          <TableCell className="text-center text-nowrap">{l.leaveType}</TableCell>
                        )}
                        {columnVisibility.includes("dateRange") && (
                          <TableCell className="text-center ">
                            <div className="flex flex-col gap-1">
                              <span className="text-nowrap">
                                <Calendar className="inline h-3 w-3 mr-1 text-orange-500" />
                                From: {formatDate(l.startDate)}
                              </span>
                              <span className="text-nowrap">
                                <Calendar className="inline h-3 w-3 mr-1 text-orange-500" />
                                To: {formatDate(l.endDate)}
                              </span>
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.includes("reason") && (
                          <TableCell className="text-center text-nowrap">
                            {l.reason ? (
                              <span className="truncate block max-w-xs">{l.reason}</span>
                            ) : (
                              <span className="italic text-muted-foreground text-xs">No reason provided</span>
                            )}
                          </TableCell>
                        )}
                        {columnVisibility.includes("status") && (
                          <TableCell className="text-center text-nowrap">
                            <StatusBadge status={l.status} />
                          </TableCell>
                        )}
                        {columnVisibility.includes("createdAt") && (
                          <TableCell className="text-center text-nowrap italic text-muted-foreground text-xs">
                            {formatDate(l.createdAt)}
                          </TableCell>
                        )}
                        {columnVisibility.includes("updatedAt") && (
                          <TableCell className="text-center text-nowrap italic text-muted-foreground text-xs">
                            {formatDate(l.updatedAt)}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => viewDetails(l)}
                                    className="h-8 w-8 text-orange-700 hover:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
                                  >
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {l.status === "pending" && (
                              <>
                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => openDialog("approve", l)}
                                        className="h-8 w-8 text-green-700 hover:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20"
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Approve request</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => openDialog("reject", l)}
                                        className="h-8 w-8 text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reject request</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}

                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedLeave(l);
                                      setShowDeleteModal(true);
                                    }}
                                    className="h-8 w-8 text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete request</TooltipContent>
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
                          <Calendar className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p>No leave requests found.</p>
                        {(!filters.statuses.includes("all") || !filters.types.includes("all")) && (
                          <Button variant="link" onClick={clearAllFilters} className="text-orange-500 hover:text-orange-600 mt-2">
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

      {/* dialogs are unchanged below */}
      {/* approve / reject dialog */}
      <Dialog open={!!dialogType} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-lg border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4"></div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className={`p-2 rounded-full ${
                  dialogType === "approve"
                    ? "bg-green-100 text-green-500 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {dialogType === "approve" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              </div>
              <span className="capitalize">{dialogType} Leave Request</span>
            </DialogTitle>
            <DialogDescription>
              {dialogType === "approve"
                ? "Optionally add comments before approving this leave request."
                : "Provide a reason or comments for rejecting this leave request (optional)."}
            </DialogDescription>
          </DialogHeader>

          {selectedLeave && (
            <div className="bg-black/5 dark:bg-white/5 rounded-lg p-4 mb-4 border border-black/10 dark:border-white/10">
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Requester:</span>{" "}
                  <span className="font-medium">{selectedLeave.User?.email || selectedLeave.requester?.username || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Leave Type:</span>{" "}
                  <span className="font-medium capitalize">{selectedLeave.leaveType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Start Date:</span>{" "}
                  <span className="font-medium">{formatDate(selectedLeave.startDate)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">End Date:</span>{" "}
                  <span className="font-medium">{formatDate(selectedLeave.endDate)}</span>
                </div>
                {selectedLeave.reason && (
                  <div className="col-span-2 mt-2 pt-2 border-t border-black/10 dark:border-white/10">
                    <span className="text-muted-foreground">Reason:</span>{" "}
                    <span className="font-medium">{selectedLeave.reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-medium">
              {dialogType === "approve" ? "Approval Comments" : "Rejection Reason"}
            </label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`${dialogType === "approve" ? "Approval" : "Rejection"} comments (optional)`}
              className="min-h-[120px]"
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={() => handleAction(dialogType)}
              disabled={actionLoading}
              className={`${
                dialogType === "approve" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
              } text-white`}
            >
              {actionLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {dialogType === "approve" ? "Approving..." : "Rejecting..."}
                </span>
              ) : (
                <span className="flex items-center">
                  {dialogType === "approve" ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
                  {dialogType === "approve" ? "Approve Request" : "Reject Request"}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* details dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4"></div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <FileText className="h-5 w-5" />
              </div>
              Leave Request Details
            </DialogTitle>
            <DialogDescription>Complete information about this leave request</DialogDescription>
          </DialogHeader>

          {selectedLeave && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-lg capitalize">{selectedLeave.leaveType} Leave</h3>
                <StatusBadge status={selectedLeave.status} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Requester</p>
                  <p className="font-medium">{selectedLeave.User?.email || selectedLeave.requester?.username || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedLeave.requester?.department?.name || "Not specified"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">{formatDate(selectedLeave.startDate)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">{formatDate(selectedLeave.endDate)}</p>
                </div>
              </div>

              {selectedLeave.reason && (
                <div className="space-y-1 pt-2 border-t border-black/10 dark:border-white/10">
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <div className="bg-black/5 dark:bg-white/5 p-3 rounded-md">
                    <p className="whitespace-pre-line">{selectedLeave.reason}</p>
                  </div>
                </div>
              )}

              {selectedLeave.approverComments && (
                <div className="space-y-1 pt-2 border-t border-black/10 dark:border-white/10">
                  <p className="text-sm text-muted-foreground">
                    {selectedLeave.status === "approved" ? "Approval" : "Rejection"} Comments
                  </p>
                  <div
                    className={`p-3 rounded-md ${
                      selectedLeave.status === "approved"
                        ? "bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30"
                        : "bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30"
                    }`}
                  >
                    <p className="whitespace-pre-line">{selectedLeave.approverComments}</p>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-black/10 dark:border-white/10">
                <div className="text-sm text-muted-foreground mb-1">Request Timeline</div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mt-0.5">
                      <Calendar className="h-3 w-3 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Request Created</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(selectedLeave.createdAt || selectedLeave.startDate)}
                      </p>
                    </div>
                  </div>

                  {selectedLeave.status !== "pending" && (
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                          selectedLeave.status === "approved"
                            ? "bg-green-100 dark:bg-green-900/30"
                            : "bg-red-100 dark:bg-red-900/30"
                        }`}
                      >
                        {selectedLeave.status === "approved" ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">Request {selectedLeave.status}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(selectedLeave.updatedAt || selectedLeave.startDate)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedLeave && selectedLeave.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    openDialog("reject", selectedLeave);
                  }}
                  className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    openDialog("approve", selectedLeave);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </>
            )}
            {(!selectedLeave || selectedLeave.status !== "pending") && (
              <Button onClick={() => setDetailsDialogOpen(false)} className="bg-orange-500 hover:bg-orange-600 text-white">
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete confirmation */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-800/50">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4"></div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              Delete Leave Request
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this leave request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedLeave && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-red-600 dark:text-red-400">
                <div>
                  <span className="opacity-70">Requester:</span>{" "}
                  <span className="font-medium">{selectedLeave.User?.email || selectedLeave.requester?.username || "—"}</span>
                </div>
                <div>
                  <span className="opacity-70">Leave Type:</span>{" "}
                  <span className="font-medium capitalize">{selectedLeave.leaveType}</span>
                </div>
                <div>
                  <span className="opacity-70">Start Date:</span>{" "}
                  <span className="font-medium">{formatDate(selectedLeave.startDate)}</span>
                </div>
                <div>
                  <span className="opacity-70">End Date:</span>{" "}
                  <span className="font-medium">{formatDate(selectedLeave.endDate)}</span>
                </div>
                <div className="col-span-2">
                  <span className="opacity-70">Status:</span>{" "}
                  <span className="font-medium capitalize">{selectedLeave.status}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              {actionLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
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
                <span className="flex items-center">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Request
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
