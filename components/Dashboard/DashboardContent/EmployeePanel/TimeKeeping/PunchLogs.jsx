/* components/Dashboard/DashboardContent/TimeKeeping/PunchLogs.jsx */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Clock,
  Calendar,
  Download,
  Filter,
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
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import useAuthStore from "@/store/useAuthStore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
import IconBtn from "@/components/common/IconBtn";
import MultiSelect from "@/components/common/MultiSelect";
import ColumnSelector from "@/components/common/ColumnSelector";
import TableSkeleton from "@/components/common/TableSkeleton";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import FormDialog from "@/components/common/FormDialog";

const MAX_DEV_CHARS = 15;
const truncate = (s = "", L = MAX_DEV_CHARS) => (s.length > L ? s.slice(0, L) + "…" : s);
export const safeDate = (d) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "—";
export const safeTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");
export const safeDateTime = (d) => (d ? `${safeDate(d)} ${safeTime(d)}` : "—");
const toHour = (m) => (m / 60).toFixed(2);
const diffMins = (a, b) => (new Date(b) - new Date(a)) / 60000;
const rawDuration = (tin, tout) => (!tin || !tout ? "—" : toHour(diffMins(tin, tout)));
export const coffeeMinutes = (arr = []) => toHour(arr.reduce((m, b) => (b.start && b.end ? m + diffMins(b.start, b.end) : m), 0));
export const lunchMinutesStr = (l) => (!l || !l.start || !l.end ? "0.00" : toHour(diffMins(l.start, l.end)));
export const lunchMinutesNum = (l) => (!l || !l.start || !l.end ? 0 : diffMins(l.start, l.end));
const deepParse = (v) => {
  if (typeof v === "string" && /^\s*[{[]/.test(v)) {
    try {
      return deepParse(JSON.parse(v));
    } catch {
      return v;
    }
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
    for (const el of obj) {
      const r = findProp(el, names, depth + 1);
      if (r != null) return r;
    }
    return null;
  }
  if (typeof obj === "object") {
    for (const n of names) if (obj[n] != null) return obj[n];
    for (const v of Object.values(obj)) {
      const r = findProp(v, names, depth + 1);
      if (r != null) return r;
    }
  }
  return null;
};
const DEV_IN_KEYS = ["deviceIn", "deviceInfoStart", "deviceStart", "deviceInfoIn"];
const DEV_OUT_KEYS = ["deviceOut", "deviceInfoEnd", "deviceEnd", "deviceInfoOut"];
const LOC_IN_KEYS = ["locIn", "locationIn", "locationStart", "locStart"];
const LOC_OUT_KEYS = ["locOut", "locationOut", "locationEnd", "locEnd"];
const firstField = (log, keys) => keys.map((k) => log[k]).find(Boolean);
const chooseStartEnd = (log, dir, base) => (dir === "in" ? log?.[base]?.start : log?.[base]?.end);
const getDevice = (log, dir) => {
  let obj = firstField(log, dir === "in" ? DEV_IN_KEYS : DEV_OUT_KEYS);
  if (!obj) obj = chooseStartEnd(log, dir, "deviceInfo");
  if (!obj) return "—";
  obj = deepParse(obj);
  if (typeof obj === "string") return obj;
  const brand = findProp(obj, ["manufacturer", "brand"]);
  const name = findProp(obj, ["deviceName", "model"]);
  return [brand, name].filter(Boolean).join(", ") || JSON.stringify(obj);
};
const getLocation = (log, dir) => {
  let obj = firstField(log, dir === "in" ? LOC_IN_KEYS : LOC_OUT_KEYS);
  if (!obj) obj = chooseStartEnd(log, dir, "location");
  if (!obj)
    return {
      txt: "—",
      lat: null,
      lng: null,
    };
  obj = deepParse(obj);
  if (typeof obj === "string") {
    const [latS, lngS] = obj.split(/[, ]+/);
    const lat = +latS,
      lng = +lngS;
    return isFinite(lat) && isFinite(lng)
      ? {
          txt: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          lat,
          lng,
        }
      : { txt: obj, lat: null, lng: null };
  }
  const lat = findProp(obj, ["latitude", "lat"]);
  const lng = findProp(obj, ["longitude", "lng"]);
  return lat != null && lng != null
    ? {
        txt: `${(+lat).toFixed(5)}, ${(+lng).toFixed(5)}`,
        lat: +lat,
        lng: +lng,
      }
    : { txt: "—", lat: null, lng: null };
};
const wrap = (v) => `"${String(v).replace(/"/g, '""')}"`;
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

export default function PunchLogs() {
  const { token, user } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [logs, setLogs] = useState([]);
  const [defaultHours, setDefaultHours] = useState(8);
  const [minLunchMins, setMinLunchMins] = useState(60);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  
  const [otDialogOpen, setOtDialogOpen] = useState(false);
  const [otForLog, setOtForLog] = useState(null);
  const [otMaxHours, setOtMaxHours] = useState(0);
  const [otHoursEdit, setOtHoursEdit] = useState("");
  const [otApprover, setOtApprover] = useState("");
  const [otReason, setOtReason] = useState("");
  const [otSubmitting, setOtSubmitting] = useState(false);
  
  const [contestDialogOpen, setContestDialogOpen] = useState(false);
  const [contestLogId, setContestLogId] = useState("");
  const [contestApproverId, setContestApproverId] = useState("");
  const [contestReason, setContestReason] = useState("");
  const [contestDescription, setContestDescription] = useState("");
  const [contestRequestedClockIn, setContestRequestedClockIn] = useState("");
  const [contestRequestedClockOut, setContestRequestedClockOut] = useState("");
  const [contestSubmitting, setContestSubmitting] = useState(false);
  const [contestErrors, setContestErrors] = useState({});
  
  const [approvers, setApprovers] = useState([]);
  const [schedDialogOpen, setSchedDialogOpen] = useState(false);
  const [schedForDialog, setSchedForDialog] = useState([]);
  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [locDialogList, setLocDialogList] = useState([]);

  const [isStandaloneOT, setIsStandaloneOT] = useState(false);
  const [supervisors, setSupervisors] = useState([]);
  
  const defaultRowsPerPage = 10;
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [locList, setLocList] = useState([]);
  
  // Simplified default columns - only show essentials
  const columnOptions = [
    { value: "date", label: "Date" },
    { value: "timeIn", label: "Clock In" },
    { value: "timeOut", label: "Clock Out" },
    { value: "duration", label: "Duration" },
    { value: "ot", label: "OT" },
    { value: "status", label: "Status" },
  ];
  
  const [columnVisibility, setColumnVisibility] = useState(columnOptions.map((c) => c.value));
  const [filters, setFilters] = useState({
    ids: ["all"],
    schedule: "all",
    status: "all",
    from: "",
    to: "",
  });
  
  const toggleListFilter = (key, val) =>
    setFilters((prev) => {
      if (val === "all")
        return {
          ...prev,
          [key]: ["all"],
        };
      let list = prev[key].filter((x) => x !== "all");
      list = list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
      if (list.length === 0) list = ["all"];
      return { ...prev, [key]: list };
    });
    
  const handleFilterChange = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  
  const [sortConfig, setSortConfig] = useState({
    key: "timeRange",
    direction: "descending",
  });
  
  const requestSort = (k) =>
    setSortConfig((p) => ({
      key: k,
      direction: p.key === k && p.direction === "ascending" ? "descending" : "ascending",
    }));

  const fetchCompanySettings = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/company-settings/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (r.ok) {
        setDefaultHours(j.data?.defaultShiftHours ?? 8);
        const raw = j.data?.minimumLunchMinutes;
        setMinLunchMins(raw === null ? 0 : raw ?? 60);
      }
    } catch {
      setDefaultHours(8);
      setMinLunchMins(60);
    }
  }, [API_URL, token]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/timelogs/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Fetch failed");
      setLogs(
        (j.data || []).map((raw) => {
          const t = deepParse(raw);
          return {
            ...t,
            coffeeMins: coffeeMinutes(t.coffeeBreaks),
            lunchMins: lunchMinutesStr(t.lunchBreak),
            _lunchNum: lunchMinutesNum(t.lunchBreak),
          };
        })
      );
    } catch (err) {
      toast.message(err.message);
    }
    setLoading(false);
  };

  const fetchApprovers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/leaves/approvers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (res.ok) {
        const admins = (j.data || []).filter((u) => ["admin", "superadmin"].includes((u.role || "").toLowerCase()));
        setApprovers(admins);
      }
    } catch (err) {
      toast.message(err.message);
    }
  }, [token, API_URL]);

  const fetchLocations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/location`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (res.ok && j.data) {
        const list = [];
        j.data.forEach((loc) => {
          (loc.LocationRestriction || []).forEach((lr) => {
            if (lr.userId === user?.id && lr.restrictionStatus) list.push(loc);
          });
        });
        setLocList(list);
      }
    } catch {}
  }, [token, API_URL, user?.id]);

  useEffect(() => {
    if (!token) return;
    fetchCompanySettings();
    fetchLogs();
    fetchApprovers();
    fetchLocations();
    fetchSupervisors();
  }, [token, fetchApprovers, fetchCompanySettings, fetchLocations]);

  const logsWithSchedule = useMemo(() => {
    const defaultShiftMins = defaultHours * 60;
    const unschedCap = Math.max(0, defaultShiftMins - minLunchMins);
    return logs.map((log) => {
      const coffeeMinsTotal = log.coffeeBreaks.reduce((m, b) => (b.start && b.end ? m + diffMins(b.start, b.end) : m), 0);
      const excessCoffeeMins = Math.max(0, coffeeMinsTotal - 30);
      const grossMins = log.timeIn && log.timeOut ? diffMins(log.timeIn, log.timeOut) : 0;
      const lunchMins = minLunchMins ? Math.max(log._lunchNum, minLunchMins) : log._lunchNum;
      const netMins = Math.max(0, grossMins - lunchMins - excessCoffeeMins);
      const inside = Math.min(netMins, unschedCap);
      const rawOtMins = Math.max(0, netMins - unschedCap);
      const fullDevIn = getDevice(log, "in");
      const fullDevOut = getDevice(log, "out");
      return {
        ...log,
        isScheduled: false,
        isLocRestricted: locList.length > 0,
        locList,
        scheduleList: [],
        lateHours: "0.00",
        otHours: rawOtMins === 0 ? "0.00" : toHour(rawOtMins),
        otStatus: rawOtMins > 0 ? "No Approval" : "—",
        periodHours: toHour(inside),
        fullDevIn,
        fullDevOut,
        duration: rawDuration(log.timeIn, log.timeOut),
      };
    });
  }, [logs, defaultHours, minLunchMins, locList]);

  const getSortableValue = (l, k) => {
    switch (k) {
      case "date":
        return new Date(l.timeIn).getTime();
      case "timeIn":
        return new Date(l.timeIn).getTime();
      case "timeOut":
        return new Date(l.timeOut).getTime();
      case "duration":
        return parseFloat(l.duration) || 0;
      case "ot":
        return parseFloat(l.otHours) || 0;
      case "status":
        return l.status ? 1 : 0;
      default:
        return 0;
    }
  };

  const filteredSorted = useMemo(() => {
    let data = [...logsWithSchedule];
    if (!filters.ids.includes("all")) data = data.filter((log) => filters.ids.includes(log.id));
    if (filters.schedule !== "all")
      data = data.filter((log) => (filters.schedule === "scheduled" ? log.isScheduled : !log.isScheduled));
    if (filters.status !== "all") data = data.filter((log) => (filters.status === "active" ? log.status : !log.status));
    if (filters.from) data = data.filter((log) => log.timeIn.slice(0, 10) >= filters.from);
    if (filters.to) data = data.filter((log) => log.timeIn.slice(0, 10) <= filters.to);
    data.sort((a, b) => {
      const aVal = getSortableValue(a, sortConfig.key);
      const bVal = getSortableValue(b, sortConfig.key);
      if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
    return data;
  }, [logsWithSchedule, filters, sortConfig]);

  const stats = useMemo(() => {
    const total = filteredSorted.length;
    const active = filteredSorted.filter((l) => l.status).length;
    const completed = filteredSorted.filter((l) => !l.status).length;
    const totalHours = filteredSorted.reduce((sum, l) => sum + (parseFloat(l.duration) || 0), 0);
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
    } catch (err) {
      toast.message(err.message);
    }
    setDeleteLoading(false);
  };

  const submitOT = async () => {
    const selectedLog = otForLog;
    if (!selectedLog || !otApprover || !otHoursEdit || parseFloat(otHoursEdit) <= 0) {
      toast.message("Please fill in all required fields");
      return;
    }
    
    setOtSubmitting(true);
    try {
      const projectedClockOut = calculateProjectedClockOut(selectedLog.timeOut, otHoursEdit);
      
      const res = await fetch(`${API_URL}/api/overtime/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          timeLogId: selectedLog.id,
          approverId: otApprover,
          requesterReason: otReason,
          requestedHours: Number(otHoursEdit),
          lateHours: Number(selectedLog.lateHours === "—" ? 0 : selectedLog.lateHours),
          originalClockOut: selectedLog.timeOut,
          projectedClockOut: projectedClockOut?.toISOString(),
          totalProjectedHours: parseFloat(selectedLog.duration) + parseFloat(otHoursEdit),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Request failed");
      
      toast.message("Overtime request submitted successfully");
      
      // Update the log status in the list
      setLogs((prev) => prev.map((l) => (l.id === selectedLog.id ? { ...l, otStatus: "pending" } : l)));
      
      // Close dialog and reset state
      setOtDialogOpen(false);
      setIsStandaloneOT(false);
      setOtForLog(null);
    } catch (e) {
      toast.message(e.message);
    }
    setOtSubmitting(false);
  };

  const calculateProjectedClockOut = (originalClockOut, otHours) => {
    if (!originalClockOut || !otHours) return null;
    const otMinutes = parseFloat(otHours) * 60;
    const originalTime = new Date(originalClockOut);
    const projectedTime = new Date(originalTime.getTime() + (otMinutes * 60 * 1000));
    return projectedTime;
  };
  
  const fetchSupervisors = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/account/approver`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (res.ok) {
        // Transform the API response to match the expected format
        const formattedSupervisors = (j.data || []).map(supervisor => ({
          id: supervisor.id,
          name: supervisor.name,
          email: supervisor.email,
          department: supervisor.jobTitle || supervisor.role, // Use jobTitle as department, fallback to role
          role: supervisor.role
        }));
        setSupervisors(formattedSupervisors);
      } else {
        console.error('Failed to fetch supervisors:', j.error);
        setSupervisors([]); // Fallback to empty array
      }
    } catch (err) {
      console.error('Error fetching supervisors:', err);
      setSupervisors([]); // Fallback to empty array
    }
  }, [token, API_URL]);

  const submitContestPolicy = async () => {
    const errors = {};
    if (!contestLogId) errors.logId = "Please select a punch log";
    if (!contestApproverId) errors.approverId = "Please select an approver";
    if (!contestReason.trim()) errors.reason = "Please provide a reason for contesting";
    if (!contestDescription.trim()) errors.description = "Please provide a detailed description";
    if (!contestRequestedClockIn) errors.clockIn = "Please provide the correct clock-in time";
    if (!contestRequestedClockOut) errors.clockOut = "Please provide the correct clock-out time";
    
    setContestErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const selectedLog = filteredSorted.find(log => log.id === contestLogId);
    
    setContestSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/contest-policy/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
      
      toast.message("Clock in/out contest request submitted successfully");
      setContestDialogOpen(false);
      
      setContestLogId("");
      setContestApproverId("");
      setContestReason("");
      setContestDescription("");
      setContestRequestedClockIn("");
      setContestRequestedClockOut("");
      setContestErrors({});
    } catch (e) {
      toast.message(e.message);
    }
    setContestSubmitting(false);
  };

  const refresh = () => {
    setRefreshing(true);
    Promise.all([fetchLogs(), fetchCompanySettings(), fetchLocations()]).finally(() => setRefreshing(false));
  };

  const buildCSV = (rows) => {
    const header = ["ID", "Time In", "Time Out", "Duration", "Coffee", "Lunch", "OT", "OT Status", "Late", "Period", "Status"].map(wrap);
    const cell = (r) => [
      r.id,
      safeDateTime(r.timeIn),
      safeDateTime(r.timeOut),
      r.duration,
      r.coffeeMins,
      r.lunchMins,
      r.otHours,
      r.otStatus,
      r.lateHours,
      r.periodHours,
      r.status ? "Active" : "Completed",
    ].map(wrap);
    const body = rows.map(cell);
    return [header, ...body].map((row) => row.join(",")).join("\r\n");
  };

  const exportCSV = () => {
    if (!filteredSorted.length) {
      toast.message("No rows to export");
      return;
    }
    setExporting(true);
    const blob = new Blob([buildCSV(filteredSorted)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MyTimelogs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.message("CSV exported");
    setExporting(false);
  };

  const exportPDF = () => {
    if (!filteredSorted.length) {
      toast.message("No rows to export");
      return;
    }
    const company = user?.company?.name || "—";
    const fullName = `${user?.profile?.firstName || ""} ${user?.profile?.lastName || ""}`.trim() || "—";
    const email = user?.email || "—";
    const tableHead = [["ID", "Time In", "Time Out", "Duration", "OT", "Status"]];
    const tableBody = filteredSorted.map((row) => [
      row.id,
      safeDateTime(row.timeIn),
      safeDateTime(row.timeOut),
      row.duration,
      row.otHours,
      row.status ? "Active" : "Completed",
    ]);
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    doc.setFontSize(12);
    doc.text(`Company : ${company}`, 14, 20);
    doc.text(`Full Name: ${fullName}`, 14, 28);
    doc.text(`Email    : ${email}`, 14, 36);
    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 44,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 165, 0] },
    });
    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`MyTimelogs_${stamp}.pdf`);
    toast.message("PDF exported");
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-full mx-auto p-4 lg:px-10 px-2 space-y-6">
        <Toaster position="top-center" />
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Clock className="h-7 w-7 text-orange-500" />
              Punch Logs
            </h2>
            <p className="text-sm text-muted-foreground mt-1">View and manage your time tracking records</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/employee/punch">Punch</Link>
            </Button>

            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    if (filteredSorted.length > 0) {
                      setIsStandaloneOT(true);
                      setOtForLog(null);
                      setOtMaxHours(0);
                      setOtHoursEdit("");
                      setOtApprover("");
                      setOtReason("");
                      setOtDialogOpen(true);
                    } else {
                      toast.message("No logs available for overtime request");
                    }
                  }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Overtime Request</TooltipContent>
            </Tooltip>
                  
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    if (filteredSorted.length > 0) {
                      setContestDialogOpen(true);
                    } else {
                      toast.message("No logs available to contest");
                    }
                  }}
                >
                  <AlertTriangle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Contest Times</TooltipContent>
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
        
        <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
          <div className="h-1 w-full bg-orange-500" />
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-orange-500" />
                Table Controls
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {displayed.length} of {filteredSorted.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-medium text-muted-foreground">Filter:</span>
                <MultiSelect
                  options={logsWithSchedule.map((l) => ({
                    value: l.id,
                    label: l.id,
                  }))}
                  selected={filters.ids}
                  onChange={(v) => toggleListFilter("ids", v)}
                  allLabel="All IDs"
                  width={170}
                />
                <Select value={filters.status} onValueChange={(v) => handleFilterChange("status", v)}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="All status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={filters.from}
                  onChange={(e) => handleFilterChange("from", e.target.value)}
                  className="w-[160px]"
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={filters.to}
                  onChange={(e) => handleFilterChange("to", e.target.value)}
                  className="w-[160px]"
                  placeholder="To"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
          <div className="h-1 w-full bg-orange-500" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Punch logs
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
                        <TableHead
                          key={value}
                          className="cursor-pointer"
                          onClick={() => requestSort(value)}
                        >
                          <div className="flex items-center gap-1">
                            {label}
                            {sortConfig.key === value &&
                              (sortConfig.direction === "ascending" ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              ))}
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
                          expanded={expandedRow === log.id}
                          onToggleExpand={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                          onSchedule={(list) => {
                            setSchedForDialog(list);
                            setSchedDialogOpen(true);
                          }}
                          onRequestOT={(l) => {
                            setIsStandaloneOT(false);
                            setOtForLog(l);
                            setOtMaxHours(parseFloat(l.otHours) || 0);
                            setOtHoursEdit(l.otHours === "0.00" ? "" : l.otHours);
                            setOtApprover("");
                            setOtReason("");
                            setOtDialogOpen(true);
                          }}
                          onDelete={(l) => {
                            setSelected(l);
                            setDelOpen(true);
                          }}
                          onLocation={(list) => {
                            setLocDialogList(list);
                            setLocDialogOpen(true);
                          }}
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
                  <ChevronsLeft className="h-4 w-4" />
                  First
                </Button>
                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1;
                  if (p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    return (
                      <Button key={p} size="sm" variant={p === page ? "default" : "outline"} onClick={() => setPage(p)}>
                        {p}
                      </Button>
                    );
                  if ((p === page - 2 && p > 1) || (p === page + 2 && p < totalPages))
                    return (
                      <span key={p} className="px-1 text-muted-foreground">
                        …
                      </span>
                    );
                  return null;
                })}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage(totalPages)}
                >
                  Last
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {rowsPerPage < filteredSorted.length && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const next = Math.min(rowsPerPage + defaultRowsPerPage, filteredSorted.length);
                      setRowsPerPage(next);
                    }}
                  >
                    Load more
                  </Button>
                )}
                {rowsPerPage < filteredSorted.length && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRowsPerPage(filteredSorted.length);
                      setPage(1);
                    }}
                  >
                    Show all
                  </Button>
                )}
                {rowsPerPage > defaultRowsPerPage && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRowsPerPage(defaultRowsPerPage);
                      setPage(1);
                    }}
                  >
                    Show less
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
        
        <ConfirmDeleteDialog
          open={delOpen}
          setOpen={setDelOpen}
          title="Delete Punch log"
          description={selected ? `Remove timelog ${selected.id} – ${safeDate(selected.timeIn)} ?` : ""}
          loading={deleteLoading}
          onConfirm={deleteLog}
        >
          {selected && (
            <div className="space-y-1 text-sm">
              <p>
                <strong>Date:</strong> {safeDate(selected.timeIn)}
              </p>
              <p>
                <strong>Time In:</strong> {safeTime(selected.timeIn)}
              </p>
              <p>
                <strong>Time Out:</strong> {safeTime(selected.timeOut)}
              </p>
            </div>
          )}
        </ConfirmDeleteDialog>
        
        <FormDialog
          open={otDialogOpen}
          setOpen={(open) => {
            setOtDialogOpen(open);
            if (!open) {
              setIsStandaloneOT(false);
              setOtForLog(null);
            }
          }}
          icon={Send}
          title="Request Overtime Approval"
          subtitle={
            otForLog && !isStandaloneOT 
              ? `For ${safeDate(otForLog.timeIn)} (${otForLog.otHours} h OT)`
              : isStandaloneOT && otForLog
              ? `For ${safeDate(otForLog.timeIn)}`
              : "Select a punch log to request overtime"
          }
          loading={otSubmitting}
          primaryLabel="Submit"
          onSubmit={submitOT}
          primaryDisabled={!otForLog || !otApprover || !otHoursEdit || parseFloat(otHoursEdit) <= 0}
        >
          <div className="space-y-6 text-sm"> {/* Changed from space-y-4 to space-y-6 for better spacing */}
            {/* Log selection for standalone requests */}
            {isStandaloneOT && (
              <div className="space-y-2">
                <label className="font-medium">Select Punch Log *</label>
                <Select 
                  value={otForLog?.id || ""} 
                  onValueChange={(logId) => {
                    const selectedLog = filteredSorted.find(log => log.id === logId);
                    if (selectedLog) {
                      setOtForLog(selectedLog);
                      // Set max hours based on a reasonable limit (e.g., 12 hours total work day)
                      const currentDuration = parseFloat(selectedLog.duration) || 0;
                      const reasonableMaxOT = Math.max(0, 12 - currentDuration);
                      setOtMaxHours(reasonableMaxOT);
                      setOtHoursEdit("");
                      setOtApprover(""); // Reset approver when log changes
                      setOtReason(""); // Reset reason when log changes
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a punch log" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {filteredSorted
                      .filter(log => !log.status && log.timeOut) // Only completed logs with clock-out
                      .map((log) => (
                        <SelectItem key={log.id} value={String(log.id)}>
                          {safeDate(log.timeIn)} - {log.duration}h ({safeTime(log.timeIn)} to {safeTime(log.timeOut)})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {filteredSorted.filter(log => !log.status && log.timeOut).length === 0 && (
                  <p className="text-xs text-muted-foreground">No completed punch logs available</p>
                )}
              </div>
            )}
            
            {/* OT Hours - Always show but disabled until log is selected */}
            <div className="space-y-2">
              <label className={`block font-medium ${!otForLog ? 'text-muted-foreground' : ''}`}>OT Hours</label>
              <Input
                type="number"
                min="0"
                step="0.25"
                max={otMaxHours}
                value={otHoursEdit}
                onChange={(e) => setOtHoursEdit(e.target.value)}
                className="w-40" // Changed from w-32 to w-40 for better spacing
                placeholder="0.00"
                disabled={!otForLog}
              />
              {otForLog && !!otMaxHours && (
                <p className="text-xs text-muted-foreground">Maximum recommended: {otMaxHours}h</p>
              )}
              {!otForLog && (
                <p className="text-xs text-muted-foreground">Select a punch log first</p>
              )}
            </div>

            {/* Show projected clock-out time */}
            {otForLog && otHoursEdit && parseFloat(otHoursEdit) > 0 && otForLog.timeOut && (
              <div className="p-4 bg-muted/50 rounded-md border"> {/* Added more padding */}
                <h4 className="font-medium mb-3 flex items-center gap-2"> {/* Increased margin */}
                  <Clock className="h-4 w-4 text-orange-500" />
                  Projected Times
                </h4>
                <div className="space-y-2 text-xs"> {/* Increased spacing */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Original Clock-out:</span>
                    <span className="font-medium">{safeDateTime(otForLog.timeOut)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">With {otHoursEdit}h OT:</span>
                    <span className="font-medium text-orange-600">
                      {safeDateTime(calculateProjectedClockOut(otForLog.timeOut, otHoursEdit))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Hours:</span>
                    <span className="font-medium">
                      {(parseFloat(otForLog.duration) + parseFloat(otHoursEdit)).toFixed(2)}h
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Approver - Always show but disabled until log is selected */}
            <div className="space-y-2">
              <label className={`font-medium ${!otForLog ? 'text-muted-foreground' : ''}`}>Approver</label>
              <Select 
                value={otApprover} 
                onValueChange={setOtApprover}
                disabled={!otForLog}
              >
                <SelectTrigger className={!otForLog ? 'text-muted-foreground' : ''}>
                  <SelectValue placeholder={!otForLog ? "Select a punch log first" : "Choose approver"} />
                </SelectTrigger>
                <SelectContent>
                  {/* Simple approach: Only show supervisors if they exist, otherwise show all approvers */}
                  {supervisors.length > 0 ? (
                    // User has department - show supervisors
                    <>
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Team Supervisors</div>
                      {supervisors.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} - {s.department}
                        </SelectItem>
                      ))}
                    </>
                  ) : (
                    // User has no department - show all approvers
                    <>
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Approvers</div>
                      {approvers.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name || a.email}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Reason - Always show but disabled until log is selected */}
            <div className="space-y-2">
              <label className={`font-medium ${!otForLog ? 'text-muted-foreground' : ''}`}>Reason (optional)</label>
              <Textarea 
                value={otReason} 
                onChange={(e) => setOtReason(e.target.value)} 
                placeholder={!otForLog ? "Select a punch log first" : "Brief reason for overtime request..."}
                className="min-h-[80px]"
                disabled={!otForLog}
              />
            </div>
          </div>
        </FormDialog>
        
        <Dialog open={contestDialogOpen} onOpenChange={setContestDialogOpen}>
          <DialogContent className="sm:max-w-lg border-2 dark:border-white/30">
            <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Contest Clock In/Out Times
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Submit a request to contest the recorded clock-in and clock-out times for a specific punch log.
              </p>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Select Punch Log <span className="text-orange-500">*</span>
                </label>
                <Select
                  value={contestLogId}
                  onValueChange={(v) => {
                    setContestLogId(v);
                    setContestErrors((e) => ({ ...e, logId: undefined }));
                    const selectedLog = filteredSorted.find(log => log.id === v);
                    if (selectedLog) {
                      setContestRequestedClockIn(selectedLog.timeIn?.slice(0, 16) || "");
                      setContestRequestedClockOut(selectedLog.timeOut?.slice(0, 16) || "");
                    }
                  }}
                >
                  <SelectTrigger className={contestErrors.logId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select a punch log to contest" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {filteredSorted.map((log) => (
                      <SelectItem key={log.id} value={String(log.id)}>
                        {log.id} - {safeDate(log.timeIn)} ({safeTime(log.timeIn)} to {safeTime(log.timeOut)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {contestErrors.logId && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {contestErrors.logId}
                  </p>
                )}
              </div>

              {contestLogId && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Correct Clock In <span className="text-orange-500">*</span>
                      </label>
                      <Input
                        type="datetime-local"
                        value={contestRequestedClockIn}
                        onChange={(e) => {
                          setContestRequestedClockIn(e.target.value);
                          setContestErrors((e) => ({ ...e, clockIn: undefined }));
                        }}
                        className={contestErrors.clockIn ? "border-red-500" : ""}
                      />
                      {contestErrors.clockIn && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {contestErrors.clockIn}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Correct Clock Out <span className="text-orange-500">*</span>
                      </label>
                      <Input
                        type="datetime-local"
                        value={contestRequestedClockOut}
                        onChange={(e) => {
                          setContestRequestedClockOut(e.target.value);
                          setContestErrors((e) => ({ ...e, clockOut: undefined }));
                        }}
                        className={contestErrors.clockOut ? "border-red-500" : ""}
                      />
                      {contestErrors.clockOut && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {contestErrors.clockOut}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-orange-500" />
                      Approver <span className="text-orange-500">*</span>
                    </label>
                    <Select
                      value={contestApproverId}
                      onValueChange={(v) => {
                        setContestApproverId(v);
                        setContestErrors((e) => ({ ...e, approverId: undefined }));
                      }}
                    >
                      <SelectTrigger className={contestErrors.approverId ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select approver" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {approvers.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.name || a.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {contestErrors.approverId && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {contestErrors.approverId}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Reason for Contest <span className="text-orange-500">*</span>
                    </label>
                    <Select
                      value={contestReason}
                      onValueChange={(v) => {
                        setContestReason(v);
                        setContestErrors((e) => ({ ...e, reason: undefined }));
                      }}
                    >
                      <SelectTrigger className={contestErrors.reason ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system_clock_error">System Clock Error</SelectItem>
                        <SelectItem value="device_malfunction">Device Malfunction</SelectItem>
                        <SelectItem value="network_delay">Network/Connection Delay</SelectItem>
                        <SelectItem value="incorrect_time_zone">Incorrect Time Zone</SelectItem>
                        <SelectItem value="manual_entry_error">Manual Entry Error</SelectItem>
                        <SelectItem value="emergency_situation">Emergency Situation</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {contestErrors.reason && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {contestErrors.reason}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Detailed Explanation <span className="text-orange-500">*</span>
                    </label>
                    <Textarea
                      value={contestDescription}
                      onChange={(e) => {
                        setContestDescription(e.target.value);
                        setContestErrors((e) => ({ ...e, description: undefined }));
                      }}
                      placeholder="Please explain why the recorded clock-in/out times are incorrect and provide details about what happened..."
                      className={`min-h-[100px] resize-none ${contestErrors.description ? "border-red-500" : ""}`}
                      maxLength={500}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{contestDescription.length}/500 characters</span>
                      {contestErrors.description && (
                        <span className="text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {contestErrors.description}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setContestDialogOpen(false);
                  setContestLogId("");
                  setContestApproverId("");
                  setContestReason("");
                  setContestDescription("");
                  setContestRequestedClockIn("");
                  setContestRequestedClockOut("");
                  setContestErrors({});
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={submitContestPolicy}
                disabled={contestSubmitting || !contestLogId}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {contestSubmitting ? "Submitting..." : "Submit Contest"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <ScheduleDialog open={schedDialogOpen} onOpenChange={setSchedDialogOpen} scheduleList={schedForDialog} />
        <LocationDialog open={locDialogOpen} onOpenChange={setLocDialogOpen} list={locDialogList} />
      </div>
    </TooltipProvider>
  );
}

function TimelogRow({ log, columnVisibility, expanded, onToggleExpand, onSchedule, onRequestOT, onDelete, onLocation }) {
  const locIn = getLocation(log, "in");
  const locOut = getLocation(log, "out");
  
  return (
    <>
      <motion.tr
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className="border-b hover:bg-muted/50 cursor-pointer group"
        onClick={onToggleExpand}
      >
        <TableCell className="w-12">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
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
        
        {columnVisibility.includes("timeIn") && (
          <TableCell className="text-sm font-medium">{safeTime(log.timeIn)}</TableCell>
        )}
        
        {columnVisibility.includes("timeOut") && (
          <TableCell className="text-sm font-medium">{safeTime(log.timeOut)}</TableCell>
        )}
        
        {columnVisibility.includes("duration") && (
          <TableCell className="text-sm font-medium">{log.duration}h</TableCell>
        )}
        
        {columnVisibility.includes("ot") && (
          <TableCell>
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">{log.otHours}h</div>
              {log.otStatus === "No Approval" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestOT(log);
                  }}
                >
                  Request
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">{log.otStatus}</span>
              )}
            </div>
          </TableCell>
        )}
        
        {columnVisibility.includes("status") && (
          <TableCell>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              log.status 
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
            }`}>
              {log.status ? "Active" : "Completed"}
            </span>
          </TableCell>
        )}
        
        <TableCell className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSchedule(log.scheduleList); }}>
                <Calendar className="h-4 w-4 mr-2" />
                View Schedule
              </DropdownMenuItem>
              {log.isLocRestricted && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onLocation(log.locList); }}>
                  <MapPin className="h-4 w-4 mr-2" />
                  View Location
                </DropdownMenuItem>
              )}
              {!log.status && (
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(log); }}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </motion.tr>
      
      {expanded && (
        <motion.tr
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bg-muted/30"
        >
          <TableCell colSpan={columnVisibility.length + 2} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Break Times
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coffee Break:</span>
                    <span className="font-medium">{log.coffeeMins}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lunch Break:</span>
                    <span className="font-medium">{log.lunchMins}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Late Hours:</span>
                    <span className="font-medium">{log.lateHours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Period Hours:</span>
                    <span className="font-medium">{log.periodHours}h</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-500" />
                  Device & Location
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
                      <a
                        href={`https://www.google.com/maps?q=${locIn.lat},${locIn.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-500 hover:underline"
                      >
                        {locIn.txt}
                      </a>
                    </div>
                  )}
                  {locOut.lat && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Location Out:</span>
                      <a
                        href={`https://www.google.com/maps?q=${locOut.lat},${locOut.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-500 hover:underline"
                      >
                        {locOut.txt}
                      </a>
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
                    <div>
                      <strong>Shift:</strong> <span className="capitalize">{s.shift?.shiftName || "—"}</span>
                    </div>
                    <div>
                      <strong>Start:</strong> {s.shift?.startTime ? fmtUTCTime(s.shift.startTime) : "—"}
                    </div>
                    <div>
                      <strong>End:</strong> {s.shift?.endTime ? fmtUTCTime(s.shift.endTime) : "—"}
                    </div>
                    <div>
                      <strong>Duration:</strong> {durationStr}
                    </div>
                    <div>
                      <strong>Schedule Start:</strong>{" "}
                      {startDate
                        ? new Date(startDate).toLocaleDateString(undefined, {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                    <div>
                      <strong>Schedule End:</strong>{" "}
                      {endDate
                        ? new Date(endDate).toLocaleDateString(undefined, {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                    <div>
                      <strong>Days:</strong> {daysLabel || "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-center text-muted-foreground py-8">You don't have any schedule yet</p>
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

function LocationDialog({ open, onOpenChange, list }) {
  const fmtLatLng = (lat, lng) => `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-2 dark:border-white/30">
        <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-600" />
            Location Restriction Details
          </DialogTitle>
        </DialogHeader>
        {list.length ? (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {list.map((loc) => (
                <div key={loc.id} className="p-3 border rounded-md bg-muted/50 space-y-2 text-sm">
                  <div>
                    <strong>Name:</strong> <span className="capitalize">{loc.name}</span>
                  </div>
                  <div>
                    <strong>Coords:</strong> {fmtLatLng(loc.latitude, loc.longitude)}
                  </div>
                  <div>
                    <strong>Radius:</strong> {loc.radius} m
                  </div>
                  <div>
                    <strong>Location ID:</strong> {loc.id}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-center text-muted-foreground py-4">No location restriction.</p>
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