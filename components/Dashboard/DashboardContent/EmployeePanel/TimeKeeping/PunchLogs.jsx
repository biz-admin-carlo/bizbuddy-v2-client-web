/* components/Dashboard/DashboardContent/TimeKeeping/PunchLogs.jsx */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Clock,
  Calendar,
  Download,
  Filter,
  Badge,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Send,
  FileText,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  AlertTriangle,
  User,
  AlertCircle,
  CheckCircle2,
  Activity,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  AlarmClockPlus,
  Car,
  UserCheck,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import useAuthStore from "@/store/useAuthStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import TableSkeleton from "@/components/common/TableSkeleton";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import FormDialog from "@/components/common/FormDialog";
import OrangeLoadingSpinner from "@/components/common/Spinner";
import { exportPunchLogsCSV, exportPunchLogsPDF } from "@/lib/exportUtils";

// ── Constants ──────────────────────────────────────────────────────────────────
const DAYCARE_COMPANY_IDS = (process.env.NEXT_PUBLIC_DAYCARE_COMPANY_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const DRIVER_AIDE_AM_HOURS = 1.25;
const DRIVER_AIDE_PM_HOURS = 1.25;

// ── Utility helpers ────────────────────────────────────────────────────────────
const MAX_DEV_CHARS = 15;
const truncate = (s = "", L = MAX_DEV_CHARS) => (s.length > L ? s.slice(0, L) + "…" : s);
export const safeDate = (d) =>
  d
    ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" })
    : "—";
export const safeTime     = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");
export const safeDateTime = (d) => (d ? `${safeDate(d)} ${safeTime(d)}` : "—");
const toHour    = (m) => (m / 60).toFixed(2);
const diffMins  = (a, b) => (new Date(b) - new Date(a)) / 60000;
const rawDuration = (tin, tout) => (!tin || !tout ? "—" : toHour(diffMins(tin, tout)));

// ── NULL-SAFE break helpers ────────────────────────────────────────────────────
export const coffeeMinutes = (arr) => {
  const safe = Array.isArray(arr) ? arr : [];
  return toHour(safe.reduce((m, b) => (b.start && b.end ? m + diffMins(b.start, b.end) : m), 0));
};
export const lunchMinutesStr = (l) => (!l || !l.start || !l.end ? "0.00" : toHour(diffMins(l.start, l.end)));
export const lunchMinutesNum = (l) => (!l || !l.start || !l.end ? 0 : diffMins(l.start, l.end));

const deepParse = (v) => {
  if (typeof v === "string" && /^\s*[{[]/.test(v)) {
    try { return deepParse(JSON.parse(v)); } catch { return v; }
  }
  if (Array.isArray(v)) return v.map(deepParse);
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = deepParse(val);
    return o;
  }
  return v;
};

const findProp = (obj, names, depth = 0) => {
  if (obj == null || depth > 8) return null;
  if (Array.isArray(obj)) {
    for (const el of obj) { const r = findProp(el, names, depth + 1); if (r != null) return r; }
    return null;
  }
  if (typeof obj === "object") {
    for (const n of names) if (obj[n] != null) return obj[n];
    for (const v of Object.values(obj)) { const r = findProp(v, names, depth + 1); if (r != null) return r; }
  }
  return null;
};

const DEV_IN_KEYS  = ["deviceIn",  "deviceInfoStart", "deviceStart",  "deviceInfoIn"];
const DEV_OUT_KEYS = ["deviceOut", "deviceInfoEnd",   "deviceEnd",    "deviceInfoOut"];
const LOC_IN_KEYS  = ["locIn",  "locationIn",  "locationStart", "locStart"];
const LOC_OUT_KEYS = ["locOut", "locationOut", "locationEnd",   "locEnd"];
const firstField = (log, keys) => keys.map((k) => log[k]).find(Boolean);
const chooseStartEnd = (log, dir, base) => (dir === "in" ? log?.[base]?.start : log?.[base]?.end);

const getDevice = (log, dir) => {
  let obj = firstField(log, dir === "in" ? DEV_IN_KEYS : DEV_OUT_KEYS);
  if (!obj) obj = chooseStartEnd(log, dir, "deviceInfo");
  if (!obj) return "—";
  obj = deepParse(obj);
  if (typeof obj === "string") return obj;
  const brand = findProp(obj, ["manufacturer", "brand"]);
  const name  = findProp(obj, ["deviceName",   "model"]);
  return [brand, name].filter(Boolean).join(", ") || JSON.stringify(obj);
};

const getLocation = (log, dir) => {
  let obj = firstField(log, dir === "in" ? LOC_IN_KEYS : LOC_OUT_KEYS);
  if (!obj) obj = chooseStartEnd(log, dir, "location");
  if (!obj) return { txt: "—", lat: null, lng: null };
  obj = deepParse(obj);
  if (typeof obj === "string") {
    const [latS, lngS] = obj.split(/[, ]+/);
    const lat = +latS, lng = +lngS;
    return isFinite(lat) && isFinite(lng)
      ? { txt: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng }
      : { txt: obj, lat: null, lng: null };
  }
  const lat = findProp(obj, ["latitude",  "lat"]);
  const lng = findProp(obj, ["longitude", "lng"]);
  return lat != null && lng != null
    ? { txt: `${(+lat).toFixed(5)}, ${(+lng).toFixed(5)}`, lat: +lat, lng: +lng }
    : { txt: "—", lat: null, lng: null };
};

const NUM2DAY = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const parseRRuleDays = (str) => { const m = str.match(/BYDAY=([^;]+)/i); return m ? m[1].split(",") : []; };
const fmtUTCTime = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

// ── FIX 1: PunchTypeBadge — supports all 4 punch types ────────────────────────
function PunchTypeBadge({ punchType, size = "sm" }) {
  if (!punchType) return null;

  const config = {
    DRIVER_AIDE:    { label: "Driver/Aide", icon: Car,       color: "blue"   },
    DRIVER_AIDE_AM: { label: "Driver AM",   icon: Car,       color: "blue"   },
    DRIVER_AIDE_PM: { label: "Driver PM",   icon: Car,       color: "blue"   },
    REGULAR:        { label: "Regular",     icon: UserCheck, color: "purple" },
  };

  const meta = config[punchType] ?? config.REGULAR;
  const Icon = meta.icon;
  const isBlue = meta.color === "blue";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
      size === "sm" ? "text-xs" : "text-sm"
    } ${
      isBlue
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
        : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
    }`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

// ── CutoffApprovalBadge ────────────────────────────────────────────────────────
const CutoffApprovalBadge = ({ cutoffApproval }) => {
  if (!cutoffApproval) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs text-muted-foreground border-dashed cursor-default">
              <Clock className="w-3 h-3 mr-1 opacity-50" />
              Not in cutoff
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="text-sm">This log has not been included in any payroll cutoff period yet.</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const { status, cutoffPeriod } = cutoffApproval;

  const config = {
    approved: {
      icon: <CheckCircle className="w-3 h-3 mr-1" />,
      label: "Approved",
      cls: "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      tip: "This log has been approved for payroll.",
    },
    pending: {
      icon: <AlertCircle className="w-3 h-3 mr-1" />,
      label: "Pending Review",
      cls: "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      tip: "Awaiting admin review in the cutoff period.",
    },
    rejected: {
      icon: <XCircle className="w-3 h-3 mr-1" />,
      label: "Rejected",
      cls: "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      tip: "This log was rejected during cutoff review. Contact your supervisor.",
    },
  };

  const meta = config[status] ?? config.pending;
  const periodLabel = cutoffPeriod
    ? `Cutoff: ${new Date(cutoffPeriod.periodStart).toLocaleDateString()} – ${new Date(cutoffPeriod.periodEnd).toLocaleDateString()}`
    : null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`text-xs cursor-default ${meta.cls}`}>
            {meta.icon}
            {meta.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="text-sm">{meta.tip}</div>
          {periodLabel && <div className="text-xs text-muted-foreground mt-1 pt-1 border-t">{periodLabel}</div>}
          {cutoffPeriod && <div className="text-xs text-muted-foreground">Period status: {cutoffPeriod.status}</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PunchLogs() {
  const { token, user } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [companyId, setCompanyId] = useState(user?.companyId ?? null);
  const isDayCare = DAYCARE_COMPANY_IDS.includes(companyId);

  const [logs,       setLogs]       = useState([]);
  const [smartLogs,  setSmartLogs]  = useState([]);
  const [viewMode,   setViewMode]   = useState("all");
  const [defaultHours,  setDefaultHours]  = useState(8);
  const [minLunchMins,  setMinLunchMins]  = useState(60);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [delOpen,    setDelOpen]    = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expandedRow,   setExpandedRow]   = useState(null);

  const [otDialogOpen,  setOtDialogOpen]  = useState(false);
  const [otForLog,      setOtForLog]      = useState(null);
  const [otApprover,    setOtApprover]    = useState("");
  const [otReason,      setOtReason]      = useState("");
  const [otHoursEdit,   setOtHoursEdit]   = useState("");
  const [otSubmitting,  setOtSubmitting]  = useState(false);

  const [contestDialogOpen,         setContestDialogOpen]         = useState(false);
  const [contestLogId,              setContestLogId]              = useState("");
  const [contestApproverId,         setContestApproverId]         = useState("");
  const [contestReason,             setContestReason]             = useState("");
  const [contestDescription,        setContestDescription]        = useState("");
  const [contestRequestedClockIn,   setContestRequestedClockIn]   = useState("");
  const [contestRequestedClockOut,  setContestRequestedClockOut]  = useState("");
  const [contestSubmitting,         setContestSubmitting]         = useState(false);
  const [contestErrors,             setContestErrors]             = useState({});

  const [approvers,       setApprovers]       = useState([]);
  const [schedDialogOpen, setSchedDialogOpen] = useState(false);
  const [schedForDialog,  setSchedForDialog]  = useState([]);
  const [locDialogOpen,   setLocDialogOpen]   = useState(false);
  const [locDialogList,   setLocDialogList]   = useState([]);
  const [isStandaloneOT,  setIsStandaloneOT]  = useState(false);
  const [supervisors,     setSupervisors]     = useState([]);
  const [myRequests,      setMyRequests]      = useState([]);
  const [requestsExpanded,setRequestsExpanded]= useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const defaultRowsPerPage = 10;
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [locList,     setLocList]     = useState([]);
  const [userShifts,  setUserShifts]  = useState([]);

  const [requestPunchLogsDialog, setRequestPunchLogsDialog] = useState(false);
  const [requestPunchDate,       setRequestPunchDate]       = useState("");
  const [requestClockIn,         setRequestClockIn]         = useState("");
  const [requestClockOut,        setRequestClockOut]        = useState("");
  const [requestApproverId,      setRequestApproverId]      = useState("");
  const [requestReason,          setRequestReason]          = useState("");
  const [requestDescription,     setRequestDescription]     = useState("");
  const [requestSubmitting,      setRequestSubmitting]      = useState(false);
  const [requestErrors,          setRequestErrors]          = useState({});

  const columnOptions = useMemo(() => [
    { value: "date",      label: "Date"       },
    { value: "timeIn",    label: "Clock In"   },
    { value: "timeOut",   label: "Clock Out"  },
    { value: "duration",  label: "Duration"   },
    { value: "ot",        label: "OT"         },
    { value: "punchType",     label: "Punch Type"    },
    { value: "cutoffApproval",label: "Cutoff Status" },
    { value: "status",        label: "Status"        },
  ], []);

  const [columnVisibility, setColumnVisibility] = useState(() =>
    isDayCare
      ? columnOptions.map((c) => c.value)
      : columnOptions.map((c) => c.value).filter((v) => v !== "punchType")
  );

  useEffect(() => {
    setColumnVisibility((prev) => {
      if (isDayCare && !prev.includes("punchType")) return [...prev, "punchType"];
      return prev;
    });
  }, [isDayCare]);

  const [filters, setFilters] = useState({
    ids: ["all"],
    schedule: "all",
    status: "all",
    punchType: "all",
    from: "",
    to: "",
  });

  const isValidTimeFormat    = (t) => /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.test(t);
  const convertTimeToDecimal = (t) => {
    if (!isValidTimeFormat(t)) return 0;
    const [h, m] = t.split(":").map(Number);
    return h + m / 60;
  };

  const toggleListFilter = (key, val) =>
    setFilters((prev) => {
      if (val === "all") return { ...prev, [key]: ["all"] };
      let list = prev[key].filter((x) => x !== "all");
      list = list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
      if (list.length === 0) list = ["all"];
      return { ...prev, [key]: list };
    });

  const handleFilterChange = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const [sortConfig, setSortConfig] = useState({ key: "timeRange", direction: "descending" });
  const requestSort = (k) =>
    setSortConfig((p) => ({
      key: k,
      direction: p.key === k && p.direction === "ascending" ? "descending" : "ascending",
    }));

  // ── Fetch helpers ────────────────────────────────────────────────────────────
  const fetchCompanySettings = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/company-settings/`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      if (r.ok) {
        setDefaultHours(j.data?.defaultShiftHours ?? 8);
        const raw = j.data?.minimumLunchMinutes;
        setMinLunchMins(raw === null ? 0 : raw ?? 60);
        if (j.data?.id) setCompanyId(j.data.id);
      }
    } catch { setDefaultHours(8); setMinLunchMins(60); }
  }, [API_URL, token]);

  const fetchSmartDetectsOT = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      toast.message("Loading smart overtime logs...");
      const res = await fetch(`${API_URL}/api/overtime/smart-detect`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (res.ok && Array.isArray(j.data)) {
        const transformed = j.data.map((d) => ({
          id: d.timeLogId,
          timeIn: d.actualStart,
          timeOut: d.actualEnd,
          duration: (d.elapsedMins / 60).toFixed(2),
          otHours: d.overtimeHours.toString(),
          otStatus: "Detected",
          status: false,
          coffeeMins: "0.00",
          lunchMins:  "0.00",
          _lunchNum: 0,
          coffeeBreaks: [],
          lunchBreak: null,
          overtime: [],
          punchType: "REGULAR",
          _smartDetection: {
            type: d.type,
            scheduledStart: d.scheduledStart,
            scheduledEnd: d.scheduledEnd,
            detectedAt: d.detectedAt,
            employeeName: d.employeeName,
            department: d.department,
          },
        }));
        setSmartLogs(transformed);
        toast.success(transformed.length ? `${transformed.length} OT log(s) detected!` : "No potential overtime detected.");
      } else {
        toast.error(j.message || "Failed to detect overtime");
      }
    } catch {
      toast.error("Failed to run smart overtime detection");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  const fetchMyRequests = useCallback(async () => {
    if (!token) return;
    setLoadingRequests(true);
    try {
      const res = await fetch(`${API_URL}/api/request-punch-log/my-requests?limit=10&status=PENDING`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (res.ok) {
        const requests = j.data?.requests || [];
        setMyRequests(requests);
        setRequestsExpanded(requests.some((r) => r.status === "PENDING"));
      }
    } catch {}
    finally { setLoadingRequests(false); }
  }, [token, API_URL]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/timelogs/user`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Fetch failed");
      setLogs(
        (j.data || []).map((raw) => {
          const t = deepParse(raw);
          return {
            ...t,
            coffeeMins: coffeeMinutes(t.coffeeBreaks),
            lunchMins:  lunchMinutesStr(t.lunchBreak),
            _lunchNum:  lunchMinutesNum(t.lunchBreak),
          };
        })
      );
    } catch (err) { toast.message(err.message); }
    setLoading(false);
  };

  const fetchApprovers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/leaves/approvers`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (res.ok) setApprovers((j.data || []).filter((u) => ["admin", "superadmin"].includes((u.role || "").toLowerCase())));
    } catch (err) { toast.message(err.message); }
  }, [token, API_URL]);

  const fetchLocations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/location/assigned`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (res.ok && Array.isArray(j.data)) setLocList(j.data);
    } catch {}
  }, [token, API_URL]);

  const fetchUserShifts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/usershifts/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (res.ok && Array.isArray(j.data)) setUserShifts(j.data);
    } catch {}
  }, [token, API_URL]);

  const fetchSupervisors = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/account/approver`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (res.ok) {
        setSupervisors((j.data || []).map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          department: s.jobTitle || s.role,
          role: s.role,
        })));
      } else { setSupervisors([]); }
    } catch { setSupervisors([]); }
  }, [token, API_URL]);

  useEffect(() => {
    if (!token) return;
    fetchCompanySettings();
    fetchLogs();
    fetchApprovers();
    fetchLocations();
    fetchSupervisors();
    fetchMyRequests();
    fetchUserShifts();
  }, [token, fetchApprovers, fetchCompanySettings, fetchLocations]);

  // ── FIX 2: logsWithSchedule — correct AM/PM/full-day hours formulas ──────────
  const logsWithSchedule = useMemo(() => {
    const defaultShiftMins = defaultHours * 60;
    const unschedCap = Math.max(0, defaultShiftMins - minLunchMins);
    const sourceData = viewMode === "smart" ? smartLogs : logs;

    return sourceData.map((log) => {
      const coffeeArr        = Array.isArray(log.coffeeBreaks) ? log.coffeeBreaks : [];
      const coffeeMinsTotal  = coffeeArr.reduce((m, b) => (b.start && b.end ? m + diffMins(b.start, b.end) : m), 0);
      const excessCoffeeMins = Math.max(0, coffeeMinsTotal - 30);
      const grossMins        = log.timeIn && log.timeOut ? diffMins(log.timeIn, log.timeOut) : 0;
      const lunchMinsVal     = minLunchMins
        ? Math.max(log._lunchNum || 0, minLunchMins)
        : (log._lunchNum || 0);
      const netMins          = Math.max(0, grossMins - lunchMinsVal - excessCoffeeMins);
      const inside           = Math.min(netMins, unschedCap);
      const rawOtMins        = Math.max(0, netMins - unschedCap);

      const fullDevIn  = getDevice(log, "in");
      const fullDevOut = getDevice(log, "out");

      // ── Punch type flags ───────────────────────────────────────────────────
      const punchType = log.punchType ?? "REGULAR";
      const isDA      = punchType === "DRIVER_AIDE";    // full day: AM + Regular + PM
      const isDA_AM   = punchType === "DRIVER_AIDE_AM"; // covered AM slot only
      const isDA_PM   = punchType === "DRIVER_AIDE_PM"; // covered PM slot only
      const isAnyDA   = isDA || isDA_AM || isDA_PM;     // any driver-aide variant

      // Approved/pending OT from overtime relation
      const overtimeArr      = Array.isArray(log.overtime) ? log.overtime : [];
      const approvedOTHours  = overtimeArr
        .filter((ot) => ot.status === "approved")
        .reduce((sum, ot) => sum + (parseFloat(ot.requestedHours) || 0), 0);
      const hasPendingOT = overtimeArr.some((ot) => ot.status === "pending");

      let driverAideAMHours  = null;
      let driverAidePMHours  = null;
      let regularHoursForLog = null;
      let totalHours         = null;

      if (isDA) {
        // Full driver day: AM (fixed) + Regular (derived) + PM (fixed + OT)
        driverAideAMHours  = DRIVER_AIDE_AM_HOURS;
        driverAidePMHours  = DRIVER_AIDE_PM_HOURS + approvedOTHours;
        regularHoursForLog = Math.max(0, netMins / 60 - DRIVER_AIDE_AM_HOURS - DRIVER_AIDE_PM_HOURS);
        totalHours         = +(driverAideAMHours + regularHoursForLog + driverAidePMHours).toFixed(2);
      } else if (isDA_AM) {
        // Clocked in early — covered AM slot before regular shift. No PM segment.
        driverAideAMHours  = DRIVER_AIDE_AM_HOURS;
        driverAidePMHours  = 0;
        regularHoursForLog = Math.max(0, netMins / 60 - DRIVER_AIDE_AM_HOURS);
        totalHours         = +(driverAideAMHours + regularHoursForLog).toFixed(2);
      } else if (isDA_PM) {
        // Clocked out late — covered PM slot after regular shift. No AM segment.
        driverAideAMHours  = 0;
        driverAidePMHours  = DRIVER_AIDE_PM_HOURS + approvedOTHours;
        regularHoursForLog = Math.max(0, netMins / 60 - DRIVER_AIDE_PM_HOURS);
        totalHours         = +(regularHoursForLog + driverAidePMHours).toFixed(2);
      }

      // OT hours display
      const otHours = isAnyDA
        ? approvedOTHours.toFixed(2)
        : (log.otHours || (rawOtMins === 0 ? "0.00" : toHour(rawOtMins)));

      // OT status display
      let otStatus;
      if (isAnyDA) {
        if (approvedOTHours > 0) otStatus = `Approved ${approvedOTHours.toFixed(2)}h`;
        else if (hasPendingOT)   otStatus = "Pending";
        else                     otStatus = "No Approval";
      } else {
        otStatus = log.otStatus || (rawOtMins > 0 ? "No Approval" : "—");
      }

      return {
        ...log,
        punchType,
        isDA,
        isDA_AM,
        isDA_PM,
        isAnyDA,
        isScheduled: false,
        isLocRestricted: locList.length > 0,
        locList,
        scheduleList: (() => {
          const logDate = log.timeIn ? log.timeIn.slice(0, 10) : null;
          if (!logDate) return [];
          return userShifts.filter((s) => {
            const shiftDate = s.assignedDate
              ? new Date(s.assignedDate).toISOString().slice(0, 10)
              : null;
            return shiftDate === logDate;
          });
        })(),
        lateHours: "0.00",
        duration: isAnyDA
          ? (totalHours !== null ? String(totalHours) : rawDuration(log.timeIn, log.timeOut))
          : (log.duration || rawDuration(log.timeIn, log.timeOut)),
        otHours,
        otStatus,
        periodHours: toHour(inside),
        driverAideAMHours,
        driverAidePMHours,
        regularHoursForLog,
        approvedOTHours,
        hasPendingOT,
        fullDevIn,
        fullDevOut,
        // cutoffApproval comes directly from the API response — null if not in any cutoff yet
        cutoffApproval: log.cutoffApproval ?? null,
      };
    });
  }, [logs, smartLogs, viewMode, defaultHours, minLunchMins, locList, userShifts]);

  // ── FIX 3: getSortableValue — punchType sort covers all 4 values ──────────────
  const getSortableValue = (l, k) => {
    switch (k) {
      case "date":
      case "timeIn":    return new Date(l.timeIn).getTime();
      case "timeOut":   return new Date(l.timeOut).getTime();
      case "duration":  return parseFloat(l.duration) || 0;
      case "ot":        return parseFloat(l.otHours)  || 0;
      case "punchType": return l.isAnyDA ? 1 : 0;
      case "status":    return l.status ? 1 : 0;
      default:          return 0;
    }
  };

  const filteredSorted = useMemo(() => {
    let data = [...logsWithSchedule];
    if (!filters.ids.includes("all"))   data = data.filter((l) => filters.ids.includes(l.id));
    if (filters.schedule !== "all")     data = data.filter((l) => (filters.schedule === "scheduled" ? l.isScheduled : !l.isScheduled));
    if (filters.status   !== "all")     data = data.filter((l) => (filters.status   === "active"    ? l.status     : !l.status));
    if (isDayCare && filters.punchType !== "all") data = data.filter((l) => l.punchType === filters.punchType);
    if (filters.from) data = data.filter((l) => l.timeIn.slice(0, 10) >= filters.from);
    if (filters.to)   data = data.filter((l) => l.timeIn.slice(0, 10) <= filters.to);
    data.sort((a, b) => {
      const aVal = getSortableValue(a, sortConfig.key);
      const bVal = getSortableValue(b, sortConfig.key);
      if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "ascending" ? 1  : -1;
      return 0;
    });
    return data;
  }, [logsWithSchedule, filters, sortConfig, isDayCare]);

  const stats = useMemo(() => {
    const total      = filteredSorted.length;
    const active     = filteredSorted.filter((l) => l.status).length;
    const completed  = filteredSorted.filter((l) => !l.status).length;
    const totalHours = filteredSorted.reduce((s, l) => s + (parseFloat(l.duration) || 0), 0);
    return { total, active, completed, totalHours: totalHours.toFixed(2) };
  }, [filteredSorted]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(filteredSorted.length / rowsPerPage));
    setTotalPages(tp);
    if (page > tp) setPage(tp);
  }, [filteredSorted, rowsPerPage, page]);

  const displayed = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredSorted.slice(start, start + rowsPerPage);
  }, [filteredSorted, page, rowsPerPage]);

  const deleteLog = async () => {
    if (!selected) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/timelogs/delete/${selected.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Delete failed");
      setLogs((l) => l.filter((x) => x.id !== selected.id));
      toast.message("Deleted");
      setDelOpen(false);
    } catch (err) { toast.message(err.message); }
    setDeleteLoading(false);
  };

  const submitContestPolicy = async () => {
    const errors = {};
    if (!contestLogId)              errors.logId       = "Please select a punch log";
    if (!contestApproverId)         errors.approverId  = "Please select an approver";
    if (!contestReason.trim())      errors.reason      = "Please provide a reason";
    if (!contestDescription.trim()) errors.description = "Please provide a description";
    if (!contestRequestedClockIn)   errors.clockIn     = "Please provide the correct clock-in time";
    if (!contestRequestedClockOut)  errors.clockOut    = "Please provide the correct clock-out time";
    setContestErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const selectedLog = filteredSorted.find((l) => l.id === contestLogId);
    setContestSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/contest-policy/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          timeLogId: contestLogId,
          approverId: contestApproverId,
          reason: contestReason,
          description: contestDescription,
          currentClockIn: selectedLog?.timeIn,
          currentClockOut: selectedLog?.timeOut,
          requestedClockIn: contestRequestedClockIn,
          requestedClockOut: contestRequestedClockOut,
          submittedAt: new Date().toISOString(),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Contest submission failed");
      toast.message("Contest request submitted successfully");
      setContestDialogOpen(false);
      setContestLogId(""); setContestApproverId(""); setContestReason("");
      setContestDescription(""); setContestRequestedClockIn(""); setContestRequestedClockOut("");
      setContestErrors({});
    } catch (e) { toast.message(e.message); }
    setContestSubmitting(false);
  };

  const refresh = () => {
    setRefreshing(true);
    const promises = [fetchLogs(), fetchCompanySettings(), fetchLocations()];
    if (viewMode === "smart") promises.push(fetchSmartDetectsOT());
    Promise.all(promises).finally(() => setRefreshing(false));
  };

  const exportCSV = async () => {
    if (!filteredSorted.length) { toast.error("No rows to export"); return; }
    setExporting(true);
    try {
      const result = await exportPunchLogsCSV({ data: filteredSorted });
      if (result.success) toast.success(result.filename);
    } catch (e) { toast.error(`Export failed: ${e.message}`); }
    finally { setExporting(false); }
  };

  const exportPDF = async () => {
    if (!filteredSorted.length) { toast.error("No rows to export"); return; }
    setExporting(true);
    try {
      const result = await exportPunchLogsPDF({ data: filteredSorted });
      if (result.success) toast.success(result.filename);
    } catch (e) { toast.error(`Export failed: ${e.message}`); }
    finally { setExporting(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-full mx-auto p-4 lg:px-10 px-2 space-y-6">
        <Toaster position="top-center" />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Clock className="h-7 w-7 text-orange-500" />
              Punch Logs
            </h2>
            <p className="text-sm text-muted-foreground mt-1">View and manage your time tracking records</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" asChild>
              <Link href="/dashboard/employee/punch">Punch</Link>
            </Button>

            <div className="flex gap-1 border rounded-md p-1">
              <Button size="sm" variant={viewMode === "all"   ? "default" : "ghost"} onClick={() => setViewMode("all")}   className="h-8">All Logs</Button>
              <Button size="sm" variant={viewMode === "smart" ? "default" : "ghost"} onClick={() => { setViewMode("smart"); if (!smartLogs.length) fetchSmartDetectsOT(); }} className="h-8">Smart OT</Button>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => filteredSorted.length ? setContestDialogOpen(true) : toast.message("No logs available")}>
                  <AlertTriangle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Contest Times</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setRequestPunchLogsDialog(true)}>
                  <AlarmClockPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Request Punch Logs</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={refresh} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={exportCSV} disabled={exporting}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export CSV</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={exportPDF}>
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export PDF</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 dark:border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Logs</p>
                  <p className="text-3xl font-bold mt-2">{stats.total}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 dark:border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-3xl font-bold mt-2 text-green-600 dark:text-green-400">{stats.active}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 dark:border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold mt-2 text-orange-600 dark:text-orange-400">{stats.completed}</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 dark:border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                  <p className="text-3xl font-bold mt-2">{stats.totalHours}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
          <div className="h-1 w-full bg-orange-500" />
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-orange-500" />
                Table Controls
              </CardTitle>
              <span className="text-sm text-muted-foreground">{displayed.length} of {filteredSorted.length}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-sm font-medium text-muted-foreground">Filter:</span>
              <Select value={filters.status} onValueChange={(v) => handleFilterChange("status", v)}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="All status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              {/* FIX 4: DayCare punch type filter — all 4 values ── */}
              {isDayCare && (
                <Select value={filters.punchType} onValueChange={(v) => handleFilterChange("punchType", v)}>
                  <SelectTrigger className="w-[170px]"><SelectValue placeholder="All types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="REGULAR">Regular</SelectItem>
                    <SelectItem value="DRIVER_AIDE">Driver / Aide</SelectItem>
                    <SelectItem value="DRIVER_AIDE_AM">Driver AM</SelectItem>
                    <SelectItem value="DRIVER_AIDE_PM">Driver PM</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Input type="date" value={filters.from} onChange={(e) => handleFilterChange("from", e.target.value)} className="w-[160px]" />
              <Input type="date" value={filters.to}   onChange={(e) => handleFilterChange("to",   e.target.value)} className="w-[160px]" />
            </div>
          </CardContent>
        </Card>

        {/* My Requests */}
        {myRequests.length > 0 && (
          <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
            <div className="h-1 w-full bg-orange-500" />
            <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setRequestsExpanded(!requestsExpanded)}>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlarmClockPlus className="h-5 w-5 text-orange-500" />
                  My Punch Log Requests
                  {myRequests.filter((r) => r.status === "PENDING").length > 0 && (
                    <span className="ml-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {myRequests.filter((r) => r.status === "PENDING").length} Pending
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{myRequests.length} total</span>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {requestsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <AnimatePresence>
              {requestsExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <CardContent className="pb-4">
                    {loadingRequests ? (
                      <div className="flex items-center justify-center py-8">
                        <OrangeLoadingSpinner />
                        <span className="ml-2 text-muted-foreground">Loading requests...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {myRequests.map((req) => (
                          <div key={req.id} className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Calendar className="h-4 w-4 text-orange-500" />
                                  <span className="font-semibold">{new Date(req.requestedDate).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{safeTime(req.requestedClockIn)} - {safeTime(req.requestedClockOut)}</span>
                                  <span className="font-medium">({req.estimatedNetHours?.toFixed(2) || "0.00"}h)</span>
                                </div>
                              </div>
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                req.status === "PENDING"  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                req.status === "APPROVED" ? "bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-400"  :
                                                            "bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-400"
                              }`}>
                                {req.status === "PENDING" ? "🟡 " : req.status === "APPROVED" ? "✅ " : "❌ "}{req.status}
                              </span>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                                <div><span className="font-medium">Reason: </span><span className="text-muted-foreground capitalize">{req.reason?.replace(/_/g, " ") || "Not specified"}</span></div>
                              </div>
                              {req.description && (
                                <div className="flex items-start gap-2">
                                  <FileText className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-muted-foreground text-xs line-clamp-2">{req.description}</p>
                                </div>
                              )}
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  Approver: {req.approver?.profile ? `${req.approver.profile.firstName} ${req.approver.profile.lastName}` : req.approver?.email || "Not assigned"}
                                </span>
                                <span className="text-xs text-muted-foreground ml-auto">Submitted {new Date(req.submittedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )}

        {/* Main table */}
        <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
          <div className="h-1 w-full bg-orange-500" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Punch Logs
              {isDayCare && (
                <span className="ml-2 text-xs font-normal text-muted-foreground flex items-center gap-1">
                  <Car className="h-3 w-3 text-blue-500" /> Driver/Aide hours: 1.25 AM + Regular + 1.25 PM
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    {columnOptions
                      .filter((c) => columnVisibility.includes(c.value))
                      .map(({ value, label }) => (
                        <TableHead key={value} className="cursor-pointer" onClick={() => requestSort(value)}>
                          <div className="flex items-center gap-1">
                            {label}
                            {sortConfig.key === value && (
                              sortConfig.direction === "ascending"
                                ? <ChevronUp className="h-4 w-4" />
                                : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                      ))}
                    <TableHead className="text-center w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableSkeleton rows={6} cols={columnVisibility.length + 2} />
                  ) : displayed.length ? (
                    <AnimatePresence>
                      {displayed.map((log) => (
                        <TimelogRow
                          key={log.id}
                          log={log}
                          columnVisibility={columnVisibility}
                          isDayCare={isDayCare}
                          expanded={expandedRow === log.id}
                          onToggleExpand={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                          onSchedule={(list) => { setSchedForDialog(list); setSchedDialogOpen(true); }}
                          onRequestOT={(l) => {
                            setIsStandaloneOT(false);
                            setOtForLog(l);
                            setOtApprover(""); setOtHoursEdit(""); setOtReason("");
                            setOtDialogOpen(true);
                          }}
                          onDelete={(l) => { setSelected(l); setDelOpen(true); }}
                          onLocation={(list) => { setLocDialogList(list); setLocDialogOpen(true); }}
                        />
                      ))}
                    </AnimatePresence>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columnVisibility.length + 2} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="h-8 w-8 text-orange-500/50" />
                          </div>
                          <p className="font-medium">No logs match the selected filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          {filteredSorted.length > defaultRowsPerPage && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(1)}>
                  <ChevronsLeft className="h-4 w-4" /> First
                </Button>
                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1;
                  if (p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    return <Button key={p} size="sm" variant={p === page ? "default" : "outline"} onClick={() => setPage(p)}>{p}</Button>;
                  if ((p === page - 2 && p > 1) || (p === page + 2 && p < totalPages))
                    return <span key={p} className="px-1 text-muted-foreground">…</span>;
                  return null;
                })}
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
                  Last <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {rowsPerPage < filteredSorted.length && (
                  <Button size="sm" onClick={() => setRowsPerPage(Math.min(rowsPerPage + defaultRowsPerPage, filteredSorted.length))}>Load more</Button>
                )}
                {rowsPerPage < filteredSorted.length && (
                  <Button size="sm" variant="outline" onClick={() => { setRowsPerPage(filteredSorted.length); setPage(1); }}>Show all</Button>
                )}
                {rowsPerPage > defaultRowsPerPage && (
                  <Button size="sm" variant="outline" onClick={() => { setRowsPerPage(defaultRowsPerPage); setPage(1); }}>Show less</Button>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* ── Dialogs ── */}
        <ConfirmDeleteDialog
          open={delOpen} setOpen={setDelOpen}
          title="Delete Punch Log"
          description={selected ? `Remove timelog ${selected.id} – ${safeDate(selected.timeIn)}?` : ""}
          loading={deleteLoading}
          onConfirm={deleteLog}
        >
          {selected && (
            <div className="space-y-1 text-sm">
              <p><strong>Date:</strong> {safeDate(selected.timeIn)}</p>
              <p><strong>Time In:</strong> {safeTime(selected.timeIn)}</p>
              <p><strong>Time Out:</strong> {safeTime(selected.timeOut)}</p>
            </div>
          )}
        </ConfirmDeleteDialog>

        {/* OT Dialog */}
        <FormDialog
          open={otDialogOpen}
          setOpen={(open) => { setOtDialogOpen(open); if (!open) { setIsStandaloneOT(false); setOtForLog(null); setOtHoursEdit(""); setOtApprover(""); setOtReason(""); } }}
          icon={Send}
          title="Request Overtime Approval"
          subtitle={otForLog ? `For ${safeDate(otForLog.timeIn)} — ${otForLog.isAnyDA ? "Driver/Aide PM segment" : "Overtime hours"}` : "Select a punch log"}
          loading={otSubmitting}
          primaryLabel="Submit Request"
          loadingLabel={<><span className="ml-2">Submitting...</span></>}
          onSubmit={async () => {
            try {
              setOtSubmitting(true);
              const decimalHours = convertTimeToDecimal(otHoursEdit);
              if (decimalHours <= 0) { toast.error("Please enter valid overtime hours"); setOtSubmitting(false); return; }
              const res = await fetch(`${API_URL}/api/overtime/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ timeLogId: otForLog.id, approverId: otApprover, requestedHours: decimalHours, requesterReason: otReason || null }),
              });
              const result = await res.json();
              if (res.ok) {
                toast.success("Overtime request submitted!");
                setOtDialogOpen(false); setOtForLog(null); setOtHoursEdit(""); setOtApprover(""); setOtReason(""); setIsStandaloneOT(false);
                fetchLogs();
              } else {
                if (result.message?.includes("already exists")) { toast.error("Already submitted an OT request for this log"); setOtDialogOpen(false); }
                else toast.error(result.message || "Failed to submit OT request");
              }
            } catch { toast.error("Failed to submit OT request. Please try again."); }
            finally { setOtSubmitting(false); }
          }}
          primaryDisabled={!otForLog || !otApprover || !otHoursEdit || !isValidTimeFormat(otHoursEdit)}
        >
          <div className="space-y-6 text-sm">
            {/* Driver/Aide PM context — shown for any DA variant */}
            {otForLog?.isAnyDA && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-start gap-3">
                <Car className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-700 dark:text-blue-300 text-xs">
                    {otForLog.isDA_PM ? "Driver / Aide PM — Overtime" :
                     otForLog.isDA_AM ? "Driver / Aide AM — Overtime" :
                     "Driver / Aide — PM Overtime"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">OT hours requested here will be added on top of the base 1.25h PM segment.</p>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <label className="block font-medium">OT Hours <span className="text-orange-500">*</span></label>
              <Input
                type="text"
                value={otHoursEdit}
                onChange={(e) => { const v = e.target.value.replace(/[^\d:]/g, ""); const p = v.split(":"); if (p.length <= 2 && p[0].length <= 2 && (p[1] || "").length <= 2) setOtHoursEdit(v); }}
                placeholder="HH:MM (e.g., 02:30)"
                className={`w-full max-w-xs ${otHoursEdit && !isValidTimeFormat(otHoursEdit) ? "border-red-500" : ""}`}
                maxLength={5}
              />
              {otHoursEdit && !isValidTimeFormat(otHoursEdit) && <p className="text-xs text-red-500">Please enter valid time format (HH:MM)</p>}
            </div>
            <div className="space-y-2">
              <label className="font-medium">Approver</label>
              <Select value={otApprover} onValueChange={setOtApprover} disabled={!otForLog}>
                <SelectTrigger><SelectValue placeholder="Choose approver" /></SelectTrigger>
                <SelectContent>
                  {supervisors.length > 0 ? (
                    <>{<div className="px-2 py-1 text-xs font-medium text-muted-foreground">Team Supervisors</div>}{supervisors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} - {s.department}</SelectItem>)}</>
                  ) : (
                    <>{<div className="px-2 py-1 text-xs font-medium text-muted-foreground">Approvers</div>}{approvers.map((a) => <SelectItem key={a.id} value={a.id}>{a.name || a.email}</SelectItem>)}</>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="font-medium">Reason (optional)</label>
              <Textarea value={otReason} onChange={(e) => setOtReason(e.target.value)} placeholder="Brief reason for overtime request..." className="min-h-[80px]" disabled={!otForLog} />
            </div>
          </div>
        </FormDialog>

        {/* Request Punch Log Dialog */}
        <Dialog open={requestPunchLogsDialog} onOpenChange={setRequestPunchLogsDialog}>
          <DialogContent className="sm:max-w-lg border-2 dark:border-white/30 max-h-[90vh] overflow-y-auto">
            <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlarmClockPlus className="h-5 w-5 text-orange-600" />
                Request Punch Log Entry
              </DialogTitle>
              <p className="text-sm text-muted-foreground">Submit a request to create a punch log for a day when you were unable to clock in/out.</p>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Calendar className="h-4 w-4 text-orange-500" />Date <span className="text-orange-500">*</span></label>
                <Input type="date" value={requestPunchDate} max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    const d = e.target.value;
                    setRequestPunchDate(d);
                    setRequestErrors((p) => ({ ...p, date: undefined }));
                    const existing = logs.find((l) => l.timeIn?.slice(0, 10) === d);
                    if (existing) setRequestErrors((p) => ({ ...p, date: "A punch log already exists for this date" }));
                    if (d && defaultHours) { setRequestClockIn(`${d}T09:00`); setRequestClockOut(`${d}T${String(9 + defaultHours).padStart(2, "0")}:00`); }
                  }}
                  className={requestErrors.date ? "border-red-500" : ""}
                />
                {requestErrors.date && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" />{requestErrors.date}</p>}
              </div>

              {requestPunchDate && !requestErrors.date && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-1"><Clock className="h-4 w-4 text-green-500" />Clock In <span className="text-orange-500">*</span></label>
                      <Input type="datetime-local" value={requestClockIn} onChange={(e) => { setRequestClockIn(e.target.value); setRequestErrors((p) => ({ ...p, clockIn: undefined })); }} className={requestErrors.clockIn ? "border-red-500" : ""} />
                      {requestErrors.clockIn && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" />{requestErrors.clockIn}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-1"><Clock className="h-4 w-4 text-red-500" />Clock Out <span className="text-orange-500">*</span></label>
                      <Input type="datetime-local" value={requestClockOut} onChange={(e) => { setRequestClockOut(e.target.value); setRequestErrors((p) => ({ ...p, clockOut: undefined })); }} className={requestErrors.clockOut ? "border-red-500" : ""} />
                      {requestErrors.clockOut && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" />{requestErrors.clockOut}</p>}
                    </div>
                  </div>

                  {requestClockIn && requestClockOut && !requestErrors.clockIn && !requestErrors.clockOut && (
                    <div className="p-3 bg-muted rounded-md border text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Net Work Hours:</span>
                        <span className="font-bold text-orange-600">{toHour(Math.max(0, diffMins(requestClockIn, requestClockOut) - minLunchMins))}h</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4 text-orange-500" />Approver <span className="text-orange-500">*</span></label>
                    <Select value={requestApproverId} onValueChange={(v) => { setRequestApproverId(v); setRequestErrors((p) => ({ ...p, approverId: undefined })); }}>
                      <SelectTrigger className={requestErrors.approverId ? "border-red-500" : ""}><SelectValue placeholder="Select approver" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {(supervisors.length > 0 ? supervisors : approvers).map((a) => (
                          <SelectItem key={a.id} value={a.id}><div className="flex items-center gap-2"><User className="h-3 w-3" /><span>{a.name || a.email}</span></div></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {requestErrors.approverId && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" />{requestErrors.approverId}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" />Reason <span className="text-orange-500">*</span></label>
                    <Select value={requestReason} onValueChange={(v) => { setRequestReason(v); setRequestErrors((p) => ({ ...p, reason: undefined })); }}>
                      <SelectTrigger className={requestErrors.reason ? "border-red-500" : ""}><SelectValue placeholder="Select reason" /></SelectTrigger>
                      <SelectContent>
                        {["forgot_to_clock", "system_malfunction", "network_issues", "emergency", "remote_work", "power_outage", "meeting_offsite", "other"].map((v) => (
                          <SelectItem key={v} value={v}>{v.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {requestErrors.reason && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" />{requestErrors.reason}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-orange-500" />Detailed Explanation <span className="text-orange-500">*</span></label>
                    <Textarea value={requestDescription} onChange={(e) => { setRequestDescription(e.target.value); setRequestErrors((p) => ({ ...p, description: undefined })); }} placeholder="Please explain why you need this entry..." className={`min-h-[100px] resize-none ${requestErrors.description ? "border-red-500" : ""}`} maxLength={500} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{requestDescription.length}/500</span>
                      {requestErrors.description && <span className="text-red-500">{requestErrors.description}</span>}
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => { setRequestPunchLogsDialog(false); setRequestPunchDate(""); setRequestClockIn(""); setRequestClockOut(""); setRequestApproverId(""); setRequestReason(""); setRequestDescription(""); setRequestErrors({}); }} disabled={requestSubmitting}>Cancel</Button>
              <Button
                onClick={async () => {
                  const errors = {};
                  if (!requestPunchDate) errors.date = "Please select a date";
                  if (!requestClockIn)   errors.clockIn = "Please provide clock-in time";
                  if (!requestClockOut)  errors.clockOut = "Please provide clock-out time";
                  if (requestClockIn && requestClockOut && requestClockIn >= requestClockOut) errors.clockIn = "Clock in must be before clock out";
                  if (!requestApproverId)        errors.approverId = "Please select an approver";
                  if (!requestReason)            errors.reason = "Please select a reason";
                  if (!requestDescription.trim()) errors.description = "Please provide a detailed explanation";
                  else if (requestDescription.trim().length < 20) errors.description = "Please provide more detail (at least 20 chars)";
                  setRequestErrors(errors);
                  if (Object.keys(errors).length > 0) { toast.error("Please fill in all required fields"); return; }
                  setRequestSubmitting(true);
                  try {
                    const res = await fetch(`${API_URL}/api/request-punch-log/submit`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ requestedDate: requestPunchDate, requestedClockIn, requestedClockOut, approverId: requestApproverId, reason: requestReason, description: requestDescription, estimatedDuration: diffMins(requestClockIn, requestClockOut), estimatedNetHours: parseFloat(toHour(Math.max(0, diffMins(requestClockIn, requestClockOut) - minLunchMins))) }),
                    });
                    const result = await res.json();
                    if (res.ok) {
                      toast.success("Punch log request submitted!");
                      setRequestPunchLogsDialog(false);
                      setRequestPunchDate(""); setRequestClockIn(""); setRequestClockOut(""); setRequestApproverId(""); setRequestReason(""); setRequestDescription(""); setRequestErrors({});
                      fetchMyRequests();
                    } else { toast.error(result.message || "Failed to submit"); }
                  } catch { toast.error("Failed to submit. Please try again."); }
                  finally { setRequestSubmitting(false); }
                }}
                disabled={requestSubmitting || !requestPunchDate || !!requestErrors.date}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {requestSubmitting ? <><OrangeLoadingSpinner /><span className="ml-2">Submitting...</span></> : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Contest Dialog */}
        <Dialog open={contestDialogOpen} onOpenChange={setContestDialogOpen}>
          <DialogContent className="sm:max-w-lg border-2 dark:border-white/30">
            <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Contest Clock In/Out Times
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-orange-500" />Select Punch Log <span className="text-orange-500">*</span></label>
                <Select value={contestLogId} onValueChange={(v) => {
                  setContestLogId(v);
                  setContestErrors((e) => ({ ...e, logId: undefined }));
                  const l = filteredSorted.find((x) => x.id === v);
                  if (l) { setContestRequestedClockIn(l.timeIn?.slice(0, 16) || ""); setContestRequestedClockOut(l.timeOut?.slice(0, 16) || ""); }
                }}>
                  <SelectTrigger className={contestErrors.logId ? "border-red-500" : ""}><SelectValue placeholder="Select a punch log to contest" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {filteredSorted.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>
                        <div className="flex items-center gap-2">
                          {l.isAnyDA && <Car className="h-3 w-3 text-blue-500" />}
                          {l.id} — {safeDate(l.timeIn)} ({safeTime(l.timeIn)} to {safeTime(l.timeOut)})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {contestErrors.logId && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" />{contestErrors.logId}</p>}
              </div>

              {contestLogId && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Correct Clock In <span className="text-orange-500">*</span></label>
                      <Input type="datetime-local" value={contestRequestedClockIn} onChange={(e) => { setContestRequestedClockIn(e.target.value); setContestErrors((e) => ({ ...e, clockIn: undefined })); }} className={contestErrors.clockIn ? "border-red-500" : ""} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Correct Clock Out <span className="text-orange-500">*</span></label>
                      <Input type="datetime-local" value={contestRequestedClockOut} onChange={(e) => { setContestRequestedClockOut(e.target.value); setContestErrors((e) => ({ ...e, clockOut: undefined })); }} className={contestErrors.clockOut ? "border-red-500" : ""} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4 text-orange-500" />Approver <span className="text-orange-500">*</span></label>
                    <Select value={contestApproverId} onValueChange={(v) => { setContestApproverId(v); setContestErrors((e) => ({ ...e, approverId: undefined })); }}>
                      <SelectTrigger className={contestErrors.approverId ? "border-red-500" : ""}><SelectValue placeholder="Select approver" /></SelectTrigger>
                      <SelectContent className="max-h-60">{approvers.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name || a.email}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reason <span className="text-orange-500">*</span></label>
                    <Select value={contestReason} onValueChange={(v) => { setContestReason(v); setContestErrors((e) => ({ ...e, reason: undefined })); }}>
                      <SelectTrigger className={contestErrors.reason ? "border-red-500" : ""}><SelectValue placeholder="Select reason" /></SelectTrigger>
                      <SelectContent>
                        {["system_clock_error","device_malfunction","network_delay","incorrect_time_zone","manual_entry_error","emergency_situation","other"].map((v) => (
                          <SelectItem key={v} value={v}>{v.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Detailed Explanation <span className="text-orange-500">*</span></label>
                    <Textarea value={contestDescription} onChange={(e) => { setContestDescription(e.target.value); setContestErrors((e) => ({ ...e, description: undefined })); }} placeholder="Please explain why the recorded times are incorrect..." className={`min-h-[100px] resize-none ${contestErrors.description ? "border-red-500" : ""}`} maxLength={500} />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>{contestDescription.length}/500</span></div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setContestDialogOpen(false); setContestLogId(""); setContestApproverId(""); setContestReason(""); setContestDescription(""); setContestRequestedClockIn(""); setContestRequestedClockOut(""); setContestErrors({}); }}>Cancel</Button>
              <Button onClick={submitContestPolicy} disabled={contestSubmitting || !contestLogId} className="bg-orange-500 hover:bg-orange-600 text-white">
                {contestSubmitting ? "Submitting..." : "Submit Contest"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ScheduleDialog open={schedDialogOpen} onOpenChange={setSchedDialogOpen} scheduleList={schedForDialog} />
        <LocationDialog open={locDialogOpen}  onOpenChange={setLocDialogOpen}  list={locDialogList} />
      </div>
    </TooltipProvider>
  );
}

// ── TimelogRow ─────────────────────────────────────────────────────────────────
function TimelogRow({ log, columnVisibility, isDayCare, expanded, onToggleExpand, onSchedule, onRequestOT, onDelete, onLocation }) {
  const locIn  = getLocation(log, "in");
  const locOut = getLocation(log, "out");

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className="border-b hover:bg-muted/50 cursor-pointer group"
        onClick={onToggleExpand}
      >
        <TableCell className="w-12">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </Button>
        </TableCell>

        {columnVisibility.includes("date") && (
          <TableCell className="font-medium">
            <div className="flex flex-col">
              <span className="text-sm">{safeDate(log.timeIn)}</span>
              <span className="text-xs text-muted-foreground font-mono">ID: {log.id}</span>
            </div>
          </TableCell>
        )}
        {columnVisibility.includes("timeIn")   && <TableCell className="text-sm font-medium">{safeTime(log.timeIn)}</TableCell>}
        {columnVisibility.includes("timeOut")  && <TableCell className="text-sm font-medium">{safeTime(log.timeOut)}</TableCell>}
        {columnVisibility.includes("duration") && <TableCell className="text-sm font-medium">{log.duration}h</TableCell>}

        {columnVisibility.includes("ot") && (
          <TableCell>
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">{log.otHours}h</div>
              {log.otStatus === "No Approval" ? (
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); onRequestOT(log); }}>
                  Request
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">{log.otStatus}</span>
              )}
            </div>
          </TableCell>
        )}

        {columnVisibility.includes("punchType") && (
          <TableCell>
            {isDayCare ? <PunchTypeBadge punchType={log.punchType} /> : null}
          </TableCell>
        )}

        {columnVisibility.includes("cutoffApproval") && (
          <TableCell className="text-center">
            <CutoffApprovalBadge cutoffApproval={log.cutoffApproval} />
          </TableCell>
        )}

        {columnVisibility.includes("status") && (
          <TableCell>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              log.status
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100  text-gray-800  dark:bg-gray-900/30  dark:text-gray-400"
            }`}>
              {log.status ? "Active" : "Completed"}
            </span>
          </TableCell>
        )}

        <TableCell className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSchedule(log.scheduleList); }}>
                <Calendar className="h-4 w-4 mr-2" /> View Schedule
              </DropdownMenuItem>
              {log.isLocRestricted && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onLocation(log.locList); }}>
                  <MapPin className="h-4 w-4 mr-2" /> View Location
                </DropdownMenuItem>
              )}
              {!log.status && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(log); }} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </motion.tr>

      {/* Expanded row */}
      {expanded && (
        <motion.tr
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="bg-muted/30"
        >
          <TableCell colSpan={columnVisibility.length + 2} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Break Times / Hours Breakdown */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  {log.isAnyDA ? "Hours Breakdown" : "Break Times"}
                </h4>

                {log.isAnyDA ? (
                  /* ── Driver/Aide breakdown — adapts to AM/PM/full variants ── */
                  <div className="space-y-2 text-sm">
                    {/* AM row — only for DRIVER_AIDE and DRIVER_AIDE_AM */}
                    {(log.isDA || log.isDA_AM) && (
                      <div className="flex justify-between items-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                        <span className="text-blue-700 dark:text-blue-300 flex items-center gap-1"><Car className="h-3 w-3" /> Driver/Aide AM</span>
                        <span className="font-bold text-blue-700 dark:text-blue-300">{log.driverAideAMHours?.toFixed(2)}h</span>
                      </div>
                    )}
                    {/* Regular row — always shown */}
                    <div className="flex justify-between items-center p-2 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                      <span className="text-purple-700 dark:text-purple-300 flex items-center gap-1"><UserCheck className="h-3 w-3" /> Regular Hours</span>
                      <span className="font-bold text-purple-700 dark:text-purple-300">{log.regularHoursForLog?.toFixed(2)}h</span>
                    </div>
                    {/* PM row — only for DRIVER_AIDE and DRIVER_AIDE_PM */}
                    {(log.isDA || log.isDA_PM) && (
                      <div className="flex justify-between items-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                        <span className="text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <Car className="h-3 w-3" /> Driver/Aide PM
                          {log.approvedOTHours > 0 && <span className="ml-1 text-xs text-green-600 dark:text-green-400">(+{log.approvedOTHours.toFixed(2)}h OT)</span>}
                        </span>
                        <span className="font-bold text-blue-700 dark:text-blue-300">{log.driverAidePMHours?.toFixed(2)}h</span>
                      </div>
                    )}
                    {/* Total */}
                    <div className="flex justify-between items-center p-2 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 font-bold">
                      <span className="text-orange-700 dark:text-orange-300">Total Clock Hours</span>
                      <span className="text-orange-700 dark:text-orange-300">{log.duration}h</span>
                    </div>
                    <div className="pt-1 border-t space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Coffee Break:</span>
                        <span>{log.coffeeMins}h</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Lunch Break:</span>
                        <span>{log.lunchMins}h</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── Regular breakdown ── */
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Coffee Break:</span><span className="font-medium">{log.coffeeMins}h</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Lunch Break:</span><span className="font-medium">{log.lunchMins}h</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Late Hours:</span><span className="font-medium">{log.lateHours}h</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Period Hours:</span><span className="font-medium">{log.periodHours}h</span></div>
                  </div>
                )}
              </div>

              {/* Device & Location */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-500" />
                  Device &amp; Location
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Device In:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded block">{log.fullDevIn}</code>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Device Out:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded block">{log.fullDevOut}</code>
                  </div>
                  {locIn.lat && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Location In:</span>
                      <a href={`https://www.google.com/maps?q=${locIn.lat},${locIn.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-500 hover:underline">{locIn.txt}</a>
                    </div>
                  )}
                  {locOut.lat && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Location Out:</span>
                      <a href={`https://www.google.com/maps?q=${locOut.lat},${locOut.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-500 hover:underline">{locOut.txt}</a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </motion.tr>
      )}
    </>
  );
}

// ── ScheduleDialog ─────────────────────────────────────────────────────────────
// Colour + label config keyed on shift name keywords
const SHIFT_STYLE = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("am") || n.includes("driver") && n.includes("am"))
    return { bg: "bg-blue-50 dark:bg-blue-950", border: "border-blue-300 dark:border-blue-700", dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-300", label: "Driver / Aide AM" };
  if (n.includes("pm") || n.includes("driver") && n.includes("pm"))
    return { bg: "bg-indigo-50 dark:bg-indigo-950", border: "border-indigo-300 dark:border-indigo-700", dot: "bg-indigo-500", text: "text-indigo-700 dark:text-indigo-300", label: "Driver / Aide PM" };
  if (n.includes("driver") || n.includes("aide"))
    return { bg: "bg-blue-50 dark:bg-blue-950", border: "border-blue-300 dark:border-blue-700", dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-300", label: "Driver / Aide" };
  // Default — regular shift
  return { bg: "bg-orange-50 dark:bg-orange-950", border: "border-orange-300 dark:border-orange-700", dot: "bg-orange-500", text: "text-orange-700 dark:text-orange-300", label: "Regular Shift" };
};

function ScheduleDialog({ open, onOpenChange, scheduleList }) {
  // Sort shifts chronologically by startTime UTC hours
  const sorted = [...scheduleList].sort((a, b) => {
    const aH = a.shift?.startTime ? new Date(a.shift.startTime).getUTCHours() * 60 + new Date(a.shift.startTime).getUTCMinutes() : 0;
    const bH = b.shift?.startTime ? new Date(b.shift.startTime).getUTCHours() * 60 + new Date(b.shift.startTime).getUTCMinutes() : 0;
    return aH - bH;
  });

  // Compute total day span for the progress bar
  const allMins = sorted.map((s) => {
    const start = s.shift?.startTime ? new Date(s.shift.startTime).getUTCHours() * 60 + new Date(s.shift.startTime).getUTCMinutes() : 0;
    const end   = s.shift?.endTime   ? new Date(s.shift.endTime).getUTCHours()   * 60 + new Date(s.shift.endTime).getUTCMinutes()   : 0;
    return { start, end };
  });
  const dayStart = allMins.length ? Math.min(...allMins.map((m) => m.start)) : 0;
  const dayEnd   = allMins.length ? Math.max(...allMins.map((m) => m.end))   : 0;
  const daySpan  = dayEnd - dayStart || 1;

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

        {sorted.length ? (
          <ScrollArea className="max-h-[65vh]">
            <div className="px-1 pb-2 space-y-5">

              {/* ── Visual timeline bar ── */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{fmtUTCTime(sorted[0].shift?.startTime)}</span>
                  <span>{fmtUTCTime(sorted[sorted.length - 1].shift?.endTime)}</span>
                </div>
                <div className="relative h-5 rounded-full bg-muted overflow-hidden flex">
                  {allMins.map((m, i) => {
                    const style = SHIFT_STYLE(sorted[i].shift?.shiftName);
                    const left  = ((m.start - dayStart) / daySpan) * 100;
                    const width = ((m.end - m.start) / daySpan) * 100;
                    return (
                      <div
                        key={sorted[i].id}
                        className={`absolute h-full ${style.dot} opacity-80`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Total: {toHour(dayEnd - dayStart)}h
                </p>
              </div>

              {/* ── Shift cards with connector lines ── */}
              <div className="relative">
                {/* vertical connector */}
                {sorted.length > 1 && (
                  <div className="absolute left-[18px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-muted-foreground/20 to-muted-foreground/20 z-0" />
                )}

                <div className="space-y-3 relative z-10">
                  {sorted.map((s, i) => {
                    const style    = SHIFT_STYLE(s.shift?.shiftName);
                    const startStr = s.shift?.startTime ? fmtUTCTime(s.shift.startTime) : "—";
                    const endStr   = s.shift?.endTime   ? fmtUTCTime(s.shift.endTime)   : "—";
                    let durMins    = 0;
                    if (s.shift?.startTime && s.shift?.endTime) {
                      durMins = diffMins(s.shift.startTime, s.shift.endTime);
                      if (durMins < 0) durMins += 1440;
                    }
                    const durStr = durMins ? `${toHour(durMins)}h` : "—";

                    return (
                      <div key={s.id} className="flex items-start gap-3">
                        {/* Timeline dot */}
                        <div className={`mt-3.5 h-4 w-4 rounded-full border-2 border-white dark:border-neutral-900 shadow-sm flex-shrink-0 ${style.dot}`} />

                        {/* Card */}
                        <div className={`flex-1 rounded-xl border ${style.bg} ${style.border} p-3`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`font-semibold text-sm ${style.text}`}>
                                {s.shift?.shiftName || style.label}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {startStr} — {endStr}
                              </p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border}`}>
                              {durStr}
                            </span>
                          </div>

                          {/* Connector hint between cards */}
                          {i < sorted.length - 1 && (() => {
                            const nextStart = sorted[i + 1].shift?.startTime
                              ? fmtUTCTime(sorted[i + 1].shift.startTime) : null;
                            return nextStart ? (
                              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <span className="inline-block w-3 border-t border-dashed border-muted-foreground/40" />
                                Continues at {nextStart}
                              </p>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <Calendar className="h-8 w-8 opacity-30" />
            <p className="text-sm">No schedule for this day</p>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="bg-orange-500 hover:bg-orange-600 text-white">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── LocationDialog ─────────────────────────────────────────────────────────────
function LocationDialog({ open, onOpenChange, list }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-2 dark:border-white/30">
        <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-orange-600" />Location Restriction Details</DialogTitle>
        </DialogHeader>
        {list.length ? (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {list.map((loc) => (
                <div key={loc.id} className="p-3 border rounded-md bg-muted/50 space-y-2 text-sm">
                  <div><strong>Name:</strong> <span className="capitalize">{loc.name}</span></div>
                  <div><strong>Coords:</strong> {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)}</div>
                  <div><strong>Radius:</strong> {loc.radius} m</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-center text-muted-foreground py-4">No location restriction.</p>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="bg-orange-500 hover:bg-orange-600 text-white">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}