/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  CheckCircle2, RefreshCw, Calendar, Clock, Filter, AlertCircle, XCircle, 
  ChevronDown, Check, Search, ArrowUpDown, Plus, Send, User, FileText, Loader2 
} from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { fmtMMDDYYYY_hhmma } from "@/lib/dateTimeFormatter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TableSkeleton from "@/components/common/TableSkeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { DateTimePicker } from "@/components/DateTimePicker";

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

const columnOptions = [
  { value: "id", label: "ID" },
  { value: "leaveType", label: "Leave Type" },
  { value: "dateRange", label: "Date Range" },
  { value: "leaveReason", label: "My Reason" },
  { value: "approver", label: "Approver" },
  { value: "approverComments", label: "Approver Comments" },
  { value: "createdAt", label: "Created At" },
  { value: "updatedAt", label: "Updated At" },
  { value: "status", label: "Status" },
];

export default function LeaveLogs() {
  const { token } = useAuthStore();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTypes, setFilterTypes] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "startDate", direction: "desc" });
  const [columnVisibility, setColumnVisibility] = useState(columnOptions.map((c) => c.value));

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [leaveType, setLeaveType] = useState("");
  const [approverId, setApproverId] = useState("");
  const [reason, setReason] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [balances, setBalances] = useState([]);
  const [balance, setBalance] = useState(null);
  const [shiftHours, setShiftHours] = useState(8);
  const [approvers, setApprovers] = useState([]);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/leaves/my`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setLeaves(data.data || []);
        toast.message("Leave logs refreshed", { icon: <CheckCircle2 className="h-5 w-5 text-orange-500" /> });
      } else {
        throw new Error(data.message || "Failed to fetch leaves");
      }
    } catch (err) {
      toast.message(err.message, { icon: <AlertCircle className="h-5 w-5 text-red-500" />, duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  // Fetch policies, balances, and approvers when modal opens
  useEffect(() => {
    if (!token || !modalOpen) return;
    Promise.all([
      fetch(`${API_URL}/api/leave-policies`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_URL}/api/leaves/balances`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_URL}/api/leaves/approvers`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([p, b, a]) => {
        const companyShift = p.data?.[0]?.defaultShiftHours != null ? Number(p.data[0].defaultShiftHours) : 8;
        setPolicies((p.data || []).map((pl) => ({ ...pl, defaultShiftHours: companyShift })));
        setBalances(b.data || []);
        setApprovers((a.data || []).map((ap) => ({ id: ap.id, label: `${ap.username} (${ap.email})` })));
        setShiftHours(companyShift);
      })
      .catch(() => toast.message("Failed to load leave data"));
  }, [token, modalOpen]);

  // Fetch balance for selected leave type
  useEffect(() => {
    if (!leaveType || !token) {
      setBalance(null);
      return;
    }
    fetch(`${API_URL}/api/leaves/balance?type=${encodeURIComponent(leaveType)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setBalance(d.data?.balanceHours ?? null);
        setShiftHours(d.data?.shiftHours ?? 8);
      })
      .catch(() => setBalance(null));
  }, [leaveType, token]);

  // Update progress
  useEffect(() => {
    let p = 0;
    if (leaveType) p += 25;
    if (approverId) p += 25;
    if (start) p += 25;
    if (end) p += 25;
    setProgress(p);
  }, [leaveType, approverId, start, end]);

  const requested = useMemo(() => {
    if (!start || !end) return 0;
    const days = Math.floor((new Date(end) - new Date(start)) / 86_400_000) + 1;
    return days * shiftHours;
  }, [start, end, shiftHours]);

  const currentPolicy = useMemo(() => policies.find((p) => p.leaveType === leaveType), [policies, leaveType]);

  const creditsForType = useMemo(() => {
    if (!currentPolicy) return null;
    const alloc =
      currentPolicy.accrualUnit === "days"
        ? Number(currentPolicy.annualAllocation) * currentPolicy.defaultShiftHours
        : Number(currentPolicy.annualAllocation);
    if (balance == null) return alloc;
    return Math.max(alloc, balance);
  }, [currentPolicy, balance]);

  const usedForType = creditsForType != null && balance != null ? creditsForType - balance : null;
  const exceeds = balance != null && requested > balance;

  const stats = useMemo(() => {
    const total = leaves.length;
    const approved = leaves.filter((l) => l.status === "approved").length;
    const pending = leaves.filter((l) => l.status === "pending").length;
    const rejected = leaves.filter((l) => l.status === "rejected").length;
    return { total, approved, pending, rejected };
  }, [leaves]);

  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          l.leaveReason?.toLowerCase().includes(query) ||
          l.leaveType?.toLowerCase().includes(query) ||
          l.approver?.email?.toLowerCase().includes(query) ||
          l.approverComments?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      if (filterTypes.length && !filterTypes.includes(l.leaveType)) return false;
      if (dateFrom) {
        const leaveStart = new Date(l.startDate);
        const filterFrom = new Date(dateFrom);
        if (leaveStart < filterFrom) return false;
      }
      if (dateTo) {
        const leaveEnd = new Date(l.endDate);
        const filterTo = new Date(dateTo);
        if (leaveEnd > filterTo) return false;
      }
      return true;
    });
  }, [leaves, searchQuery, filterStatus, filterTypes, dateFrom, dateTo]);

  const sortedLeaves = useMemo(() => {
    const sorted = [...filteredLeaves];
    const { key, direction } = sortConfig;
    sorted.sort((a, b) => {
      let aVal, bVal;
      switch (key) {
        case "id":
          aVal = a.id;
          bVal = b.id;
          break;
        case "leaveType":
          aVal = a.leaveType || "";
          bVal = b.leaveType || "";
          return direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case "status":
          aVal = a.status || "";
          bVal = b.status || "";
          return direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case "startDate":
          aVal = new Date(a.startDate);
          bVal = new Date(b.startDate);
          break;
        case "createdAt":
          aVal = new Date(a.createdAt);
          bVal = new Date(b.createdAt);
          break;
        case "updatedAt":
          aVal = new Date(a.updatedAt);
          bVal = new Date(b.updatedAt);
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredLeaves, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterTypes([]);
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = searchQuery || filterStatus !== "all" || filterTypes.length || dateFrom || dateTo;

  const resetForm = () => {
    setLeaveType("");
    setApproverId("");
    setReason("");
    setStart("");
    setEnd("");
    setErrors({});
    setBalance(null);
  };

  const validate = () => {
    const e = {};
    if (!leaveType) e.leaveType = "Select leave type";
    if (!approverId) e.approverId = "Select approver";
    if (!start) e.start = "Select start";
    if (!end) e.end = "Select end";
    if (start && end && new Date(start) >= new Date(end)) e.end = "End must be after start";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = () => {
    if (submitting) return;
    if (!validate()) {
      toast.message("Please fix the form", { icon: <AlertCircle className="h-5 w-5 text-red-500" /> });
      return;
    }
    setSubmitting(true);
    fetch(`${API_URL}/api/leaves/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        type: leaveType,
        fromDate: new Date(start).toISOString(),
        toDate: new Date(end).toISOString(),
        approverId,
        leaveReason: reason,
      }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (ok) {
          toast.message("Leave request submitted", { icon: <CheckCircle2 className="h-5 w-5 text-orange-500" /> });
          resetForm();
          setModalOpen(false);
          fetchLeaves(); // Refresh the table
        } else {
          toast.message(d.message || "Submit failed", { icon: <AlertCircle className="h-5 w-5 text-orange-500" /> });
        }
        setSubmitting(false);
      })
      .catch(() => {
        toast.message("Submit failed", { icon: <AlertCircle className="h-5 w-5 text-orange-500" /> });
        setSubmitting(false);
      });
  };

  const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[status] || "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"}`}>
      {statusIcons[status]}
      {status}
    </span>
  );

  const toggleColumn = (val) =>
    setColumnVisibility((prev) => (prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]));

  const ColumnSelect = () => {
    const allChecked = columnVisibility.length === columnOptions.length;
    const toggle = (val) =>
      val === "all" ? setColumnVisibility(allChecked ? [] : columnOptions.map((o) => o.value)) : toggleColumn(val);
    const label = allChecked ? "All columns" : columnVisibility.length === 0 ? "No columns" : `${columnVisibility.length} selected`;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[160px] justify-between">
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
                <div key={opt.value} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => toggle(opt.value)}>
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

  const TypeFilterSelect = () => {
    const types = Array.from(new Set(leaves.map((l) => l.leaveType))).sort();
    const allChecked = filterTypes.length === types.length;
    const toggle = (val) => {
      if (val === "all") return setFilterTypes(allChecked ? [] : types);
      setFilterTypes((p) => (p.includes(val) ? p.filter((t) => t !== val) : [...p, val]));
    };
    const label = allChecked ? "All types" : filterTypes.length === 0 ? "All types" : `${filterTypes.length} selected`;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[140px] justify-between">
            {label}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 space-y-1" align="start">
          <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => toggle("all")}>
            <Checkbox checked={allChecked} />
            <span>All types</span>
            {allChecked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {types.map((t) => {
              const checked = filterTypes.includes(t);
              return (
                <div key={t} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => toggle(t)}>
                  <Checkbox checked={checked} />
                  <span>{t}</span>
                  {checked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const StatusFilterSelect = () => {
    const statuses = ["all", "pending", "approved", "rejected"];
    const labels = { all: "All status", pending: "Pending", approved: "Approved", rejected: "Rejected" };
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[140px] justify-between">
            {labels[filterStatus]}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          {statuses.map((status) => (
            <div
              key={status}
              className={`flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer ${filterStatus === status ? "bg-muted" : ""}`}
              onClick={() => setFilterStatus(status)}
            >
              <span>{labels[status]}</span>
              {filterStatus === status && <Check className="ml-auto h-4 w-4 text-orange-500" />}
            </div>
          ))}
        </PopoverContent>
      </Popover>
    );
  };

  const SortableHeader = ({ column, label }) => {
    const isSorted = sortConfig.key === column;
    return (
      <TableHead className="cursor-pointer select-none" onClick={() => handleSort(column)}>
        <div className="flex items-center gap-1">
          {label}
          {isSorted && <ArrowUpDown className={`h-3.5 w-3.5 transition-transform ${sortConfig.direction === "desc" ? "rotate-180" : ""}`} />}
        </div>
      </TableHead>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-full mx-auto p-4 lg:px-10 px-2 space-y-6">
        <Toaster position="top-center" />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Calendar className="h-7 w-7 text-orange-500" />
              Leave Logs
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Manage your leave requests and view their status</p>
          </div>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={fetchLeaves} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              New Request
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 dark:border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                  <p className="text-3xl font-bold mt-2">{stats.total}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 dark:border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-3xl font-bold mt-2 text-green-600 dark:text-green-400">{stats.approved}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 dark:border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-3xl font-bold mt-2 text-amber-600 dark:text-amber-400">{stats.pending}</p>
                </div>
                <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 dark:border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                  <p className="text-3xl font-bold mt-2 text-red-600 dark:text-red-400">{stats.rejected}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Controls */}
        <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
          <div className="h-1 w-full bg-orange-500" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-orange-500" />
              Table Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reason, type, approver..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <StatusFilterSelect />
              <TypeFilterSelect />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" placeholder="From date" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" placeholder="To date" />
              <ColumnSelect />
            </div>
            {hasActiveFilters && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Showing {sortedLeaves.length} of {leaves.length} results</span>
                <Button variant="link" onClick={clearAllFilters} className="h-auto p-0 text-orange-500 hover:text-orange-600">
                  Clear all filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
          <div className="h-1 w-full bg-orange-500" />
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                Leave requests
              </CardTitle>
              <span className="text-sm text-muted-foreground">{sortedLeaves.length} of {leaves.length}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columnVisibility.includes("id") && <SortableHeader column="id" label="ID" />}
                    {columnVisibility.includes("leaveType") && <SortableHeader column="leaveType" label="Leave Type" />}
                    {columnVisibility.includes("dateRange") && <SortableHeader column="startDate" label="Date Range" />}
                    {columnVisibility.includes("leaveReason") && <TableHead>My Reason</TableHead>}
                    {columnVisibility.includes("approver") && <TableHead>Approver</TableHead>}
                    {columnVisibility.includes("approverComments") && <TableHead>Approver Comments</TableHead>}
                    {columnVisibility.includes("createdAt") && <SortableHeader column="createdAt" label="Created At" />}
                    {columnVisibility.includes("updatedAt") && <SortableHeader column="updatedAt" label="Updated At" />}
                    {columnVisibility.includes("status") && <SortableHeader column="status" label="Status" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableSkeleton rows={5} cols={columnVisibility.length} />
                  ) : sortedLeaves.length ? (
                    <AnimatePresence>
                      {sortedLeaves.map((l) => (
                        <motion.tr
                          key={l.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          {columnVisibility.includes("id") && <TableCell className="text-xs">{l.id}</TableCell>}
                          {columnVisibility.includes("leaveType") && <TableCell className="text-xs">{l.leaveType}</TableCell>}
                          {columnVisibility.includes("dateRange") && (
                            <TableCell className="text-xs">
                              <div className="flex flex-col gap-1">
                                <div>{fmtMMDDYYYY_hhmma(l.startDate)}</div>
                                <div>{fmtMMDDYYYY_hhmma(l.endDate)}</div>
                              </div>
                            </TableCell>
                          )}
                          {columnVisibility.includes("leaveReason") && (
                            <TableCell className="text-xs max-w-[200px]">
                              {l.leaveReason ? <span className="line-clamp-2">{l.leaveReason}</span> : <span className="text-muted-foreground italic">No reason provided</span>}
                            </TableCell>
                          )}
                          {columnVisibility.includes("approver") && <TableCell className="text-xs">{l.approver?.email || l.approverId || "—"}</TableCell>}
                          {columnVisibility.includes("approverComments") && (
                            <TableCell className="text-xs max-w-[200px]">
                              {l.approverComments ? <span className="line-clamp-2">{l.approverComments}</span> : <span className="text-muted-foreground italic">No comments</span>}
                            </TableCell>
                          )}
                          {columnVisibility.includes("createdAt") && <TableCell className="text-xs">{fmtMMDDYYYY_hhmma(l.createdAt)}</TableCell>}
                          {columnVisibility.includes("updatedAt") && <TableCell className="text-xs">{fmtMMDDYYYY_hhmma(l.updatedAt)}</TableCell>}
                          {columnVisibility.includes("status") && (
                            <TableCell>
                              <StatusBadge status={l.status} />
                            </TableCell>
                          )}
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columnVisibility.length} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="h-8 w-8 text-orange-500/50" />
                          </div>
                          <p className="font-medium">No leave requests found</p>
                          {hasActiveFilters && (
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

        {/* New Request Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Send className="h-5 w-5 text-orange-500" />
                New Leave Request
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Form completion</span>
                  <span className="font-medium text-orange-500">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 [&>div]:bg-orange-500 bg-black/10 dark:bg-white/10" />
              </div>

              {/* Form Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-500" />
                    Leave type <span className="text-orange-500">*</span>
                  </label>
                  <Select value={leaveType} onValueChange={(v) => { setLeaveType(v); setErrors((e) => ({ ...e, leaveType: undefined })); }}>
                    <SelectTrigger className={errors.leaveType ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {policies.map((p) => (
                        <SelectItem key={p.leaveType} value={p.leaveType}>{p.leaveType}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {creditsForType != null && balance != null && (
                    <div className={`text-xs p-2 rounded-md ${exceeds ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400" : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"}`}>
                      <p className="font-medium">Balance: {balance}h of {creditsForType}h</p>
                      {requested > 0 && <p className="mt-1">Requesting: {requested}h {exceeds && "⚠️ Exceeds balance"}</p>}
                    </div>
                  )}
                  {errors.leaveType && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.leaveType}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-orange-500" />
                    Approver <span className="text-orange-500">*</span>
                  </label>
                  <Select value={approverId} onValueChange={(v) => { setApproverId(v); setErrors((e) => ({ ...e, approverId: undefined })); }}>
                    <SelectTrigger className={errors.approverId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select approver" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {approvers.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.approverId && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.approverId}</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    Start date <span className="text-orange-500">*</span>
                  </label>
                  <DateTimePicker value={start} onChange={(v) => { setStart(v); setErrors((e) => ({ ...e, start: undefined })); }} placeholder="Select start" />
                  {errors.start && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.start}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    End date <span className="text-orange-500">*</span>
                  </label>
                  <DateTimePicker value={end} onChange={(v) => { setEnd(v); setErrors((e) => ({ ...e, end: undefined })); }} placeholder="Select end" />
                  {errors.end && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.end}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-500" />
                  Reason <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <Textarea placeholder="Provide a reason for your leave request..." value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[100px] resize-none" />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }} disabled={submitting}>Cancel</Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={handleSubmit} disabled={submitting || progress < 100}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting...</> : <><Send className="h-4 w-4" />Submit Request</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}