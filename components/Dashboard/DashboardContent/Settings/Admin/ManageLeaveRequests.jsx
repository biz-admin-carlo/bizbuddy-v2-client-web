"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  SortAsc,
  Trash2,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  RefreshCw,
  Search,
  UserCheck,
  AlertCircle,
  Info,
  FileText,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

/* -------------------------------------------------- */
/* helpers                                            */
/* -------------------------------------------------- */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

/* -------------------------------------------------- */
/* main component                                     */
/* -------------------------------------------------- */

function ManageLeaveRequests() {
  const { token } = useAuthStore();

  /* core data */
  const [leaves, setLeaves] = useState([]);

  /* ui state */
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all"); // all | pending | approved | rejected
  const [sortKey, setSortKey] = useState("newest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  /* dialogs */
  const [dialogType, setDialogType] = useState(null); // "approve" | "reject"
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [comment, setComment] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  /* fetch */
  const fetchLeaves = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/leaves`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setLeaves(data.data || []);
      } else {
        toast.message(data.message || "Failed to fetch leave requests.");
      }
    } catch (err) {
      console.error(err);
      toast.message("Failed to fetch leave requests.");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  /* computed list */
  const filteredSortedLeaves = React.useMemo(() => {
    let list = [...leaves];

    // Filter by status
    if (filterStatus !== "all") list = list.filter((l) => l.status === filterStatus);

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(
        (l) =>
          (l.User?.email || "").toLowerCase().includes(query) ||
          (l.requester?.username || "").toLowerCase().includes(query) ||
          (l.leaveType || "").toLowerCase().includes(query) ||
          (l.reason || "").toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortKey) {
      case "oldest":
        list.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        break;
      case "type":
        list.sort((a, b) => a.leaveType.localeCompare(b.leaveType));
        break;
      case "status":
        list.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case "requester":
        list.sort((a, b) => (a.requester?.username || "").localeCompare(b.requester?.username || ""));
        break;
      case "newest":
      default:
        list.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    }
    return list;
  }, [leaves, filterStatus, sortKey, searchQuery]);

  /* -------------------------------------------- */
  /* approve / reject / delete helpers            */
  /* -------------------------------------------- */
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ approverComments: comment }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.message(data.message || "Success");
        fetchLeaves();
        closeDialog();
      } else {
        toast.message(data.message || "Something went wrong");
      }
    } catch (err) {
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
      } else {
        toast.message(data.message || "Delete failed");
      }
    } catch (err) {
      toast.message("Delete failed");
    }
    setActionLoading(false);
    setShowDeleteModal(false);
    setSelectedLeave(null);
  }

  /* -------------------------------------------- */
  /* table helpers                                */
  /* -------------------------------------------- */
  const StatusBadge = ({ status }) => (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      }`}
    >
      {statusIcons[status]}
      {status}
    </span>
  );

  const SortDropdown = () => (
    <DropdownMenu open={sortMenuOpen} onOpenChange={setSortMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
        >
          <SortAsc className="h-4 w-4" />
          Sort
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {[
          { key: "newest", label: "Newest first" },
          { key: "oldest", label: "Oldest first" },
          { key: "type", label: "Leave type" },
          { key: "status", label: "Status" },
          { key: "requester", label: "Requester" },
        ].map((opt) => (
          <DropdownMenuItem key={opt.key} onSelect={() => setSortKey(opt.key)}>
            {opt.label}
            {sortKey === opt.key && <CheckCircle2 className="ml-auto h-4 w-4 text-orange-500" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  /* -------------------------------------------- */
  /* render                                        */
  /* -------------------------------------------- */

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      <Toaster position="top-center" />

      {/* header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-7 w-7 text-orange-500" />
            Manage Leave Requests
          </h2>
          <p className="text-muted-foreground mt-1">Review and manage employee leave requests</p>
        </div>

        <div className="flex gap-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchLeaves}
                  disabled={loading}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh leave requests</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <SortDropdown />
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
            Filters
          </CardTitle>
          <CardDescription>Filter leave requests by status or search by requester, type, or reason</CardDescription>
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
              placeholder="Search by requester, leave type, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {searchQuery && (
              <Button variant="ghost" size="icon" onClick={() => setSearchQuery("")} className="h-6 w-6 p-0 text-muted-foreground">
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>
              Showing {filteredSortedLeaves.length} of {leaves.length} leave requests
            </span>
            <span>
              {filterStatus !== "all" && (
                <Badge variant="outline" className="ml-2">
                  Filtered by: {filterStatus}
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="outline" className="ml-2">
                  Search: "{searchQuery}"
                </Badge>
              )}
            </span>
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
            Leave Requests
          </CardTitle>
          <CardDescription>Review and manage employee time off requests</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => setSortKey("requester")}>
                    <div className="flex items-center gap-1">Requester {sortKey === "requester" && <ChevronDown className="h-4 w-4" />}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSortKey("type")}>
                    <div className="flex items-center gap-1">Leave Type {sortKey === "type" && <ChevronDown className="h-4 w-4" />}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSortKey(sortKey === "newest" ? "oldest" : "newest")}>
                    <div className="flex items-center gap-1">
                      Date Range{" "}
                      {sortKey === "newest" ? <ChevronDown className="h-4 w-4" /> : sortKey === "oldest" ? <ChevronUp className="h-4 w-4" /> : null}
                    </div>
                  </TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSortKey("status")}>
                    <div className="flex items-center gap-1">Status {sortKey === "status" && <ChevronDown className="h-4 w-4" />}</div>
                  </TableHead>
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
                          <Skeleton className="h-6 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-20 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                ) : filteredSortedLeaves.length ? (
                  <AnimatePresence>
                    {filteredSortedLeaves.map((l) => (
                      <motion.tr
                        key={l.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mr-2">
                              <UserCheck className="h-4 w-4 text-orange-500" />
                            </div>
                            {l.User?.email || l.requester?.username || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {l.leaveType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1 text-orange-500" />
                              <span className="text-xs text-muted-foreground mr-1">From:</span> {formatDate(l.startDate)}
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1 text-orange-500" />
                              <span className="text-xs text-muted-foreground mr-1">To:</span> {formatDate(l.endDate)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {l.reason ? (
                              <span className="text-sm">{l.reason}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No reason provided</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={l.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
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
                                <TooltipContent>
                                  <p>View details</p>
                                </TooltipContent>
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
                                    <TooltipContent>
                                      <p>Approve request</p>
                                    </TooltipContent>
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
                                    <TooltipContent>
                                      <p>Reject request</p>
                                    </TooltipContent>
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
                                <TooltipContent>
                                  <p>Delete request</p>
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
                        <p>No leave requests found.</p>
                        {(filterStatus !== "all" || searchQuery) && (
                          <Button
                            variant="link"
                            onClick={() => {
                              setFilterStatus("all");
                              setSearchQuery("");
                            }}
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
                  <span className="text-muted-foreground">Leave Type:</span> <span className="font-medium capitalize">{selectedLeave.leaveType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Start Date:</span> <span className="font-medium">{formatDate(selectedLeave.startDate)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">End Date:</span> <span className="font-medium">{formatDate(selectedLeave.endDate)}</span>
                </div>
                {selectedLeave.reason && (
                  <div className="col-span-2 mt-2 pt-2 border-t border-black/10 dark:border-white/10">
                    <span className="text-muted-foreground">Reason:</span> <span className="font-medium">{selectedLeave.reason}</span>
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
              className={`${dialogType === "approve" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"} text-white`}
            >
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
                  <p className="text-sm text-muted-foreground">{selectedLeave.status === "approved" ? "Approval" : "Rejection"} Comments</p>
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
                      <p className="text-xs text-muted-foreground">{formatDate(selectedLeave.createdAt || selectedLeave.startDate)}</p>
                    </div>
                  </div>

                  {selectedLeave.status !== "pending" && (
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                          selectedLeave.status === "approved" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
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
                        <p className="text-xs text-muted-foreground">{formatDate(selectedLeave.updatedAt || selectedLeave.startDate)}</p>
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
            <DialogDescription>Are you sure you want to delete this leave request? This action cannot be undone.</DialogDescription>
          </DialogHeader>

          {selectedLeave && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4">
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-red-600 dark:text-red-400">
                <div>
                  <span className="opacity-70">Requester:</span>{" "}
                  <span className="font-medium">{selectedLeave.User?.email || selectedLeave.requester?.username || "—"}</span>
                </div>
                <div>
                  <span className="opacity-70">Leave Type:</span> <span className="font-medium capitalize">{selectedLeave.leaveType}</span>
                </div>
                <div>
                  <span className="opacity-70">Start Date:</span> <span className="font-medium">{formatDate(selectedLeave.startDate)}</span>
                </div>
                <div>
                  <span className="opacity-70">End Date:</span> <span className="font-medium">{formatDate(selectedLeave.endDate)}</span>
                </div>
                <div className="col-span-2">
                  <span className="opacity-70">Status:</span> <span className="font-medium capitalize">{selectedLeave.status}</span>
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

export default ManageLeaveRequests;
