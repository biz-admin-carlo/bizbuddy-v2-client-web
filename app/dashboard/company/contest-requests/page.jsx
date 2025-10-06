"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  Filter,
  Check,
  X,
  Eye,
  Calendar,
  User,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Building
} from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { fmtMMDDYYYY_hhmma } from "@/lib/dateTimeFormatter";
import MultiSelect from "@/components/common/MultiSelect";
import ColumnSelector from "@/components/common/ColumnSelector";

export default function AdminContestRequests() {
  const { token, user } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [loading, setLoading] = useState(false);
  const [contestRequests, setContestRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Filter and view states
  const [sortConfig, setSort] = useState({ key: "submittedAt", direction: "descending" });
  const [filters, setFilters] = useState({
    status: ["all"],
    employees: ["all"],
    reasons: ["all"]
  });

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const columnOptions = [
    { value: "employee", label: "Employee" },
    { value: "punchLog", label: "Original Punch Log" },
    { value: "correctTimes", label: "Requested Times" },
    { value: "reason", label: "Reason" },
    { value: "status", label: "Status" },
    { value: "submittedAt", label: "Submitted At" },
    { value: "actions", label: "Actions" }
  ];

  const [visibleCols, setVisibleCols] = useState(columnOptions.map(o => o.value));

  // Mock data for demonstration
  useEffect(() => {
    // Mock employees
    setEmployees([
        { id: "202509260001", name: "Jane Doe", email: "jane.doe@nike.us" },
        { id: "202509260002", name: "John Doe", email: "john.doe@nike.us.ph" },
        { id: "202509260003", name: "Abraham Lincoln", email: "ab.lincon@nike.us.ph" },
        { id: "202509260004", name: "Uncle Sam", email: "uncle.sam@nike.us.ph	" }
      ]);

    // Mock contest requests
    setContestRequests([
      {
        id: "contest1",
        employee: { id: "202509260001", name: "John Doe", email: "john.doe@company.com" },
        originalPunchLog: "09/26/2025 (11:56 AM to 11:56 AM)",
        correctClockIn: "2025-09-26T08:00:00",
        correctClockOut: "2025-09-26T17:00:00",
        reason: "System Clock Error",
        detailedExplanation: "The system clock was showing incorrect time due to server synchronization issues. I actually worked from 8 AM to 5 PM but the system recorded wrong times.",
        status: "pending",
        submittedAt: "2025-09-26T12:30:00Z",
        approvedBy: null,
        approvedAt: null
      },
      {
        id: "contest2",
        employee: { id: "emp2", name: "Jane Smith", email: "jane.smith@company.com" },
        originalPunchLog: "09/25/2025 (08:00 AM to 05:00 PM)",
        correctClockIn: "2025-09-25T08:00:00",
        correctClockOut: "2025-09-25T18:00:00",
        reason: "Device Malfunction",
        detailedExplanation: "My punch device was malfunctioning and didn't record my actual clock out time. I worked overtime until 6 PM.",
        status: "approved",
        submittedAt: "2025-09-25T18:15:00Z",
        approvedBy: "Admin User",
        approvedAt: "2025-09-26T09:00:00Z"
      },
      {
        id: "contest3",
        employee: { id: "emp3", name: "Mike Johnson", email: "mike.johnson@company.com" },
        originalPunchLog: "09/24/2025 (09:00 AM to 04:00 PM)",
        correctClockIn: "2025-09-24T08:30:00",
        correctClockOut: "2025-09-24T17:30:00",
        reason: "Network Issue",
        detailedExplanation: "There was a network connectivity issue that prevented proper time recording. I have email timestamps to prove my actual work hours.",
        status: "rejected",
        submittedAt: "2025-09-24T17:45:00Z",
        approvedBy: "Admin User",
        approvedAt: "2025-09-25T10:30:00Z"
      },
      {
        id: "contest4",
        employee: { id: "emp4", name: "Sarah Wilson", email: "sarah.wilson@company.com" },
        originalPunchLog: "09/23/2025 (07:45 AM to 04:45 PM)",
        correctClockIn: "2025-09-23T08:00:00",
        correctClockOut: "2025-09-23T17:00:00",
        reason: "Power Outage",
        detailedExplanation: "There was a power outage in our building that affected the time clock system. Security cameras can verify my actual arrival and departure times.",
        status: "pending",
        submittedAt: "2025-09-23T18:00:00Z",
        approvedBy: null,
        approvedAt: null
      },
      {
        id: "contest5",
        employee: { id: "202509260001", name: "John Doe", email: "john.doe@company.com" },
        originalPunchLog: "09/22/2025 (08:15 AM to 05:15 PM)",
        correctClockIn: "2025-09-22T08:00:00",
        correctClockOut: "2025-09-22T17:00:00",
        reason: "Other",
        detailedExplanation: "I forgot to punch in exactly at 8 AM and punched in 15 minutes later. Same for punch out. This was due to helping a colleague with an urgent issue.",
        status: "pending",
        submittedAt: "2025-09-22T19:30:00Z",
        approvedBy: null,
        approvedAt: null
      }
    ]);
  }, []);

  const requestSort = (k) =>
    setSort((p) => ({
      key: k,
      direction: p.key === k && p.direction === "ascending" ? "descending" : "ascending",
    }));

  const changeFilter = (k, v) =>
    setFilters((p) => {
      const n = { ...p };
      if (v === "all") n[k] = ["all"];
      else {
        let arr = p[k].filter((x) => x !== "all");
        arr = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
        if (!arr.length) arr = ["all"];
        n[k] = arr;
      }
      return n;
    });

  const clearFilters = () => setFilters({ status: ["all"], employees: ["all"], reasons: ["all"] });

  const anyFilterActive = 
    !filters.status.includes("all") || 
    !filters.employees.includes("all") || 
    !filters.reasons.includes("all");

  const filteredRequests = contestRequests.filter(request => {
    return (
      (filters.status.includes("all") || filters.status.includes(request.status)) &&
      (filters.employees.includes("all") || filters.employees.includes(request.employee.id)) &&
      (filters.reasons.includes("all") || filters.reasons.some(reason => 
        request.reason.toLowerCase().includes(reason.toLowerCase())
      ))
    );
  }).sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const getVal = (req, key) => {
      switch (key) {
        case "employee": return req.employee.name.toLowerCase();
        case "status": return req.status;
        case "reason": return req.reason.toLowerCase();
        case "submittedAt": return new Date(req.submittedAt).getTime();
        default: return "";
      }
    };

    const aVal = getVal(a, sortConfig.key);
    const bVal = getVal(b, sortConfig.key);
    if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
    return 0;
  });

  const pendingCount = contestRequests.filter(r => r.status === "pending").length;
  const approvedCount = contestRequests.filter(r => r.status === "approved").length;
  const rejectedCount = contestRequests.filter(r => r.status === "rejected").length;

  const getStatusBadge = (status) => {
    const badges = {
      pending: <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Pending</Badge>,
      approved: <Badge className="bg-green-500 hover:bg-green-600 text-white">Approved</Badge>,
      rejected: <Badge className="bg-red-500 hover:bg-red-600 text-white">Rejected</Badge>
    };
    return badges[status] || <Badge variant="outline">Unknown</Badge>;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <AlertCircle className="h-4 w-4 text-yellow-500" />,
      approved: <CheckCircle className="h-4 w-4 text-green-500" />,
      rejected: <XCircle className="h-4 w-4 text-red-500" />
    };
    return icons[status] || <AlertCircle className="h-4 w-4" />;
  };

  const openDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleApproveReject = async (requestId, action) => {
    setActionLoading(true);
    
    try {
      // Mock API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setContestRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { 
              ...req, 
              status: action,
              approvedBy: user?.profile?.firstName + " " + user?.profile?.lastName || "Admin",
              approvedAt: new Date().toISOString()
            }
          : req
      ));
      
      toast.success(`Contest request ${action}!`);
      setShowDetailsModal(false);
      
    } catch (error) {
      toast.error(`Failed to ${action} contest request`);
    } finally {
      setActionLoading(false);
    }
  };

  const statusOpts = [
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" }
  ];

  const employeeOpts = employees.map(emp => ({ value: emp.id, label: emp.name }));

  const reasonOpts = [
    { value: "system_clock_error", label: "System Clock Error" },
    { value: "device_malfunction", label: "Device Malfunction" },
    { value: "network_issue", label: "Network Issue" },
    { value: "power_outage", label: "Power Outage" },
    { value: "other", label: "Other" }
  ];

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  return (
    <div className="max-w-full mx-auto p-4 lg:px-10 space-y-8">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-orange-500" />
            Contest Requests Management
          </h2>
          <p className="text-muted-foreground mt-1">Review and approve employee time contest requests</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 shadow-md">
          <div className="h-1 w-full bg-yellow-500" />
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-yellow-500/10 text-yellow-600">
                <Clock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-md">
          <div className="h-1 w-full bg-green-500" />
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-green-500/10 text-green-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-md">
          <div className="h-1 w-full bg-red-500" />
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-red-500/10 text-red-600">
                <XCircle className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Controls */}
      <Card className="border-2 shadow-md">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2 relative">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
              <Filter className="h-5 w-5" />
            </div>
            Table Controls
          </CardTitle>
          <span className="absolute top-2 right-4 text-sm text-muted-foreground">
            {filteredRequests.length} of {contestRequests.length}
          </span>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <span className="my-auto shrink-0 text-sm font-medium text-muted-foreground">Column:</span>
              <ColumnSelector options={columnOptions} visible={visibleCols} setVisible={setVisibleCols} />
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="my-auto shrink-0 text-sm font-medium text-muted-foreground">Filter:</span>
              <MultiSelect
                options={statusOpts}
                selected={filters.status}
                onChange={(v) => changeFilter("status", v)}
                allLabel="All Status"
                width={150}
              />
              <MultiSelect
                options={employeeOpts}
                selected={filters.employees}
                onChange={(v) => changeFilter("employees", v)}
                allLabel="All Employees"
                icon={User}
                width={180}
              />
              <MultiSelect
                options={reasonOpts}
                selected={filters.reasons}
                onChange={(v) => changeFilter("reasons", v)}
                allLabel="All Reasons"
                width={180}
              />
              {anyFilterActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contest Requests Table */}
      <Card className="border-2 shadow-md overflow-hidden">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
              <Building className="h-5 w-5" />
            </div>
            Contest Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columnOptions
                    .filter((o) => o.value !== "actions" && visibleCols.includes(o.value))
                    .map(({ value, label }) => (
                      <TableHead key={value} className="text-center cursor-pointer" onClick={() => requestSort(value)}>
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
                  {visibleCols.includes("actions") && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      {visibleCols.map((c) => (
                        <TableCell key={c}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredRequests.length > 0 ? (
                  <AnimatePresence>
                    {filteredRequests.map((request) => (
                      <motion.tr
                        key={request.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-b hover:bg-muted/50"
                      >
                        {visibleCols.includes("employee") && (
                          <TableCell className="text-center text-xs">
                            <div className="flex items-center justify-center gap-2">
                              <User className="h-3 w-3" />
                              <div>
                                <div className="font-medium">{request.employee.name}</div>
                                <div className="text-muted-foreground">{request.employee.email}</div>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        {visibleCols.includes("punchLog") && (
                          <TableCell className="text-center text-xs font-mono min-w-[180px]">
                            <div className="space-y-1">
                              <div className="font-semibold text-muted-foreground text-[10px]">ORIGINAL</div>
                              <div className="text-xs">{request.originalPunchLog}</div>
                            </div>
                          </TableCell>
                        )}
                        {visibleCols.includes("correctTimes") && (
                          <TableCell className="text-center text-xs min-w-[200px]">
                            <div className="space-y-2">
                              <div className="font-semibold text-muted-foreground text-[10px]">REQUESTED</div>
                              <div className="space-y-1">
                                <div className="bg-green-50 border border-green-200 rounded px-2 py-1">
                                  <div className="text-green-700 font-medium text-[10px]">CLOCK IN</div>
                                  <div className="text-xs font-medium">{formatDateTime(request.correctClockIn)}</div>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded px-2 py-1">
                                  <div className="text-red-700 font-medium text-[10px]">CLOCK OUT</div>
                                  <div className="text-xs font-medium">{formatDateTime(request.correctClockOut)}</div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        {visibleCols.includes("reason") && (
                          <TableCell className="text-center text-xs">
                            <Badge variant="outline" className="text-xs">
                              {request.reason}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleCols.includes("status") && (
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {getStatusIcon(request.status)}
                              {getStatusBadge(request.status)}
                            </div>
                          </TableCell>
                        )}
                        {visibleCols.includes("submittedAt") && (
                          <TableCell className="text-center text-xs">
                            {fmtMMDDYYYY_hhmma(request.submittedAt)}
                          </TableCell>
                        )}
                        {visibleCols.includes("actions") && (
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openDetails(request)}
                                      className="text-blue-500 hover:bg-blue-500/10"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View details</TooltipContent>
                                </Tooltip>
                                {request.status === "pending" && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleApproveReject(request.id, "approved")}
                                          className="text-green-500 hover:bg-green-500/10"
                                          disabled={actionLoading}
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Approve request</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleApproveReject(request.id, "rejected")}
                                          className="text-red-500 hover:bg-red-500/10"
                                          disabled={actionLoading}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Reject request</TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        )}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={visibleCols.length} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="h-12 w-12 mb-4 text-orange-500/50" />
                        <p className="text-sm">No contest requests found.</p>
                        {anyFilterActive && (
                          <Button 
                            variant="link" 
                            onClick={clearFilters}
                            className="text-orange-600 hover:text-orange-700 mt-2"
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

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="border-2 max-w-2xl">
          <div className="h-1 w-full bg-blue-500 -mt-4 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-blue-200/20 text-blue-500">
                <Eye className="h-5 w-5" />
              </div>
              Contest Request Details
            </DialogTitle>
            <DialogDescription>Review employee time contest request</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Employee Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Employee Information</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{selectedRequest.employee.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedRequest.employee.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Details */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Time Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">Original Punch Log</h4>
                    <p className="text-sm font-mono">{selectedRequest.originalPunchLog}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Requested Correction</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Clock In:</span>
                        <span>{formatDateTime(selectedRequest.correctClockIn)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Clock Out:</span>
                        <span>{formatDateTime(selectedRequest.correctClockOut)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason and Explanation */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Reason & Explanation</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Reason</label>
                    <Badge variant="outline" className="ml-2">{selectedRequest.reason}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Detailed Explanation</label>
                    <div className="mt-1 bg-muted/50 rounded-lg p-4">
                      <p className="text-sm">{selectedRequest.detailedExplanation}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status and Timestamps */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Request Status</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Status:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedRequest.status)}
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Submitted:</span>
                    <span className="text-sm">{fmtMMDDYYYY_hhmma(selectedRequest.submittedAt)}</span>
                  </div>
                  {selectedRequest.approvedBy && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Reviewed by:</span>
                        <span className="text-sm">{selectedRequest.approvedBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Reviewed at:</span>
                        <span className="text-sm">{fmtMMDDYYYY_hhmma(selectedRequest.approvedAt)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)} disabled={actionLoading}>
              Close
            </Button>
            {selectedRequest && selectedRequest.status === "pending" && (
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleApproveReject(selectedRequest.id, "rejected")}
                  disabled={actionLoading}
                  variant="destructive"
                >
                  {actionLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                  Reject
                </Button>
                <Button 
                  onClick={() => handleApproveReject(selectedRequest.id, "approved")}
                  disabled={actionLoading}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  {actionLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  Approve
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}