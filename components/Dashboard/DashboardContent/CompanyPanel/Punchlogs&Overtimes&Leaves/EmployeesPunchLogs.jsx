/* components/Dashboard/DashboardContent/CompanyPanel/PunchLogs&Overtime&Leaves/EmployeesPunchLogs.jsx */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Clock,
  Filter,
  RefreshCw,
  Download,
  FileText,
  Calendar,
  Info,
  Globe,
  MapPin,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Edit3,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Timer,
  Coffee,
  Users,
  Building,
  MapPinIcon,
  AlarmClockPlus, 
  ChevronDown, 
  ChevronUp,
  User,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { exportEmployeePunchLogsCSV, exportEmployeePunchLogsPDF } from "@/lib/exportUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import IconBtn from "@/components/common/IconBtn";
import MultiSelect from "@/components/common/MultiSelect";
import ColumnSelector from "@/components/common/ColumnSelector";
import TableSkeleton from "@/components/common/TableSkeleton";
import { Textarea } from "@/components/ui/textarea";

const MAX_DEV_CHARS = 12;
const truncate = (s = "", L = MAX_DEV_CHARS) => (s.length > L ? s.slice(0, L) + "…" : s);
const safeDate = (d, timezone = "UTC") =>
  d
    ? new Date(d).toLocaleDateString('en-US', {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: timezone
      })
    : "—";
const safeTime = (d, timezone = "UTC") => 
  d ? new Date(d).toLocaleTimeString('en-US', { 
    hour: "2-digit", 
    minute: "2-digit",
    hour12: true,
    timeZone: timezone
  }) : "—";
const safeDateTime = (d, timezone = "UTC") => {
  if (!d) return "—";
  
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone
  });
};
const getTimezoneName = (tz) => {
  const parts = tz.split('/');
  return parts[parts.length - 1].replace(/_/g, ' ');
};
const diffMins = (a, b) => (new Date(b) - new Date(a)) / 60000;
const toHour = (m) => (m / 60).toFixed(2);
const coffeeMinutes = (arr = []) => toHour(arr.reduce((m, b) => (b.start && b.end ? m + diffMins(b.start, b.end) : m), 0));
const lunchMinutesStr = (l) => (!l || !l.start || !l.end ? "0.00" : toHour(diffMins(l.start, l.end)));
const lunchMinutesNum = (l) => (!l || !l.start || !l.end ? 0 : diffMins(l.start, l.end));
const fmtDevice = (d) => {
  if (!d) return "—";
  if (typeof d === "string") return d;
  const b = d.manufacturer || d.brand;
  const m = d.deviceName || d.model;
  return [b, m].filter(Boolean).join(", ");
};
const fmtLoc = (loc) => {
  if (!loc || loc.latitude == null || loc.longitude == null) return { txt: "—", lat: null, lng: null };
  const lat = Number(loc.latitude);
  const lng = Number(loc.longitude);
  return { txt: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
};
const wrap = (v) => `"${String(v).replace(/"/g, '""')}"`;
const JS_DAY_TO_RRULE = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const templateMatchesDate = (tmpl, userId, isoDate) => {
  // Check user assignment
  if (!(tmpl.assignedToAll || tmpl.assignedUserId === userId)) {
    return false;
  }
  
  // Parse the date consistently
  const checkDate = new Date(isoDate + 'T00:00:00Z'); // Force UTC midnight
  const startDate = new Date(tmpl.startDate);
  const endDate = tmpl.endDate ? new Date(tmpl.endDate) : null;
  
  // Check date range
  if (checkDate < startDate) {
    return false;
  }
  
  if (endDate && checkDate > endDate) {
    return false;
  }
  
  // Check day of week
  const byDayMatch = tmpl.recurrencePattern?.match(/BYDAY=([^;]+)/i);
  if (!byDayMatch) {
    // If no BYDAY pattern, assume all days match
    return true;
  }
  
  const byDayStr = byDayMatch[1];
  const allowedDays = byDayStr.split(",").map(d => d.trim()).filter(Boolean);
  
  // Get day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = checkDate.getUTCDay();
  const rruleDayCode = JS_DAY_TO_RRULE[dayOfWeek];
  
  // Check if the day matches
  const dayMatches = allowedDays.includes(rruleDayCode);
  
  return dayMatches;
};

const z = (n) => String(n).padStart(2, "0");
const toLocalInputValue = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}` + `T${z(d.getHours())}:${z(d.getMinutes())}`;
};

// Enhanced Status Badge with Hover Definitions
const StatusBadge = ({ status, otStatus }) => {
  const getStatusDefinition = (status) => {
    switch (status) {
      case 'active':
        return "Active: Employee is currently clocked in and working. Time is being tracked in real-time.";
      case 'completed':
        return "Completed: Employee has clocked out. This shift is finished and ready for processing.";
      default:
        return "Unknown status";
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {status === "active" ? (
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 cursor-help">
              <Timer className="w-3 h-3 mr-1" />Active
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 cursor-help">
              <CheckCircle className="w-3 h-3 mr-1" />Complete
            </Badge>
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="text-sm">{getStatusDefinition(status)}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Enhanced Overtime Badge with Detailed Definitions
const OvertimeBadge = ({ otStatus, overtimeRec, onClick }) => {
  const getOvertimeDefinition = (status) => {
    switch (status) {
      case "approved":
        return "Approved: Overtime request has been approved by supervisor. Extra hours will be paid at overtime rate.";
      case "pending":
        return "Pending: Overtime request is awaiting supervisor approval. Employee worked extra hours but payment is not yet confirmed.";
      case "rejected":
        return "Rejected: Overtime request was denied. Extra hours worked beyond scheduled time will not be paid at overtime rate.";
      case "No Approval":
        return "No Approval: Employee worked beyond scheduled hours but did not submit an overtime request. These hours may not be compensated.";
      default:
        return "No overtime recorded for this shift.";
    }
  };

  const getVariant = () => {
    switch (otStatus) {
      case "approved": return "default";
      case "pending": return "secondary";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };
  
  const getIcon = () => {
    switch (otStatus) {
      case "approved": return <CheckCircle className="w-3 h-3 mr-1" />;
      case "pending": return <AlertCircle className="w-3 h-3 mr-1" />;
      case "rejected": return <XCircle className="w-3 h-3 mr-1" />;
      default: return <Timer className="w-3 h-3 mr-1" />;
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getVariant()} 
            className="cursor-pointer hover:opacity-80 capitalize text-xs"
            onClick={onClick}
          >
            {getIcon()}
            {otStatus}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="text-sm">{getOvertimeDefinition(otStatus)}</div>
          {overtimeRec && (
            <div className="text-xs text-muted-foreground mt-1 pt-1 border-t">
              Click to view detailed overtime request information
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Enhanced Schedule Badge with Definitions
const ScheduleBadge = ({ isScheduled, onClick }) => {
  const getScheduleDefinition = (scheduled) => {
    if (scheduled) {
      return "Scheduled: Employee has a predefined shift schedule for this date. Work hours are tracked against expected schedule times.";
    }
    return "Unscheduled: No predefined shift schedule for this date. Work hours are tracked using default company settings.";
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isScheduled ? "default" : "secondary"} 
            className="cursor-pointer hover:opacity-80 text-xs"
            onClick={onClick}
          >
            {isScheduled ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
            {isScheduled ? "Scheduled" : "Unscheduled"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="text-sm">{getScheduleDefinition(isScheduled)}</div>
          <div className="text-xs text-muted-foreground mt-1 pt-1 border-t">
            Click to view detailed schedule information
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Enhanced Location Badge with Definitions
const LocationBadge = ({ isRestricted, onClick }) => {
  const getLocationDefinition = (restricted) => {
    if (restricted) {
      return "Location Required: Employee must clock in/out from designated locations. GPS coordinates are verified against approved work sites.";
    }
    return "No Location Restriction: Employee can clock in/out from any location. GPS tracking is optional.";
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isRestricted ? "default" : "secondary"} 
            className={`cursor-pointer text-xs ${!isRestricted ? 'opacity-50' : 'hover:opacity-80'}`}
            onClick={isRestricted ? onClick : undefined}
          >
            <MapPinIcon className="w-3 h-3 mr-1" />
            {isRestricted ? "Required" : "None"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="text-sm">{getLocationDefinition(isRestricted)}</div>
          {isRestricted && (
            <div className="text-xs text-muted-foreground mt-1 pt-1 border-t">
              Click to view allowed locations and GPS coordinates
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Enhanced Time Display with Explanations
const TimeDisplayWithTooltip = ({ time, type, className = "" }) => {
  const getTimeDefinition = (type) => {
    switch (type) {
      case 'duration':
        return "Duration: Total time between clock in and clock out, including all breaks.";
      case 'period':
        return "Period Hours: Productive work time excluding lunch breaks and unauthorized overtime.";
      case 'late':
        return "Late Hours: Amount of time the employee was late compared to their scheduled start time.";
      case 'coffee':
        return "Coffee Breaks: Total time spent on coffee/short breaks during the shift.";
      case 'lunch':
        return "Lunch Break: Time taken for lunch break. Minimum lunch time may be automatically deducted.";
      case 'overtime':
        return "Overtime Hours: Additional hours worked beyond the regular shift schedule.";
      default:
        return "";
    }
  };

  if (!time || time === "—" || time === "0.00") {
    return <span className={`text-muted-foreground text-xs ${className}`}>—</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help border-b border-dotted border-muted-foreground ${className}`}>
            {time} {type !== 'coffee' ? 'hrs' : ''}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="text-sm">{getTimeDefinition(type)}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default function EmployeesPunchLogs() {
  const { token } = useAuthStore();
  const [userTimezone, setUserTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [companyTimezone, setCompanyTimezone] = useState("UTC");
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [timelogs, setTimelogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [locMap, setLocMap] = useState({});
  const [defaultHours, setDefaultHours] = useState(8);
  const [minLunchMins, setMinLunchMins] = useState(60);
  const [companyName, setCompanyName] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const perPage = 15;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [rowsLoaded, setRowsLoaded] = useState(0);

  const [pendingRequests, setPendingRequests] = useState([]);
  const [requestsExpanded, setRequestsExpanded] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestStatusFilter, setRequestStatusFilter] = useState("PENDING");
  const [approvingRequest, setApprovingRequest] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const resetFilters = {
    search: "",
    employeeIds: ["all"],
    departmentId: "all",
    from: "",
    to: "",
    status: "all",
  };
  const [filters, setFilters] = useState(resetFilters);
  const toggleListFilter = (key, val) =>
    setFilters((prev) => {
      if (val === "all") return { ...prev, [key]: ["all"] };
      let list = prev[key].filter((x) => x !== "all");
      list = list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
      if (!list.length) list = ["all"];
      return { ...prev, [key]: list };
    });
  const anyFilterActive =
    filters.search ||
    !filters.employeeIds.includes("all") ||
    filters.departmentId !== "all" ||
    filters.from ||
    filters.to ||
    filters.status !== "all";
  const clearAllFilters = () => setFilters(resetFilters);
  const [sortConfig] = useState({ key: "dateTimeIn", direction: "descending" });
  const [schedDialogOpen, setSchedDialogOpen] = useState(false);
  const [scheduleList, setScheduleList] = useState([]);
  const [otDialogOpen, setOtDialogOpen] = useState(false);
  const [otViewData, setOtViewData] = useState(null);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationDialogList, setLocationDialogList] = useState([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editLog, setEditLog] = useState(null);
  const [editTimeIn, setEditTimeIn] = useState("");
  const [editTimeOut, setEditTimeOut] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const canEdit = ["superadmin", "admin", "supervisor"].includes((currentUserRole || "").toLowerCase());

  // Improved column configuration with better defaults and grouping
  const columnOptions = [
    { value: "employee", label: "Employee", essential: true, group: "basic" },
    { value: "dateTimeIn", label: "Time In", essential: true, group: "basic" },
    { value: "dateTimeOut", label: "Time Out", essential: true, group: "basic" },
    { value: "duration", label: "Duration", essential: false, group: "basic" },
    { value: "status", label: "Status", essential: true, group: "basic" },
    { value: "schedule", label: "Scheduled", essential: false, group: "schedule" },
    { value: "period", label: "Period Hours", essential: false, group: "schedule" },
    { value: "ot", label: "Overtime", essential: false, group: "time" },
    { value: "otStatus", label: "OT Status", essential: false, group: "time" },
    { value: "late", label: "Late", essential: false, group: "time" },
    { value: "coffee", label: "Coffee", essential: false, group: "breaks" },
    { value: "lunch", label: "Lunch", essential: false, group: "breaks" },
    { value: "locationRestricted", label: "Location Required", essential: false, group: "location" },
    { value: "locationIn", label: "Check-in Location", essential: false, group: "location" },
    { value: "locationOut", label: "Check-out Location", essential: false, group: "location" },
    { value: "deviceIn", label: "Device In", essential: false, group: "device" },
    { value: "deviceOut", label: "Device Out", essential: false, group: "device" },
    { value: "id", label: "ID", essential: false, group: "meta" },
    { value: "actions", label: "Actions", essential: true, group: "basic" },
  ];

  const columnMapForExport = {
    id: "Log ID",
    schedule: "Scheduled",
    locationRestricted: "Location Required",
    employee: "Employee",
    dateTimeIn: "Time In",
    dateTimeOut: "Time Out",
    duration: "Duration",
    coffee: "Coffee Break",
    lunch: "Lunch Break",
    ot: "Overtime",
    otStatus: "OT Status",
    late: "Late Hours",
    deviceIn: "Device In",
    deviceOut: "Device Out",
    locationIn: "Location In",
    locationOut: "Location Out",
    period: "Period Hours",
    status: "Status",
  };

  // Better default column visibility - show only essential columns by default
  const essentialColumns = columnOptions.filter(c => c.essential).map(c => c.value);
  const [columnVisibility, setColumnVisibility] = useState(essentialColumns);

  const bootstrap = useCallback(async () => {
    try {
      const [cSet, prof, emps, depts, tmpl, locs] = await Promise.all([
        fetch(`${API_URL}/api/company-settings/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/account/profile`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/employee?all=1`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/departments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/shiftschedules?all=1`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/location`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [cJ, pJ, eJ, dJ, tJ, lJ] = await Promise.all([
        cSet.json(),
        prof.json(),
        emps.json(),
        depts.json(),
        tmpl.json(),
        locs.json(),
      ]);
      if (cSet.ok) {
        setDefaultHours(cJ.data?.defaultShiftHours ?? 8);
        const raw = cJ.data?.minimumLunchMinutes;
        setMinLunchMins(raw === null ? 0 : raw ?? 60);
        
        const ctz = cJ.data?.timezone || cJ.data?.companyTimezone || "America/Los_Angeles";
        setCompanyTimezone(ctz);
      }
      if (pJ?.data?.company?.name) setCompanyName(pJ.data.company.name.replace(/\s+/g, "_"));
      if (pJ?.data) {
        const profObj = pJ.data.profile ?? {};
        const user = pJ.data.user ?? {};
        setCurrentUserEmail(user.email || "");
        setCurrentUserRole(user.role || "");
        const name = user.fullName || `${profObj.firstName ?? ""} ${profObj.lastName ?? ""}`.trim() || user.email || "";
        setCurrentUserName(name);
        
        const utz = user.timezone || 
                     pJ.data?.timezone ||
                     Intl.DateTimeFormat().resolvedOptions().timeZone || 
                     "UTC";
        setUserTimezone(utz);
      }
      if (eJ?.data) setEmployees(eJ.data);
      if (dJ?.data) setDepartments(dJ.data);
      if (tJ?.data) setShiftTemplates(tJ.data);
      if (lJ?.data) {
        const map = {};
        lJ.data.forEach((loc) => {
          (loc.LocationRestriction || []).forEach((lr) => {
            if (lr.restrictionStatus) {
              map[lr.userId] = map[lr.userId] || [];
              map[lr.userId].push(loc);
            }
          });
        });
        setLocMap(map);
      }
    } catch {
      toast.error("Initialization failed");
    }
  }, [API_URL, token]);

  const handleApproveRequest = async (requestId) => {
    setApprovingRequest(requestId);
    try {
      const res = await fetch(`${API_URL}/api/request-punch-log/approve/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const j = await res.json();
      
      if (!res.ok) throw new Error(j.message || "Approval failed");
      
      toast.success("Punch log request approved and time log created!");
      
      // Refresh both requests and time logs
      await Promise.all([
        fetchPendingRequests(),
        fetchTimelogs({ pageParam: page, append: false })
      ]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setApprovingRequest(null);
    }
  };
  
  const handleRejectRequest = async () => {
    if (!rejectingRequest || !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/request-punch-log/reject/${rejectingRequest.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rejectionReason }),
      });
      const j = await res.json();
      
      if (!res.ok) throw new Error(j.message || "Rejection failed");
      
      toast.success("Punch log request rejected");
      
      // Close dialog and refresh
      setRejectDialogOpen(false);
      setRejectingRequest(null);
      setRejectionReason("");
      await fetchPendingRequests();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const fetchPendingRequests = useCallback(async () => {
    if (!token) return;
    setLoadingRequests(true);
    try {
      const res = await fetch(`${API_URL}/api/request-punch-log/all-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (res.ok) {
        const requests = j.data || [];
        setPendingRequests(requests);
        
        // Auto-expand if there are pending requests
        const hasPending = requests.some(r => r.status === "PENDING");
        setRequestsExpanded(hasPending);
      }
    } catch (err) {
      console.error("Error fetching pending requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  }, [token, API_URL]);

  const fetchTimelogs = useCallback(
    async ({ pageParam = 1, append = false } = {}) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.append("page", pageParam);
        qs.append("limit", perPage);
        if (filters.departmentId !== "all") qs.append("departmentId", filters.departmentId);
        if (filters.from) qs.append("from", filters.from);
        if (filters.to) qs.append("to", filters.to);
        if (filters.status !== "all") qs.append("status", filters.status);
        if (filters.employeeIds.length === 1 && filters.employeeIds[0] !== "all") qs.append("employeeId", filters.employeeIds[0]);
        const [tlRes, otRes] = await Promise.all([
          fetch(`${API_URL}/api/timelogs?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/overtime`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [tlJ, otJ] = await Promise.all([tlRes.json(), otRes.json()]);
        if (!tlRes.ok) throw new Error(tlJ.error || "Punch Logs fetch failed");
        if (!otRes.ok) throw new Error(otJ.error || "Overtime fetch failed");
        const otMap = {};
        (otJ.data || []).forEach((o) => {
          const existing = otMap[o.timeLogId];
          const ts = new Date(o.updatedAt || o.createdAt);
          if (!existing || ts > new Date(existing.updatedAt || existing.createdAt)) otMap[o.timeLogId] = o;
        });
        const enriched = (tlJ.data || []).map((t) => {
          const coffeeMinsStr = coffeeMinutes(t.coffeeBreaks);
          const lunchMinsStr = lunchMinutesStr(t.lunchBreak);
          const coffeeMinsNum = parseFloat(coffeeMinsStr) * 60;
          const lunchMinsNum = lunchMinutesNum(t.lunchBreak);
          const excessCoffeeMins = Math.max(0, coffeeMinsNum - 30);
          const dateKey = t.timeIn ? t.timeIn.slice(0, 10) : "";

          const matchedTemplates = shiftTemplates.filter((s) => templateMatchesDate(s, t.userId, dateKey));
          const isScheduled = matchedTemplates.length > 0;
          
          const firstSched = matchedTemplates[0];
          let shiftEndLocalStr = "—";
          let shiftName = "—";
          let shiftStart, shiftEnd;
          if (isScheduled && firstSched?.shift?.startTime && firstSched?.shift?.endTime) {
            const base = t.timeIn ? new Date(t.timeIn) : new Date(`${dateKey}T00:00:00`);
            const ssUTC = new Date(firstSched.shift.startTime);
            const seUTC = new Date(firstSched.shift.endTime);
            shiftStart = new Date(base);
            shiftStart.setHours(ssUTC.getUTCHours(), ssUTC.getUTCMinutes(), 0, 0);
            shiftEnd = new Date(base);
            shiftEnd.setHours(seUTC.getUTCHours(), seUTC.getUTCMinutes(), 0, 0);
            if (shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);
            shiftEndLocalStr = safeDateTime(shiftEnd);
            shiftName = firstSched.shift.shiftName || "—";
          }
          const latestOt = otMap[t.id] ?? null;
          let adjTimeOut = t.timeOut;
          if (isScheduled && t.timeOut && shiftEnd) {
            const actualOut = new Date(t.timeOut);
            if (actualOut > shiftEnd) {
              const approved = latestOt && latestOt.status === "approved";
              if (!approved) adjTimeOut = shiftEnd.toISOString();
            }
          }
          const grossMins = t.timeIn && adjTimeOut ? diffMins(t.timeIn, adjTimeOut) : 0;
          const lunchDeduct = minLunchMins ? Math.max(lunchMinsNum, minLunchMins) : lunchMinsNum;
          const netMins = grossMins - lunchDeduct - excessCoffeeMins;
          let workInside,
            rawOtMins,
            lateMins = 0;
          const defaultShiftMins = defaultHours * 60;
          const effectiveCapUnscheduled = Math.max(0, defaultShiftMins - minLunchMins);
          if (isScheduled && shiftStart && shiftEnd) {
            lateMins = t.timeIn && new Date(t.timeIn) > shiftStart ? diffMins(shiftStart.toISOString(), t.timeIn) : 0;
            const schedDur = diffMins(shiftStart.toISOString(), shiftEnd.toISOString());
            const insideRaw = Math.max(0, schedDur - lateMins - lunchDeduct - excessCoffeeMins);
            workInside = Math.min(insideRaw, netMins);
            rawOtMins = adjTimeOut && new Date(adjTimeOut) > shiftEnd ? diffMins(shiftEnd.toISOString(), adjTimeOut) : 0;
          } else {
            workInside = Math.min(netMins, effectiveCapUnscheduled);
            rawOtMins = Math.max(0, netMins - effectiveCapUnscheduled);
          }
          const approvedMins =
            latestOt && latestOt.status === "approved" && latestOt.requestedHours ? Number(latestOt.requestedHours) * 60 : 0;
          const usedOtMins = approvedMins > 0 ? Math.min(approvedMins, rawOtMins) : rawOtMins;
          let otStatus = "—";
          if (latestOt) otStatus = latestOt.status;
          else if (!isScheduled || rawOtMins > 0) otStatus = "No Approval";
          const periodMins = Math.max(0, workInside + approvedMins);
          const locList = locMap[t.userId] ?? [];
          const isLocRestricted = locList.length > 0;
          return {
            ...t,
            timeOut: adjTimeOut,
            isScheduled,
            scheduleList: matchedTemplates,
            duration: toHour(grossMins),
            coffeeMins: coffeeMinsStr,
            lunchMins: lunchMinsStr,
            otHours: toHour(usedOtMins),
            otStatus,
            lateHours: toHour(lateMins),
            periodHours: toHour(periodMins),
            locIn: fmtLoc(t.locIn),
            locOut: fmtLoc(t.locOut),
            overtimeRec: latestOt,
            fullDevIn: fmtDevice(t.deviceIn) || "—",
            fullDevOut: fmtDevice(t.deviceOut) || "—",
            shiftName,
            schedOut: shiftEndLocalStr,
            isLocRestricted,
            locList,
          };
        });
        setTotalPages(tlJ.meta?.totalPages || 1);
        setTotalRows(tlJ.meta?.total || enriched.length);
        setRowsLoaded((prev) => (append ? prev + enriched.length : enriched.length));
        setTimelogs((prev) => (append ? [...prev, ...enriched] : enriched));
      } catch (err) {
        toast.error(err.message);
      }
      setLoading(false);
    },
    [API_URL, token, filters, shiftTemplates, defaultHours, minLunchMins, locMap, perPage]
  );

  useEffect(() => {
    if (token) {
      bootstrap();
      fetchPendingRequests();
    }
  }, [token, bootstrap, fetchPendingRequests]);

  useEffect(() => {
    if (!token) return;
    setPage(1);
    setTimelogs([]);
    setRowsLoaded(0);
    fetchTimelogs({ pageParam: 1, append: false });
  }, [token, filters.departmentId, filters.from, filters.to, filters.status, shiftTemplates, defaultHours, minLunchMins, locMap]);

  const displayed = useMemo(() => {
    const getVal = (item, key) => {
      switch (key) {
        case "id":
          return item.id;
        case "schedule":
          return item.isScheduled ? 1 : 0;
        case "locationRestricted":
          return item.isLocRestricted ? 1 : 0;
        case "employee":
          return item.employeeName?.toLowerCase() || "";
        case "dateTimeIn":
          return item.timeIn ? new Date(item.timeIn).getTime() : 0;
        default:
          return "";
      }
    };
    let data = [...timelogs];
    if (!filters.employeeIds.includes("all")) data = data.filter((t) => filters.employeeIds.includes(t.userId));
    if (filters.search) {
      const q = filters.search.toLowerCase();
      data = data.filter((t) => t.employeeName?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const aVal = getVal(a, sortConfig.key);
      const bVal = getVal(b, sortConfig.key);
      if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
    return data;
  }, [timelogs, filters, sortConfig]);

  const totalPeriodHours = useMemo(
    () => displayed.reduce((sum, r) => sum + (parseFloat(r.periodHours || "0") || 0), 0).toFixed(2),
    [displayed]
  );

  const buildCSV = (rows) => {
    const visibleCols = columnOptions.filter((c) => columnVisibility.includes(c.value) && c.value !== "actions");
    const header = visibleCols.map((c) => wrap(c.label));
    const cell = (r, key) => {
      switch (key) {
        case "id":
          return r.id;
        case "schedule":
          return r.isScheduled ? "Yes" : "No";
        case "locationRestricted":
          return r.isLocRestricted ? "Yes" : "No";
        case "employee":
          return r.employeeName;
        case "dateTimeIn":
          return safeDateTime(r.timeIn);
        case "dateTimeOut":
          return safeDateTime(r.timeOut);
        case "duration":
          return r.duration;
        case "coffee":
          return r.coffeeMins;
        case "lunch":
          return r.lunchMins;
        case "ot":
          return r.otHours;
        case "otStatus":
          return r.otStatus;
        case "late":
          return r.lateHours;
        case "deviceIn":
          return r.fullDevIn;
        case "deviceOut":
          return r.fullDevOut;
        case "locationIn":
          return r.locIn.txt;
        case "locationOut":
          return r.locOut.txt;
        case "period":
          return r.periodHours;
        case "status":
          return r.status;
        default:
          return "";
      }
    };
    const body = rows.map((r) => visibleCols.map((c) => wrap(cell(r, c.value))));
    return [header, ...body].map((row) => row.join(",")).join("\r\n");
  };

  const exportCSV = async () => {
    if (!displayed.length) {
      toast.error("No data to export");
      return;
    }
    
    setExporting(true);
    
    try {
      const result = await exportEmployeePunchLogsCSV({
        data: displayed,
        visibleColumns: columnVisibility,
        columnMap: columnMapForExport,
        filters: filters,
        userTimezone: userTimezone,
        companyTimezone: companyTimezone,
      });
      
      if (result.success) {
        toast.success(`${result.filename}`);
      }
    } catch (error) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = async () => {
    if (!displayed.length) {
      toast.error("No data to export");
      return;
    }
    
    setPdfExporting(true);
    
    try {
      const result = await exportEmployeePunchLogsPDF({
        data: displayed,
        visibleColumns: columnVisibility,
        columnMap: columnMapForExport,
        filters: filters,
        userTimezone: userTimezone,
        companyTimezone: companyTimezone,
      });
      
      if (result.success) {
        toast.success(`${result.filename}`);
      }
    } catch (error) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setPdfExporting(false);
    }
  }; 

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([bootstrap(), fetchTimelogs({ pageParam: 1, append: false })]);
    toast.message("Data refreshed");
    setRefreshing(false);
  };

  const labelClass = "my-auto shrink-0 text-sm font-medium text-muted-foreground";
  const NUM2DAY = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const parseRRuleDays = (str) => {
    const m = str.match(/BYDAY=([^;]+)/i);
    return m ? m[1].split(",") : [];
  };
  const fmtUTCTime = (d) =>
    new Date(d).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  const fmtLatLng = (lat, lng) => `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;

  // Improved location display component
  const LocationDisplay = ({ location, type }) => {
    if (location.lat == null) {
      return <span className="text-muted-foreground text-xs">—</span>;
    }

    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              <MapPin className="w-3 h-3" />
              View
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div>Lat: {location.lat.toFixed(5)}</div>
              <div>Lng: {location.lng.toFixed(5)}</div>
              <div className="text-muted-foreground mt-1">Click to view on Google Maps</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Device display component with better tooltips
  const DeviceDisplay = ({ device, type }) => {
    if (!device || device === "—") {
      return <span className="text-muted-foreground text-xs">—</span>;
    }

    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs cursor-help border-b border-dotted border-muted-foreground">
              {truncate(device)}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="text-xs whitespace-pre-wrap">{device}</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const DualTimeDisplay = ({ datetime, userTz, companyTz }) => {
    if (!datetime) return <span className="text-muted-foreground text-xs">—</span>;
    
    const userTime = safeTime(datetime, userTz);
    const companyTime = safeTime(datetime, companyTz);
    const userDate = safeDate(datetime, userTz);
    const companyDate = safeDate(datetime, companyTz);
    
    const userTzName = getTimezoneName(userTz);
    const companyTzName = getTimezoneName(companyTz);
    
    // If same timezone, show once
    if (userTz === companyTz) {
      return (
        <div className="text-xs">
          <div className="font-mono font-semibold">{userDate}</div>
          <div className="font-mono">{userTime}</div>
        </div>
      );
    }
    
    // Show both timezones
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-xs cursor-help">
              <div className="font-mono font-semibold text-primary">
                {userDate} {userTime}
              </div>
              <div className="font-mono text-muted-foreground text-[10px]">
                ({companyDate} {companyTime})
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            <div className="space-y-1">
              <div><strong>Your time ({userTzName}):</strong> {userDate} {userTime}</div>
              <div><strong>Company HQ ({companyTzName}):</strong> {companyDate} {companyTime}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Enhanced Summary Statistics with Hover Definitions
  const SummaryStats = ({ data }) => {
    const stats = useMemo(() => {
      const active = data.filter(d => d.status === 'active').length;
      const completed = data.filter(d => d.status === 'completed').length;
      const scheduled = data.filter(d => d.isScheduled).length;
      const avgHours = data.length ? (data.reduce((sum, d) => sum + (parseFloat(d.periodHours) || 0), 0) / data.length).toFixed(1) : '0.0';
      
      return { active, completed, scheduled, avgHours };
    }, [data]);

    const getDefinition = (type) => {
      switch (type) {
        case 'active':
          return "Active Sessions: Number of employees currently clocked in and working. These sessions are ongoing and time is being tracked in real-time.";
        case 'completed':
          return "Completed Sessions: Number of finished work sessions where employees have clocked out. These are ready for payroll processing.";
        case 'scheduled':
          return "Scheduled Sessions: Work sessions that follow a predefined shift schedule. Hours are calculated against expected start/end times.";
        case 'avgHours':
          return "Average Period Hours: Mean number of productive work hours per session, excluding breaks and unapproved overtime.";
        default:
          return "";
      }
    };

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 cursor-help hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Timer className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-600">Active</div>
                  <div className="text-lg font-bold">{stats.active}</div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="text-sm">{getDefinition('active')}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 cursor-help hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors">
                <div className="p-2 rounded-full bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-green-600">Completed</div>
                  <div className="text-lg font-bold">{stats.completed}</div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="text-sm">{getDefinition('completed')}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 cursor-help hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors">
                <div className="p-2 rounded-full bg-orange-500/10">
                  <Calendar className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-orange-600">Scheduled</div>
                  <div className="text-lg font-bold">{stats.scheduled}</div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="text-sm">{getDefinition('scheduled')}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 cursor-help hover:bg-purple-100 dark:hover:bg-purple-950/30 transition-colors">
                <div className="p-2 rounded-full bg-purple-500/10">
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-purple-600">Avg Hours</div>
                  <div className="text-lg font-bold">{stats.avgHours}</div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="text-sm">{getDefinition('avgHours')}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  function ScheduleDialog({ open, onOpenChange, scheduleList }) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md border-2 dark:border-white/30">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              Schedule Details
            </DialogTitle>
          </DialogHeader>
          {scheduleList.length ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {scheduleList.map((s) => {
                  const startDate = s.startDate;
                  const endDate = s.endDate;
                  const days = parseRRuleDays(s.recurrencePattern || "");
                  const daysLabel = days
                    .map((d) => {
                      const n = parseInt(d, 10);
                      return isNaN(n) ? d.toUpperCase() : NUM2DAY[n] ?? "";
                    })
                    .join(", ");
                  let durationStr = "—";
                  if (s.shift?.startTime && s.shift?.endTime) {
                    let mins = diffMins(s.shift.startTime, s.shift.endTime);
                    if (mins < 0) mins += 1440;
                    durationStr = toHour(mins);
                  }
                  return (
                    <div key={s.id} className="p-3 border rounded-md bg-muted/50 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{s.shift?.shiftName || "—"}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div><span className="font-medium">Start:</span> {s.shift?.startTime ? fmtUTCTime(s.shift.startTime) : "—"}</div>
                        <div><span className="font-medium">End:</span> {s.shift?.endTime ? fmtUTCTime(s.shift.endTime) : "—"}</div>
                        <div><span className="font-medium">Duration:</span> {durationStr} hrs</div>
                        <div><span className="font-medium">Days:</span> {daysLabel || "—"}</div>
                      </div>
                      <div className="pt-2 border-t text-xs space-y-1">
                        <div>
                          <span className="font-medium">Schedule Period:</span>
                        </div>
                        <div>
                          {startDate ? new Date(startDate).toLocaleDateString() : "—"} 
                          {endDate ? ` → ${new Date(endDate).toLocaleDateString()}` : " → Ongoing"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mb-2 opacity-50" />
              <p>No schedule details available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  function LocationDialog({ open, onOpenChange, list }) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md border-2 dark:border-white/30">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-600" />
              Location Restrictions
            </DialogTitle>
          </DialogHeader>
          {list.length ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {list.map((loc) => (
                  <div key={loc.id} className="p-3 border rounded-md bg-muted/50 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{loc.name}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div><span className="font-medium">Latitude:</span> {Number(loc.latitude).toFixed(5)}</div>
                      <div><span className="font-medium">Longitude:</span> {Number(loc.longitude).toFixed(5)}</div>
                      <div><span className="font-medium">Radius:</span> {loc.radius}m</div>
                      <div><span className="font-medium">ID:</span> {loc.id}</div>
                    </div>
                    <div className="pt-2 border-t">
                      <a
                        href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" />
                        View on Google Maps
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MapPin className="h-8 w-8 mb-2 opacity-50" />
              <p>No location restrictions</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  const openEditDialog = (log) => {
    setEditLog(log);
    setEditTimeIn(toLocalInputValue(log.timeIn));
    setEditTimeOut(toLocalInputValue(log.timeOut));
    setEditDialogOpen(true);
  };

  const submitEdit = async () => {
    try {
      if (!editLog) return;
      const payload = {
        timeIn: editTimeIn ? new Date(editTimeIn).toISOString() : null,
        timeOut: editTimeOut ? new Date(editTimeOut).toISOString() : null,
      };
      const res = await fetch(`${API_URL}/api/timelogs/${editLog.id}/datetime`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Update failed");
      toast.success("Date/Time updated successfully");
      setEditDialogOpen(false);
      setEditLog(null);
      await fetchTimelogs({ pageParam: page, append: false });
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="max-w-full mx-auto p-4 lg:px-6 px-2 space-y-6">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-7 w-7 text-orange-500" />
            Employee Punch Logs
          </h2>
          <p className="text-muted-foreground mt-1">
            Track and manage employee time tracking and attendance
          </p>
        </div>
        <div className="flex gap-2">
          <IconBtn 
            icon={RefreshCw} 
            tooltip="Refresh data" 
            spinning={refreshing} 
            onClick={refreshAll} 
          />
          <IconBtn
            icon={Download}
            tooltip="Export CSV"
            spinning={exporting}
            onClick={exportCSV}
            disabled={exporting || !displayed.length}
          />
          <IconBtn
            icon={FileText}
            tooltip="Export PDF"
            spinning={pdfExporting}
            onClick={exportPDF}
            disabled={pdfExporting || !displayed.length}
          />
        </div>
      </div>

      {/* Summary Statistics */}
      <SummaryStats data={displayed} />

      {/* Filters Card */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
                <Filter className="h-4 w-4" />
              </div>
              Filters & Controls
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              Showing {rowsLoaded} of {totalRows} records
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Column Selector */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className={labelClass}>
              <Eye className="w-4 h-4 mr-1 inline" />
              Columns:
            </span>
            <ColumnSelector 
              options={columnOptions} 
              visible={columnVisibility} 
              setVisible={setColumnVisibility} 
            />
          </div>

          {/* Employee and Department Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className={labelClass}>
              <Users className="w-4 h-4 mr-1 inline" />
              Employee:
            </span>
            <MultiSelect
              options={employees.map((e) => {
                const firstName = e.profile?.firstName || '';
                const lastName = e.profile?.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim();
                const displayLabel = fullName || e.email.split('@')[0];
                
                return { value: e.id, label: displayLabel };
              })}
              selected={filters.employeeIds}
              onChange={(v) => toggleListFilter("employeeIds", v)}
              allLabel="All employees"
              width={220}
            />
            
            <span className={labelClass}>
              <Building className="w-4 h-4 mr-1 inline" />
              Department:
            </span>
            <div className="min-w-[180px]">
              <Select value={filters.departmentId} onValueChange={(v) => setFilters({ ...filters, departmentId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[140px]">
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className={labelClass}>
              <Calendar className="w-4 h-4 mr-1 inline" />
              Date Range:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From:</span>
              <Input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="h-9 w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">To:</span>
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="h-9 w-auto"
              />
            </div>
            {anyFilterActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Punch Log Requests Section */}
      {pendingRequests.length > 0 && (  
        <Card className="border-2 shadow-md overflow-hidden dark:border-white/10 border-orange-200">
          <div className="h-1 w-full bg-orange-500" />
          <CardHeader 
            className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setRequestsExpanded(!requestsExpanded)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
                  <AlarmClockPlus className="h-4 w-4" />
                </div>
                Punch Log Requests Pending Approval
                {pendingRequests.filter(r => r.status === "PENDING").length > 0 && (
                  <Badge className="ml-2 bg-red-500 hover:bg-red-600 text-white">
                    {pendingRequests.filter(r => r.status === "PENDING").length} Pending
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-3">
                {/* Status Filter */}
                <Select value={requestStatusFilter} onValueChange={setRequestStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending Only</SelectItem>
                    <SelectItem value="ALL">All Requests</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchPendingRequests();
                  }}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingRequests ? 'animate-spin' : ''}`} />
                </Button>
                
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {requestsExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <AnimatePresence>
            {requestsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pb-4">
                  {loadingRequests ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <RefreshCw className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">Loading requests...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingRequests
                        .filter(r => requestStatusFilter === "ALL" || r.status === requestStatusFilter)
                        .map((req) => {
                          const isApproving = approvingRequest === req.id;
                          const submittedDaysAgo = Math.floor((Date.now() - new Date(req.submittedAt)) / (1000 * 60 * 60 * 24));
                          const isUrgent = submittedDaysAgo >= 3 && req.status === "PENDING";
                          
                          return (
                            <motion.div
                              key={req.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-4 border-2 rounded-lg transition-all hover:shadow-md ${
                                req.status === 'PENDING' 
                                  ? 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900' 
                                  : req.status === 'APPROVED'
                                  ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900'
                                  : 'bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900'
                              }`}
                            >
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                {/* Employee & Request Info */}
                                <div className="flex-1 space-y-3">
                                  {/* Employee Header */}
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 rounded-full bg-orange-500/10">
                                        <User className="h-5 w-5 text-orange-600" />
                                      </div>
                                      <div>
                                        <div className="font-semibold text-base">{req.userDisplayName}</div>
                                        <div className="text-xs text-muted-foreground">
                                          Request ID: {req.id.slice(0, 8)}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Status Badge */}
                                    <div className="flex items-center gap-2">
                                      {isUrgent && (
                                        <Badge variant="destructive" className="animate-pulse">
                                          🔥 {submittedDaysAgo}d ago
                                        </Badge>
                                      )}
                                      <Badge className={
                                        req.status === 'PENDING' 
                                          ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400'
                                          : req.status === 'APPROVED'
                                          ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400'
                                          : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400'
                                      }>
                                        {req.status === 'PENDING' && '🟡 '}
                                        {req.status === 'APPROVED' && '✅ '}
                                        {req.status === 'REJECTED' && '❌ '}
                                        {req.status}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  {/* Request Details Grid */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div className="space-y-1">
                                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Date
                                      </div>
                                      <div className="font-medium">
                                        {new Date(req.requestedDate).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Time In
                                      </div>
                                      <div className="font-medium font-mono text-xs">
                                        {safeTime(req.requestedClockIn)}
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Time Out
                                      </div>
                                      <div className="font-medium font-mono text-xs">
                                        {safeTime(req.requestedClockOut)}
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Timer className="h-3 w-3" />
                                        Duration
                                      </div>
                                      <div className="font-semibold text-orange-600">
                                        {req.estimatedNetHours?.toFixed(2) || '0.00'}h
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Reason & Description */}
                                  <div className="space-y-2 pt-2 border-t">
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <span className="text-xs font-medium text-muted-foreground">Reason: </span>
                                        <span className="text-sm font-medium capitalize">
                                          {req.reason?.replace(/_/g, ' ') || 'Not specified'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {req.description && (
                                      <div className="flex items-start gap-2">
                                        <FileText className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-muted-foreground flex-1 line-clamp-2">
                                          {req.description}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Footer Info */}
                                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                                    <div className="flex items-center gap-4">
                                      <span>Submitted: {new Date(req.submittedAt).toLocaleDateString()}</span>
                                      <span>Approver: {req.approverDisplayName || 'Not assigned'}</span>
                                    </div>
                                    {req.status === 'APPROVED' && req.approvedAt && (
                                      <span className="text-green-600 dark:text-green-400 font-medium">
                                        ✓ Approved {new Date(req.approvedAt).toLocaleDateString()}
                                      </span>
                                    )}
                                    {req.status === 'REJECTED' && (
                                      <span className="text-red-600 dark:text-red-400 font-medium">
                                        ✗ Rejected
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Action Buttons */}
                                {req.status === 'PENDING' && (
                                  <div className="flex md:flex-col gap-2 md:min-w-[140px]">
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none"
                                            onClick={() => handleApproveRequest(req.id)}
                                            disabled={isApproving}
                                          >
                                            {isApproving ? (
                                              <>
                                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                                Approving...
                                              </>
                                            ) : (
                                              <>
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Approve
                                              </>
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Approve request and create time log entry
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            className="flex-1 md:flex-none"
                                            onClick={() => {
                                              setRejectingRequest(req);
                                              setRejectDialogOpen(true);
                                            }}
                                          >
                                            <XCircle className="h-3 w-3 mr-1" />
                                            Reject
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Reject this request with reason
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                )}
                              </div>
                              
                              {/* Rejection Reason Display */}
                              {req.status === 'REJECTED' && req.rejectionReason && (
                                <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded text-xs">
                                  <span className="font-medium text-red-800 dark:text-red-400">Rejection Reason: </span>
                                  <span className="text-red-700 dark:text-red-300">{req.rejectionReason}</span>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* Main Table Card */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
                <Clock className="h-4 w-4" />
              </div>
              Punch Logs
            </CardTitle>
            <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-4 text-sm text-muted-foreground">
              <span>Total Period Hours: <span className="font-semibold text-foreground">{totalPeriodHours}</span></span>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-xs cursor-help">
                      <Globe className="w-3 h-3" />
                      <span className="font-medium text-primary">{getTimezoneName(userTimezone)}</span>
                      <span className="text-muted-foreground">({getTimezoneName(companyTimezone)} HQ)</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    <div>Times shown in {userTimezone}</div>
                    <div className="text-muted-foreground">Company HQ: {companyTimezone}</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {columnOptions
                    .filter((c) => columnVisibility.includes(c.value))
                    .map(({ value, label }) => (
                      <TableHead key={value} className="text-center text-nowrap font-semibold">
                        {label}
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton rows={6} cols={columnVisibility.length} />
                ) : displayed.length ? (
                  <AnimatePresence>
                    {displayed.map((t, index) => {
                      // Helper function to render cell content based on column key
                      const renderCell = (colKey) => {
                        switch (colKey) {
                          case "id":
                            return (
                              <TableCell key="id" className="font-mono text-xs text-center">
                                <Badge variant="outline" className="font-mono">
                                  {t.id}
                                </Badge>
                              </TableCell>
                            );
                          
                          case "schedule":
                            return (
                              <TableCell key="schedule" className="text-center">
                                <ScheduleBadge
                                  isScheduled={t.isScheduled}
                                  onClick={() => {
                                    setScheduleList(t.scheduleList);
                                    setSchedDialogOpen(true);
                                  }}
                                />
                              </TableCell>
                            );
                          
                          case "locationRestricted":
                            return (
                              <TableCell key="locationRestricted" className="text-center">
                                <LocationBadge
                                  isRestricted={t.isLocRestricted}
                                  onClick={() => {
                                    setLocationDialogList(t.locList);
                                    setLocationDialogOpen(true);
                                  }}
                                />
                              </TableCell>
                            );
                          
                          case "employee":
                            return (
                              <TableCell key="employee" className="text-left text-sm font-medium">
                                <div className="max-w-[200px] truncate" title={t.employeeName}>
                                  {t.employeeName}
                                </div>
                              </TableCell>
                            );
                          
                          case "dateTimeIn":
                            return (
                              <TableCell key="dateTimeIn" className="text-center">
                                <DualTimeDisplay 
                                  datetime={t.timeIn} 
                                  userTz={userTimezone}
                                  companyTz={companyTimezone}
                                />
                              </TableCell>
                            );
                          
                          case "dateTimeOut":
                            return (
                              <TableCell key="dateTimeOut" className="text-center">
                                <DualTimeDisplay 
                                  datetime={t.timeOut} 
                                  userTz={userTimezone}
                                  companyTz={companyTimezone}
                                />
                              </TableCell>
                            );
                          
                          case "duration":
                            return (
                              <TableCell key="duration" className="text-center text-sm font-medium">
                                <TimeDisplayWithTooltip time={t.periodHours} type="duration" />
                              </TableCell>
                            );
                          
                          case "coffee":
                            return (
                              <TableCell key="coffee" className="text-center text-sm">
                                <div className="flex items-center justify-center gap-1">
                                  <Coffee className="w-3 h-3 text-amber-600" />
                                  <TimeDisplayWithTooltip time={t.coffeeMins} type="coffee" />
                                </div>
                              </TableCell>
                            );
                          
                          case "lunch":
                            return (
                              <TableCell key="lunch" className="text-center text-sm">
                                <TimeDisplayWithTooltip time={t.lunchMins} type="lunch" />
                              </TableCell>
                            );
                          
                          case "ot":
                            return (
                              <TableCell key="ot" className="text-center text-sm font-medium">
                                <TimeDisplayWithTooltip 
                                  time={parseFloat(t.otHours) > 0 ? t.otHours : null} 
                                  type="overtime" 
                                />
                              </TableCell>
                            );
                          
                          case "otStatus":
                            return (
                              <TableCell key="otStatus" className="text-center">
                                <OvertimeBadge
                                  otStatus={t.otStatus}
                                  overtimeRec={t.overtimeRec}
                                  onClick={() => {
                                    if (t.overtimeRec) {
                                      setOtViewData({ ot: t.overtimeRec, log: t });
                                      setOtDialogOpen(true);
                                    }
                                  }}
                                />
                              </TableCell>
                            );
                          
                          case "late":
                            return (
                              <TableCell key="late" className="text-center text-sm">
                                {parseFloat(t.lateHours) > 0 ? (
                                  <TimeDisplayWithTooltip 
                                    time={t.lateHours} 
                                    type="late" 
                                    className="text-red-600 font-medium"
                                  />
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            );
                          
                          case "deviceIn":
                            return (
                              <TableCell key="deviceIn" className="text-center">
                                <DeviceDisplay device={t.fullDevIn} type="in" />
                              </TableCell>
                            );
                          
                          case "deviceOut":
                            return (
                              <TableCell key="deviceOut" className="text-center">
                                <DeviceDisplay device={t.fullDevOut} type="out" />
                              </TableCell>
                            );
                          
                          case "locationIn":
                            return (
                              <TableCell key="locationIn" className="text-center">
                                <LocationDisplay location={t.locIn} type="in" />
                              </TableCell>
                            );
                          
                          case "locationOut":
                            return (
                              <TableCell key="locationOut" className="text-center">
                                <LocationDisplay location={t.locOut} type="out" />
                              </TableCell>
                            );
                          
                          case "period":
                            return (
                              <TableCell key="period" className="text-center text-sm font-semibold">
                                <TimeDisplayWithTooltip time={t.periodHours} type="period" />
                              </TableCell>
                            );
                          
                          case "status":
                            return (
                              <TableCell key="status" className="text-center">
                                <StatusBadge status={t.status} />
                              </TableCell>
                            );
                          
                          case "actions":
                            return (
                              <TableCell key="actions" className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {canEdit ? (
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditDialog(t)}
                                            className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
                                          >
                                            <Edit3 className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Edit Time In/Out</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </div>
                              </TableCell>
                            );
                          
                          default:
                            return null;
                        }
                      };

                      return (
                        <motion.tr
                          key={t.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          className={`border-b transition-all hover:bg-muted/50 ${
                            expandedRow === t.id ? 'bg-muted/30' : ''
                          }`}
                        >
                          {/* Render cells in the same order as columnOptions */}
                          {columnOptions
                            .filter((col) => columnVisibility.includes(col.value))
                            .map((col) => renderCell(col.value))}
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columnVisibility.length} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                          <Clock className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <h3 className="font-medium mb-2">No punch logs found</h3>
                        <p className="text-sm">No records match your current filter criteria.</p>
                        {anyFilterActive && (
                          <Button 
                            variant="link" 
                            onClick={clearAllFilters} 
                            className="text-orange-600 hover:text-orange-700 mt-2"
                          >
                            Clear all filters to see more data
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

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="border-t bg-muted/30 p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Page Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex gap-1"
                  disabled={page === 1}
                  onClick={() => {
                    setPage(1);
                    fetchTimelogs({ pageParam: 1, append: false });
                  }}
                >
                  <ChevronsLeft className="h-4 w-4" />
                  First
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => {
                    const prev = page - 1;
                    setPage(prev);
                    fetchTimelogs({ pageParam: prev, append: false });
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const p = i + 1;
                    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
                      return (
                        <Button
                          key={p}
                          size="sm"
                          variant={p === page ? "default" : "outline"}
                          className={p === page ? "bg-orange-500 hover:bg-orange-600" : ""}
                          onClick={() => {
                            setPage(p);
                            fetchTimelogs({ pageParam: p, append: false });
                          }}
                        >
                          {p}
                        </Button>
                      );
                    }
                    if ((p === page - 2 && p > 1) || (p === page + 2 && p < totalPages)) {
                      return (
                        <span key={p} className="px-1 text-muted-foreground text-sm">
                          …
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    fetchTimelogs({ pageParam: next, append: false });
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex gap-1"
                  disabled={page === totalPages}
                  onClick={() => {
                    setPage(totalPages);
                    fetchTimelogs({ pageParam: totalPages, append: false });
                  }}
                >
                  Last
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Load More Options */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Page {page} of {totalPages} • {rowsLoaded} of {totalRows} records
                </span>
                {page < totalPages && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const next = page + 1;
                      await fetchTimelogs({ pageParam: next, append: true });
                      setPage(next);
                    }}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  >
                    Load More
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <ScheduleDialog 
        open={schedDialogOpen} 
        onOpenChange={setSchedDialogOpen} 
        scheduleList={scheduleList} 
      />

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md border-2 dark:border-white/10">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Reject Punch Log Request
            </DialogTitle>
          </DialogHeader>
          {rejectingRequest && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                <div><span className="font-medium">Employee:</span> {rejectingRequest.userDisplayName}</div>
                <div><span className="font-medium">Date:</span> {safeDate(rejectingRequest.requestedDate)}</div>
                <div><span className="font-medium">Time:</span> {safeTime(rejectingRequest.requestedClockIn)} - {safeTime(rejectingRequest.requestedClockOut)}</div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for Rejection *</label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a clear reason for rejecting this request..."
                  className="min-h-[100px] resize-none"
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {rejectionReason.length}/500 characters
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectingRequest(null);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectRequest}
              disabled={!rejectionReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={otDialogOpen} onOpenChange={setOtDialogOpen}>
        <DialogContent className="sm:max-w-md border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-orange-500" />
              Overtime Request Details
            </DialogTitle>
          </DialogHeader>
          {otViewData ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div><span className="font-medium">Request ID:</span> {otViewData.ot.id}</div>
                    <div><span className="font-medium">Status:</span> 
                      <Badge variant="outline" className="ml-2 capitalize">
                        {otViewData.ot.status}
                      </Badge>
                    </div>
                    <div><span className="font-medium">OT Hours:</span> {otViewData.log.otHours}</div>
                  </div>
                  <div className="space-y-2">
                    <div><span className="font-medium">Time In:</span> {safeTime(otViewData.log.timeIn)}</div>
                    <div><span className="font-medium">Time Out:</span> {safeTime(otViewData.log.timeOut)}</div>
                    <div><span className="font-medium">Requested:</span> {safeDate(otViewData.ot.createdAt)}</div>
                  </div>
                </div>
                
                {otViewData.ot.requesterReason && (
                  <div>
                    <span className="font-medium text-sm">Requester Reason:</span>
                    <p className="text-sm bg-muted p-2 rounded mt-1">{otViewData.ot.requesterReason}</p>
                  </div>
                )}
                
                {otViewData.ot.approverComments && (
                  <div>
                    <span className="font-medium text-sm">Approver Comments:</span>
                    <p className="text-sm bg-muted p-2 rounded mt-1">{otViewData.ot.approverComments}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Info className="h-8 w-8 mb-2 opacity-50" />
              <p>No overtime data available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <LocationDialog 
        open={locationDialogOpen} 
        onOpenChange={setLocationDialogOpen} 
        list={locationDialogList} 
      />

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-orange-500" />
              Edit Time In / Time Out
            </DialogTitle>
          </DialogHeader>
          {editLog && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Time In</label>
                <Input
                  type="datetime-local"
                  value={editTimeIn}
                  onChange={(e) => setEditTimeIn(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Time Out</label>
                <Input
                  type="datetime-local"
                  value={editTimeOut}
                  onChange={(e) => setEditTimeOut(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <div className="font-medium mb-1">Employee: {editLog.employeeName}</div>
                <div className="text-muted-foreground">Log ID: {editLog.id}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitEdit} className="bg-orange-500 hover:bg-orange-600">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}