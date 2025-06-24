// components/Dashboard/DashboardContent/Features/MyLeavesApproval.jsx
/* eslint-disable react-hooks/exhaustive-deps */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Calendar, Clock, Filter, AlertCircle, XCircle, ChevronDown, ChevronUp, Search, UserCheck, FileText } from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";

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

const labelClass = "my-auto shrink-0 text-sm font-medium text-muted-foreground";

const sortOptions = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "type", label: "Leave type" },
  { key: "status", label: "Status" },
];

export default function MyLeavesApproval() {
  const { token } = useAuthStore();
  const [leaves, setLeaves] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortKey, setSortKey] = useState("newest");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLeaves = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/leaves/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setLeaves(data.data || []);
        toast.message("Leave history updated", {
          icon: <CheckCircle2 className="h-5 w-5 text-orange-500" />,
        });
      } else {
        throw new Error(data.message || "Failed to fetch leaves");
      }
    } catch (err) {
      toast.message(err.message, {
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const list = useMemo(() => {
    let l = [...leaves];
    if (filterStatus !== "all") {
      l = l.filter((x) => x.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      l = l.filter(
        (leave) =>
          (leave.leaveType || "").toLowerCase().includes(q) ||
          (leave.leaveReason || "").toLowerCase().includes(q) ||
          (leave.approver?.email || "").toLowerCase().includes(q) ||
          (leave.approverComments || "").toLowerCase().includes(q)
      );
    }

    switch (sortKey) {
      case "oldest":
        l.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        break;
      case "type":
        l.sort((a, b) => a.leaveType.localeCompare(b.leaveType));
        break;
      case "status":
        l.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case "newest":
      default:
        l.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    }
    return l;
  }, [leaves, filterStatus, sortKey, searchQuery]);

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

  return (
    <div className="max-w-6xl mx-auto p-4 lg:px-10 px-2 space-y-8">
      <Toaster position="top-center" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-7 w-7 text-orange-500" />
            My Leave Approvals
          </h2>
          <p className="text-muted-foreground mt-1">View and track all your leave requests</p>
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
                  className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh leave history</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
          <div className="h-1 w-full bg-orange-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <FileText className="h-4 w-4" />
              </div>
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{leaves.length}</div>
              <div className="p-3 rounded-full bg-black/5 dark:bg-white/5">
                <FileText className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
          <div className="h-1 w-full bg-orange-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <Clock className="h-4 w-4" />
              </div>
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{leaves.filter((l) => l.status === "pending").length}</div>
              <div className="p-3 rounded-full bg-black/5 dark:bg-white/5">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
          <div className="h-1 w-full bg-orange-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{leaves.filter((l) => l.status === "approved").length}</div>
              <div className="p-3 rounded-full bg-black/5 dark:bg-white/5">
                <CheckCircle2 className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500"></div>
        <CardHeader className="pb-2 relative">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Filter className="h-5 w-5" />
            </div>
            Table Controls
          </CardTitle>
          <CardDescription>Filter and sort your leave history</CardDescription>
          <span className="absolute top-2 right-4 text-sm text-muted-foreground">
            Showing {list.length} of {leaves.length} leave requests
          </span>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className={labelClass}>Sort:</span>
            {sortOptions.map((opt) => (
              <Button
                key={opt.key}
                size="sm"
                variant="outline"
                onClick={() => setSortKey(opt.key)}
                className={sortKey === opt.key ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}
              >
                {opt.label}
                {sortKey === opt.key && (
                  <>
                    {opt.key === "newest" && <ChevronDown className="ml-1 h-4 w-4" />}
                    {opt.key === "oldest" && <ChevronUp className="ml-1 h-4 w-4" />}
                  </>
                )}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <span className={labelClass}>Filter:</span>
            {["all", "pending", "approved", "rejected"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filterStatus === s ? "default" : "outline"}
                className={`capitalize ${
                  filterStatus === s
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : "border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
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
          {(filterStatus !== "all" || searchQuery) && (
            <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
              {filterStatus !== "all" && <Badge variant="outline">Filtered by: {filterStatus}</Badge>}
              {searchQuery && <Badge variant="outline">Search: &quot;{searchQuery}&quot;</Badge>}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Calendar className="h-5 w-5" />
            </div>
            Leave History
          </CardTitle>
          <CardDescription>View details of all your leave requests</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => setSortKey("type")}>
                    <div className="flex items-center gap-1">Leave Type {sortKey === "type" && <ChevronDown className="h-4 w-4" />}</div>
                  </TableHead>

                  <TableHead className="cursor-pointer" onClick={() => setSortKey(sortKey === "newest" ? "oldest" : "newest")}>
                    <div className="flex items-center gap-1">
                      Date Range{" "}
                      {sortKey === "newest" ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : sortKey === "oldest" ? (
                        <ChevronDown className="h-4 w-4 rotate-180" />
                      ) : null}
                    </div>
                  </TableHead>
                  <TableHead>My Reason</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>Approver Comments</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSortKey("status")}>
                    <div className="flex items-center gap-1">Status {sortKey === "status" && <ChevronDown className="h-4 w-4" />}</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        {Array(6)
                          .fill(0)
                          .map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          ))}
                      </TableRow>
                    ))
                ) : list.length ? (
                  <AnimatePresence>
                    {list.map((l) => (
                      <motion.tr
                        key={l.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      >
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
                            {l.leaveReason ? (
                              <span className="text-sm">{l.leaveReason}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No reason provided</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mr-2">
                              <UserCheck className="h-4 w-4 text-orange-500" />
                            </div>
                            {l.approver?.email || l.approverId || "—"}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="max-w-xs truncate">
                            {l.approverComments ? (
                              <span className="text-sm">{l.approverComments}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No comments</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <StatusBadge status={l.status} />
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

        <CardFooter className="text-xs text-muted-foreground text-center pt-4 pb-6 justify-center">
          Showing {list.length} {list.length === 1 ? "record" : "records"}
          {filterStatus !== "all" && ` filtered by "${filterStatus}" status`}
          {searchQuery && ` matching "${searchQuery}"`}
        </CardFooter>
      </Card>
    </div>
  );
}
