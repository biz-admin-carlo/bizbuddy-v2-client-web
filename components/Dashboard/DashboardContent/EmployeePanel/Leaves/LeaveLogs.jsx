// components/Dashboard/DashboardContent/EmployeePanel/Leaves/LeaveLogs.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Calendar, Clock, Filter, AlertCircle, XCircle, ChevronDown, Check } from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { fmtMMDDYYYY_hhmma } from "@/lib/dateTimeFormatter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TableSkeleton from "@/components/common/TableSkeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

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

const labelClass = "my-auto shrink-0 text-sm font-medium text-muted-foreground";

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
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTypes, setFilterTypes] = useState([]);
  const [filterIds, setFilterIds] = useState([]);
  const [sortKey, setSortKey] = useState("newest");
  const [columnVisibility, setColumnVisibility] = useState(columnOptions.map((c) => c.value));

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

  const passesFilters = (l) => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterTypes.length && !filterTypes.includes(l.leaveType)) return false;
    if (filterIds.length && !filterIds.includes(l.id)) return false;
    return true;
  };

  const list = useMemo(() => {
    let l = leaves.filter(passesFilters);

    switch (sortKey) {
      case "id":
        l.sort((a, b) => a.id - b.id);
        break;
      case "createdAt":
        l.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "updatedAt":
        l.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        break;
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
  }, [leaves, filterStatus, filterTypes, filterIds, sortKey]);

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

  const toggleColumn = (val) =>
    setColumnVisibility((prev) => (prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]));

  const ColumnSelect = () => {
    const allChecked = columnVisibility.length === columnOptions.length;
    const toggle = (val) =>
      val === "all" ? setColumnVisibility(allChecked ? [] : columnOptions.map((o) => o.value)) : toggleColumn(val);
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
            <Checkbox checked={allChecked} /> <span>All columns</span>
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
                  <Checkbox checked={checked} /> <span>{opt.label}</span>
                  {checked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const IdFilterSelect = () => {
    const ids = leaves.map((l) => l.id);
    const allChecked = filterIds.length === ids.length;
    const toggle = (val) => {
      if (val === "all") return setFilterIds(allChecked ? [] : ids);
      const num = Number(val);
      setFilterIds((p) => (p.includes(num) ? p.filter((x) => x !== num) : [...p, num]));
    };
    const label = allChecked ? "All IDs" : filterIds.length === 0 ? "No IDs" : `${filterIds.length} selected`;
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
            <Checkbox checked={allChecked} /> <span>All IDs</span>
            {allChecked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {ids.map((id) => {
              const checked = filterIds.includes(id);
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => toggle(id)}
                >
                  <Checkbox checked={checked} /> <span>{id}</span>
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
    const label = allChecked ? "All types" : filterTypes.length === 0 ? "No types" : `${filterTypes.length} selected`;
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
            <Checkbox checked={allChecked} /> <span>All types</span>
            {allChecked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {types.map((t) => {
              const checked = filterTypes.includes(t);
              return (
                <div
                  key={t}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => toggle(t)}
                >
                  <Checkbox checked={checked} /> <span>{t}</span>
                  {checked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="max-w-full mx-auto p-4 lg:px-10 px-2 space-y-8">
      <Toaster position="top-center" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Calendar className="h-7 w-7 text-orange-500" />
          Leave Logs
        </h2>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={fetchLeaves} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh leave history</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2 relative">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-orange-500" />
            Table Controls
          </CardTitle>
          <span className="absolute top-2 right-4 text-sm text-muted-foreground">
            {list.length} of {leaves.length}
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className={labelClass}>Columns:</span>
            <ColumnSelect />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <span className={labelClass}>Filters:</span>
            <IdFilterSelect />
            <TypeFilterSelect />
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            Leave History
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
                        className="cursor-pointer text-nowrap"
                        onClick={() => {
                          const next = sortKey === value ? `${value}-desc` : sortKey === `${value}-desc` ? "newest" : value;
                          setSortKey(
                            next === `${value}-desc`
                              ? value.includes("AscSwitch") // no-op
                              : value
                          );
                          if (["id", "createdAt", "updatedAt"].includes(value)) setSortKey(value);
                          if (value === "leaveType") setSortKey("type");
                          if (value === "status") setSortKey("status");
                          if (value === "dateRange") setSortKey(sortKey === "newest" ? "oldest" : "newest");
                        }}
                      >
                        {label}
                        {["id", "leaveType", "dateRange", "status", "createdAt", "updatedAt"].includes(value) &&
                          sortKey.startsWith(value.replace("leaveType", "type").replace("dateRange", "")) && (
                            <ChevronDown
                              className={`h-4 w-4 inline ${
                                sortKey === "oldest" || sortKey === "id" || sortKey === "createdAt" || sortKey === "updatedAt"
                                  ? "rotate-180"
                                  : ""
                              }`}
                            />
                          )}
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton rows={5} cols={columnVisibility.length} />
                ) : list.length ? (
                  <AnimatePresence>
                    {list.map((l) => (
                      <motion.tr
                        key={l.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        {columnVisibility.includes("id") && <TableCell className="text-nowrap text-xs">{l.id}</TableCell>}

                        {columnVisibility.includes("leaveType") && (
                          <TableCell className="text-nowrap text-xs">{l.leaveType}</TableCell>
                        )}

                        {columnVisibility.includes("dateRange") && (
                          <TableCell className="text-nowrap text-xs">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center">
                                <span className="text-xs text-muted-foreground mr-1"></span> {fmtMMDDYYYY_hhmma(l.startDate)}
                              </div>
                              <div className="flex items-center">
                                <span className="text-xs text-muted-foreground mr-1"></span> {fmtMMDDYYYY_hhmma(l.endDate)}
                              </div>
                            </div>
                          </TableCell>
                        )}

                        {columnVisibility.includes("leaveReason") && (
                          <TableCell className="text-nowrap text-xs">
                            {l.leaveReason ? (
                              <span className="text-xs text-nowrap">{l.leaveReason}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No reason provided</span>
                            )}
                          </TableCell>
                        )}

                        {columnVisibility.includes("approver") && (
                          <TableCell className="text-nowrap text-xs">{l.approver?.email || l.approverId || "—"}</TableCell>
                        )}

                        {columnVisibility.includes("approverComments") && (
                          <TableCell className="text-nowrap text-xs">
                            {l.approverComments ? (
                              <span className="text-xs">{l.approverComments}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No comments</span>
                            )}
                          </TableCell>
                        )}

                        {columnVisibility.includes("createdAt") && (
                          <TableCell className="text-nowrap text-xs">{fmtMMDDYYYY_hhmma(l.createdAt)}</TableCell>
                        )}
                        {columnVisibility.includes("updatedAt") && (
                          <TableCell className="text-nowrap text-xs">{fmtMMDDYYYY_hhmma(l.updatedAt)}</TableCell>
                        )}

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
                        <p>No leave requests found.</p>
                        {(filterStatus !== "all" || filterTypes.length || filterIds.length) && (
                          <Button
                            variant="link"
                            onClick={() => {
                              setFilterStatus("all");
                              setFilterTypes([]);
                              setFilterIds([]);
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
    </div>
  );
}
