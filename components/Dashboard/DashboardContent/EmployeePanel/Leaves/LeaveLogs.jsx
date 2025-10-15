// components/Dashboard/DashboardContent/EmployeePanel/Leaves/LeaveLogs.jsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Calendar, Clock, AlertCircle, XCircle, Filter, Search, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { fmtMMDDYYYY_hhmma } from "@/lib/dateTimeFormatter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TableSkeleton from "@/components/common/TableSkeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const statusColors = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900",
  rejected: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900",
};

const statusIcons = {
  pending: <Clock className="h-3.5 w-3.5" />,
  approved: <CheckCircle2 className="h-3.5 w-3.5" />,
  rejected: <XCircle className="h-3.5 w-3.5" />,
};

const columnOptions = [
  { value: "id", label: "ID", defaultVisible: false },
  { value: "leaveType", label: "Leave Type", defaultVisible: true },
  { value: "dateRange", label: "Date Range", defaultVisible: true },
  { value: "leaveReason", label: "Reason", defaultVisible: true },
  { value: "approver", label: "Approver", defaultVisible: true },
  { value: "approverComments", label: "Comments", defaultVisible: false },
  { value: "createdAt", label: "Submitted", defaultVisible: true },
  { value: "updatedAt", label: "Last Updated", defaultVisible: false },
  { value: "status", label: "Status", defaultVisible: true },
];

const formatDateWithDay = (dateStr) => {
  const date = new Date(dateStr);
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
  const formattedDate = date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila'
  });
  return { dayOfWeek, formattedDate: `${formattedDate} PHT` };
};

export default function LeaveLogs() {
  const { token } = useAuthStore();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTypes, setFilterTypes] = useState([]);
  const [sortKey, setSortKey] = useState("newest");
  const [columnVisibility, setColumnVisibility] = useState(
    columnOptions.filter((c) => c.defaultVisible).map((c) => c.value)
  );

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
        toast.message("Leave logs refreshed", {
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
    let filtered = [...leaves];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.id.toString().includes(query) ||
          l.leaveType?.toLowerCase().includes(query) ||
          l.leaveReason?.toLowerCase().includes(query) ||
          l.approver?.email?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((l) => l.status === filterStatus);
    }

    // Type filter
    if (filterTypes.length > 0) {
      filtered = filtered.filter((l) => filterTypes.includes(l.leaveType));
    }

    // Sorting
    switch (sortKey) {
      case "id":
        filtered.sort((a, b) => a.id - b.id);
        break;
      case "type":
        filtered.sort((a, b) => a.leaveType.localeCompare(b.leaveType));
        break;
      case "status":
        filtered.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        break;
      case "createdAt":
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "updatedAt":
        filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        break;
      case "newest":
      default:
        filtered.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    }

    return filtered;
  }, [leaves, searchQuery, filterStatus, filterTypes, sortKey]);

  const availableTypes = useMemo(
    () => Array.from(new Set(leaves.map((l) => l.leaveType))).sort(),
    [leaves]
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== "all") count++;
    if (filterTypes.length > 0) count++;
    if (searchQuery) count++;
    return count;
  }, [filterStatus, filterTypes, searchQuery]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterTypes([]);
  };

  const StatusBadge = ({ status }) => (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
        statusColors[status] || "bg-gray-100 text-gray-700 border border-gray-200"
      }`}
    >
      {statusIcons[status]}
      <span className="capitalize">{status}</span>
    </span>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Toaster position="top-center" />
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Leave History
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View and track all your leave requests
              </p>
            </div>
          </div>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={fetchLeaves}
                  disabled={loading}
                  variant="outline"
                  size="default"
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh leave history</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Filters Card */}
        <Card className="border-2 shadow-sm dark:border-white/10">
          <div className="h-1 w-full bg-orange-500" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4 text-orange-500" />
                Filters & Search
                {activeFiltersCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 text-xs font-medium">
                    {activeFiltersCount}
                  </span>
                )}
              </CardTitle>
              {activeFiltersCount > 0 && (
                <Button
                  variant="link"
                  onClick={clearAllFilters}
                  className="text-orange-600 dark:text-orange-400 hover:text-orange-700 p-0 h-auto text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, type, reason, or approver..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Leave Type
                </label>
                <div className="relative">
                  <select
                    value={filterTypes[0] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFilterTypes(val ? [val] : []);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All types ({availableTypes.length})</option>
                    {availableTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Column Visibility */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Visible Columns
                </label>
                <div className="relative">
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      setColumnVisibility((prev) =>
                        prev.includes(val)
                          ? prev.filter((x) => x !== val)
                          : [...prev, val]
                      );
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">
                      {columnVisibility.length}/{columnOptions.length} columns visible
                    </option>
                    {columnOptions.map((col) => (
                      <option key={col.value} value={col.value}>
                        {columnVisibility.includes(col.value) ? "✓ " : "○ "}
                        {col.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
          <p className="text-gray-600 dark:text-gray-400">
            Showing{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {list.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {leaves.length}
            </span>{" "}
            leave requests
          </p>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="type">By type</option>
            <option value="status">By status</option>
            <option value="createdAt">By submission date</option>
            <option value="updatedAt">By last update</option>
          </select>
        </div>

        {/* Table */}
        <Card className="border-2 shadow-sm dark:border-white/10">
          <div className="h-1 w-full bg-orange-500" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-orange-500" />
              Leave History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {columnOptions
                      .filter((c) => columnVisibility.includes(c.value))
                      .map((col) => (
                        <th
                          key={col.value}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                        >
                          {col.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {loading ? (
                    <TableSkeleton rows={5} cols={columnVisibility.length} />
                  ) : list.length > 0 ? (
                    list.map((leave) => (
                      <tr
                        key={leave.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        {columnVisibility.includes("id") && (
                          <td className="px-4 py-3 text-xs font-mono text-gray-400 dark:text-gray-600 whitespace-nowrap">
                            {leave.id}
                          </td>
                        )}
                        {columnVisibility.includes("leaveType") && (
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {leave.leaveType}
                          </td>
                        )}
                        {columnVisibility.includes("dateRange") && (
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs text-gray-400 dark:text-gray-500">Start: {formatDateWithDay(leave.startDate).dayOfWeek}</span>
                                <div className="text-gray-900 dark:text-gray-100 font-medium">
                                  {formatDateWithDay(leave.startDate).formattedDate}
                                </div>
                              </div>
                              <div>
                                <span className="text-xs text-gray-400 dark:text-gray-500">End: {formatDateWithDay(leave.endDate).dayOfWeek}</span>
                                <div className="text-gray-600 dark:text-gray-400">
                                  {formatDateWithDay(leave.endDate).formattedDate}
                                </div>
                              </div>
                            </div>
                          </td>
                        )}
                        {columnVisibility.includes("leaveReason") && (
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                            {leave.leaveReason || (
                              <span className="text-gray-400 italic">
                                No reason provided
                              </span>
                            )}
                          </td>
                        )}
                        {columnVisibility.includes("approver") && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {leave.approver?.email || leave.approverId || "—"}
                          </td>
                        )}
                        {columnVisibility.includes("approverComments") && (
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                            {leave.approverComments || (
                              <span className="text-gray-400 italic">
                                No comments
                              </span>
                            )}
                          </td>
                        )}
                        {columnVisibility.includes("createdAt") && (
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <div>
                              <span className="text-xs text-gray-400 dark:text-gray-500 block">
                                {formatDateWithDay(leave.createdAt).dayOfWeek}
                              </span>
                              <span className="text-gray-700 dark:text-gray-300">
                                {formatDateWithDay(leave.createdAt).formattedDate}
                              </span>
                            </div>
                          </td>
                        )}
                        {columnVisibility.includes("updatedAt") && (
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <div>
                              <span className="text-xs text-gray-400 dark:text-gray-500 block">
                                {formatDateWithDay(leave.updatedAt).dayOfWeek}
                              </span>
                              <span className="text-gray-700 dark:text-gray-300">
                                {formatDateWithDay(leave.updatedAt).formattedDate}
                              </span>
                            </div>
                          </td>
                        )}
                        {columnVisibility.includes("status") && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={leave.status} />
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columnVisibility.length}
                        className="px-4 py-12 text-center"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                            <Calendar className="h-8 w-8 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              No leave requests found
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {activeFiltersCount > 0
                                ? "Try adjusting your filters"
                                : "You haven't submitted any leave requests yet"}
                            </p>
                          </div>
                          {activeFiltersCount > 0 && (
                            <Button
                              variant="link"
                              onClick={clearAllFilters}
                              className="text-orange-600 dark:text-orange-400 hover:text-orange-700"
                            >
                              Clear all filters
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}