// components/Dashboard/DashboardContent/Features/MyTimeLog.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { Clock, Calendar, Download, Filter, RefreshCw, ChevronUp, ChevronDown, Trash2, Send } from "lucide-react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import useAuthStore from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { RRule } from "rrule";

const IconBtn = ({ icon: Icon, tooltip, spinning, className = "", ...p }) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" className={` variant="outline" ${className}`} {...p}>
          <Icon className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const MultiSelect = ({ label, options, selected, onChange, allLabel, width = 180 }) => {
  const allChecked = selected.includes("all");
  const disp = allChecked ? allLabel : `${selected.length} selected`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`min-w-[${width}px] justify-between`}>
          {disp}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 space-y-1" align="start">
        <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => onChange("all")}>
          <Checkbox checked={allChecked} />
          <span>{allLabel}</span>
          {allChecked && <ChevronUp className="ml-auto h-4 w-4 text-orange-500" />}
        </div>
        <div className="max-h-60 overflow-y-auto pr-1">
          {options.map(({ value, label: lbl }) => {
            const checked = selected.includes(value);
            return (
              <div key={value} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => onChange(value)}>
                <Checkbox checked={checked} />
                <span className="truncate">{lbl}</span>
                {checked && <ChevronUp className="ml-auto h-4 w-4 text-orange-500" />}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const MAX_DEV_CHARS = 9;
const truncate = (s = "", L = MAX_DEV_CHARS) => (s.length > L ? s.slice(0, L) + "…" : s);

const safeDate = (d) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "—";
const safeTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");
const safeDateTime = (d) => (d ? `${safeDate(d)} ${safeTime(d)}` : "—");

const toHour = (m) => (m / 60).toFixed(2);
const diffMins = (a, b) => (new Date(b) - new Date(a)) / 60000;
const rawDuration = (tin, tout) => (!tin || !tout ? "—" : toHour(diffMins(tin, tout)));

const coffeeMinutes = (arr = []) => toHour(arr.reduce((m, b) => (b.start && b.end ? m + diffMins(b.start, b.end) : m), 0));
const lunchMinutesStr = (l) => (!l || !l.start || !l.end ? "0.00" : toHour(diffMins(l.start, l.end)));
const lunchMinutesNum = (l) => (!l || !l.start || !l.end ? 0 : diffMins(l.start, l.end));

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

const columnOptions = [
  { value: "id", label: "Timelog ID" },
  { value: "schedule", label: "Schedule" },
  { value: "dateTimeIn", label: "DateTimeIn" },
  { value: "dateTimeOut", label: "DateTimeOut" },
  { value: "duration", label: "Duration" },
  { value: "coffee", label: "Coffee" },
  { value: "lunch", label: "Lunch" },
  { value: "ot", label: "OT" },
  { value: "otStatus", label: "OT Status" },
  { value: "late", label: "Late" },
  { value: "deviceIn", label: "Device In" },
  { value: "deviceOut", label: "Device Out" },
  { value: "locationIn", label: "Location In" },
  { value: "locationOut", label: "Location Out" },
  { value: "period", label: "Period" },
  { value: "status", label: "Status" },
];

const CSV_HEADERS = columnOptions.filter((c) => c.value !== "schedule").map((c) => c.label.replace(" ", ""));

export default function MyTimeLog() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [logs, setLogs] = useState([]);
  const [defaultHours, setDefaultHours] = useState(8);
  const [minLunchMins, setMinLunchMins] = useState(60);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [approvers, setApprovers] = useState([]);
  const [otDialogOpen, setOtDialogOpen] = useState(false);
  const [otForLog, setOtForLog] = useState(null);
  const [otMaxHours, setOtMaxHours] = useState(0);
  const [otHoursEdit, setOtHoursEdit] = useState("");
  const [otApprover, setOtApprover] = useState("");
  const [otReason, setOtReason] = useState("");
  const [otSubmitting, setOtSubmitting] = useState(false);
  const [otViewOpen, setOtViewOpen] = useState(false);
  const [otViewData, setOtViewData] = useState(null);

  const [schedDialogOpen, setSchedDialogOpen] = useState(false);
  const [schedForDialog, setSchedForDialog] = useState([]);

  const [selected, setSelected] = useState(null);
  const [delOpen, setDelOpen] = useState(false);

  const [daily, setDaily] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [columnVisibility, setColumnVisibility] = useState(columnOptions.map((c) => c.value));
  const toggleColumn = (c) => setColumnVisibility((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const [sortConfig, setSortConfig] = useState({
    key: "dateTimeIn",
    direction: "descending",
  });
  const requestSort = (k) =>
    setSortConfig((p) => ({
      key: k,
      direction: p.key === k && p.direction === "ascending" ? "descending" : "ascending",
    }));

  const [filters, setFilters] = useState({
    ids: ["all"],
    schedule: "all",
    status: "all",
    deviceIn: ["all"],
    deviceOut: ["all"],
    from: "",
    to: "",
  });

  const handleFilterChange = (key, v) =>
    setFilters((prev) => {
      if (key === "schedule" || key === "status" || key === "from" || key === "to") return { ...prev, [key]: v };
      const all = prev[key].includes("all");
      if (v === "all") return { ...prev, [key]: ["all"] };
      let list = prev[key].filter((x) => x !== "all");
      list = list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
      if (!list.length) list = ["all"];
      return { ...prev, [key]: list };
    });

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

  const fetchSchedules = useCallback(async () => {
    if (!token) return;
    try {
      const [dailyRes, tmplRes] = await Promise.all([
        fetch(`${API_URL}/api/usershifts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/shiftschedules`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const [dailyJ, tmplJ] = await Promise.all([dailyRes.json(), tmplRes.json()]);
      if (!dailyRes.ok) throw new Error(dailyJ.error || "Failed shifts");
      if (!tmplRes.ok) throw new Error(tmplJ.error || "Failed schedules");
      setDaily(dailyJ.data || []);
      setTemplates(tmplJ.data || []);
    } catch (err) {
      toast.message(err.message);
    }
  }, [token, API_URL]);

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

  useEffect(() => {
    if (token) {
      fetchCompanySettings();
      fetchLogs();
      fetchSchedules();
      fetchApprovers();
    }
  }, [token, fetchSchedules, fetchApprovers, fetchCompanySettings]);

  const scheduleMap = useMemo(() => {
    const map = {};
    daily.forEach((s) => {
      if (!s.assignedDate) return;
      const key = s.assignedDate.slice(0, 10);
      (map[key] = map[key] || []).push(s);
    });
    return map;
  }, [daily]);

  const logsWithSchedule = useMemo(() => {
    const defaultShiftMins = defaultHours * 60;
    const unschedCap = Math.max(0, defaultShiftMins - minLunchMins);

    return logs.map((log) => {
      const key = log.timeIn ? log.timeIn.slice(0, 10) : "";
      const scheduleList = scheduleMap[key] || [];
      const firstSched = scheduleList[0];
      const grossMins = log.timeIn && log.timeOut ? diffMins(log.timeIn, log.timeOut) : 0;
      const coffeeMinsTotal = log.coffeeBreaks.reduce((m, b) => (b.start && b.end ? m + diffMins(b.start, b.end) : m), 0);
      const excessCoffeeMins = Math.max(0, coffeeMinsTotal - 30);
      const lunchMins = minLunchMins ? Math.max(log._lunchNum, minLunchMins) : log._lunchNum;
      const fullDevIn = getDevice(log, "in");
      const fullDevOut = getDevice(log, "out");

      if (scheduleList.length === 0) {
        const netMins = grossMins - lunchMins - excessCoffeeMins;

        const inside = Math.min(netMins, unschedCap);
        const rawOtMins = Math.max(0, netMins - unschedCap);

        const approvedRec = (log.overtime || []).find((o) => o.status === "approved");
        const approvedMinutes = approvedRec ? Math.min(Number(approvedRec.approvedHours ?? approvedRec.requestedHours ?? 0) * 60, rawOtMins) : 0;

        return {
          ...log,
          isScheduled: false,
          scheduleList: [],
          lateHours: "0.00",
          otHours: approvedRec !== undefined ? toHour(approvedMinutes) : rawOtMins === 0 ? "0.00" : toHour(rawOtMins),
          otStatus: approvedRec !== undefined ? "approved" : rawOtMins > 0 ? "No Approval" : "—",
          periodHours: toHour(inside + approvedMinutes),
          fullDevIn,
          fullDevOut,
          duration: rawDuration(log.timeIn, log.timeOut),
        };
      }

      const base = log.timeIn ? new Date(log.timeIn) : new Date(`${key}T00:00:00`);
      const ssUTC = new Date(firstSched.shift.startTime);
      const seUTC = new Date(firstSched.shift.endTime);

      const shiftStart = new Date(base);
      shiftStart.setHours(ssUTC.getUTCHours(), ssUTC.getUTCMinutes(), 0, 0);
      const shiftEnd = new Date(base);
      shiftEnd.setHours(seUTC.getUTCHours(), seUTC.getUTCMinutes(), 0, 0);
      if (shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);

      const schedDur = diffMins(shiftStart, shiftEnd);
      const lateMins = log.timeIn && new Date(log.timeIn) > shiftStart ? diffMins(shiftStart, log.timeIn) : 0;

      const insideWork = Math.max(0, schedDur - lateMins - lunchMins - excessCoffeeMins);
      const rawOtMins = log.timeOut && new Date(log.timeOut) > shiftEnd ? diffMins(shiftEnd, log.timeOut) : 0;

      const approvedRec = (log.overtime || []).find((o) => o.status === "approved");
      const approvedMinutes = approvedRec ? Math.min(Number(approvedRec.approvedHours ?? approvedRec.requestedHours ?? 0) * 60, rawOtMins) : 0;

      return {
        ...log,
        isScheduled: true,
        scheduleList,
        lateHours: lateMins === 0 ? "0.00" : toHour(lateMins),
        otHours: approvedRec !== undefined ? toHour(approvedMinutes) : rawOtMins === 0 ? "0.00" : toHour(rawOtMins),
        otStatus: approvedRec !== undefined ? "approved" : rawOtMins > 0 ? "No Approval" : "—",
        periodHours: toHour(insideWork + approvedMinutes),
        fullDevIn,
        fullDevOut,
        duration: rawDuration(log.timeIn, log.timeOut),
      };
    });
  }, [logs, scheduleMap, defaultHours, minLunchMins]);

  const idOptions = useMemo(() => logsWithSchedule.map((l) => ({ value: l.id, label: l.id })), [logsWithSchedule]);
  const devInOptions = useMemo(() => {
    const set = new Set();
    logsWithSchedule.forEach((l) => set.add(l.fullDevIn));
    return [...set].map((d) => ({ value: d, label: d }));
  }, [logsWithSchedule]);
  const devOutOptions = useMemo(() => {
    const set = new Set();
    logsWithSchedule.forEach((l) => set.add(l.fullDevOut));
    return [...set].map((d) => ({ value: d, label: d }));
  }, [logsWithSchedule]);

  const getFilteredLogs = () => {
    return logsWithSchedule.filter((l) => {
      const idMatch = filters.ids.includes("all") || filters.ids.includes(l.id);
      const scheduleMatch =
        filters.schedule === "all" || (filters.schedule === "scheduled" && l.isScheduled) || (filters.schedule === "unscheduled" && !l.isScheduled);
      const statusMatch = filters.status === "all" || (filters.status === "active" && l.status) || (filters.status === "completed" && !l.status);
      const devInMatch = filters.deviceIn.includes("all") || filters.deviceIn.includes(l.fullDevIn);
      const devOutMatch = filters.deviceOut.includes("all") || filters.deviceOut.includes(l.fullDevOut);
      const fromMatch = !filters.from || l.timeIn.slice(0, 10) >= filters.from;
      const toMatch = !filters.to || l.timeIn.slice(0, 10) <= filters.to;
      return idMatch && scheduleMatch && statusMatch && devInMatch && devOutMatch && fromMatch && toMatch;
    });
  };

  const getSortableValue = (l, k) => {
    switch (k) {
      case "id":
        return parseInt(l.id, 10);
      case "schedule":
        return l.isScheduled ? 1 : 0;
      case "dateTimeIn":
        return new Date(l.timeIn).getTime();
      case "dateTimeOut":
        return new Date(l.timeOut).getTime();
      case "duration":
        return parseFloat(l.duration) || 0;
      case "coffee":
        return parseFloat(l.coffeeMins) || 0;
      case "lunch":
        return parseFloat(l.lunchMins) || 0;
      case "ot":
        return parseFloat(l.otHours) || 0;
      case "late":
        return parseFloat(l.lateHours) || 0;
      case "period":
        return parseFloat(l.periodHours) || 0;
      case "otStatus":
        return (l.otStatus || "").toLowerCase();
      case "deviceIn":
        return (l.fullDevIn || "").toLowerCase();
      case "deviceOut":
        return (l.fullDevOut || "").toLowerCase();
      case "locationIn":
        return getLocation(l, "in").txt.toLowerCase();
      case "locationOut":
        return getLocation(l, "out").txt.toLowerCase();
      case "status":
        return l.status ? 1 : 0;
      default:
        return 0;
    }
  };

  const displayed = useMemo(() => {
    const filtered = getFilteredLogs();
    return [...filtered].sort((a, b) => {
      const aVal = getSortableValue(a, sortConfig.key);
      const bVal = getSortableValue(b, sortConfig.key);
      if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
  }, [getFilteredLogs, sortConfig]);

  const buildCSV = (rows) =>
    [
      CSV_HEADERS.map(wrap),
      ...rows.map((r) =>
        [
          r.id,
          r.isScheduled ? "Yes" : "No",
          safeDateTime(r.timeIn),
          safeDateTime(r.timeOut),
          r.duration,
          r.coffeeMins,
          r.lunchMins,
          r.otHours,
          r.otStatus,
          r.lateHours,
          r.fullDevIn,
          r.fullDevOut,
          getLocation(r, "in").txt,
          getLocation(r, "out").txt,
          r.periodHours,
          r.status ? "Active" : "Completed",
        ].map(wrap)
      ),
    ]
      .map((row) => row.join(","))
      .join("\r\n");

  const exportCSV = () => {
    if (!displayed.length) {
      toast.message("No rows to export");
      return;
    }
    setExporting(true);
    const blob = new Blob([buildCSV(displayed)], {
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

  const refresh = () => {
    setRefreshing(true);
    Promise.all([fetchLogs(), fetchSchedules(), fetchCompanySettings()]).finally(() => setRefreshing(false));
  };

  const deleteLog = async () => {
    if (!selected) return;
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
  };

  const submitOT = async () => {
    if (!otForLog || !otApprover) return;
    setOtSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/overtime/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          timeLogId: otForLog.id,
          approverId: otApprover,
          requesterReason: otReason,
          requestedHours: Number(otHoursEdit || 0),
          lateHours: Number(otForLog.lateHours === "—" ? 0 : otForLog.lateHours),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Request failed");
      toast.message("Overtime request submitted");
      setLogs((prev) => prev.map((l) => (l.id === otForLog.id ? { ...l, otStatus: "pending" } : l)));
      setOtDialogOpen(false);
      setOtForLog(null);
      setOtHoursEdit("");
      setOtApprover("");
      setOtReason("");
      setOtMaxHours(0);
    } catch (e) {
      toast.message(e.message);
    }
    setOtSubmitting(false);
  };

  const labelClass = "my-auto shrink-0 text-sm font-medium text-muted-foreground";

  const DashboardControls = () => (
    <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
      <div className="h-1 w-full bg-orange-500" />
      <CardHeader className="pb-2 relative">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
            <Filter className="h-5 w-5" />
          </div>
          Table Controls
        </CardTitle>
        <CardDescription>Filter, sort, and choose visible columns</CardDescription>
        <span className="absolute top-2 right-4 text-sm text-muted-foreground">
          Showing {displayed.length} of {logsWithSchedule.length} logs
        </span>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className={labelClass}>Table:</span>
            {columnOptions.map(({ value, label }) => {
              const active = columnVisibility.includes(value);
              return (
                <Button
                  key={value}
                  size="sm"
                  variant="outline"
                  className={active ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}
                  onClick={() => toggleColumn(value)}
                >
                  {label}
                </Button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <span className={labelClass}>Sort:</span>
            {columnOptions
              .filter((o) => columnVisibility.includes(o.value))
              .map(({ value, label }) => (
                <TooltipProvider key={value} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requestSort(value)}
                        className={sortConfig.key === value ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}
                      >
                        {label}
                        {sortConfig.key === value &&
                          (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Sort by {label}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <span className={labelClass}>Filter:</span>

            <MultiSelect label="IDs" options={idOptions} selected={filters.ids} onChange={(v) => handleFilterChange("ids", v)} allLabel="All IDs" />

            <Select value={filters.schedule} onValueChange={(v) => handleFilterChange("schedule", v)}>
              <SelectTrigger className="w-[180px] justify-center text-center relative pr-6">
                <SelectValue placeholder="All schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All schedule</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="unscheduled">Unscheduled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(v) => handleFilterChange("status", v)}>
              <SelectTrigger className="w-[180px] justify-center text-center relative pr-6">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <MultiSelect
              label="Device In"
              options={devInOptions}
              selected={filters.deviceIn}
              onChange={(v) => handleFilterChange("deviceIn", v)}
              allLabel="All Device In"
            />

            <MultiSelect
              label="Device Out"
              options={devOutOptions}
              selected={filters.deviceOut}
              onChange={(v) => handleFilterChange("deviceOut", v)}
              allLabel="All Device Out"
            />

            <div className="flex items-center gap-2">
              <span className="text-sm">From:</span>
              <Input type="date" value={filters.from} onChange={(e) => handleFilterChange("from", e.target.value)} className="h-8" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm">To:</span>
              <Input type="date" value={filters.to} onChange={(e) => handleFilterChange("to", e.target.value)} className="h-8" />
            </div>

            {filters.ids.length > 1 ||
              filters.schedule !== "all" ||
              filters.status !== "all" ||
              filters.deviceIn.length > 1 ||
              filters.deviceOut.length > 1 ||
              filters.from ||
              filters.to}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const Header = () => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
      <div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
            <Clock className="h-8 w-8" />
          </div>
          My Timelogs
        </h2>
        <p className="text-muted-foreground mt-2 text-lg">View and manage your timelogs</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black" asChild>
          <Link href="/dashboard/my-punch">
            <Clock className="h-4 w-4" />
            Punch
          </Link>
        </Button>
        <Button variant="outline" className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black" asChild>
          <Link href="/dashboard/my-shift-schedule">
            <Calendar className="h-4 w-4" />
            Schedule
          </Link>
        </Button>
        <IconBtn
          className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black"
          icon={RefreshCw}
          tooltip="Refresh logs"
          spinning={refreshing}
          onClick={refresh}
          variant="outline"
        />
        <IconBtn
          className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black"
          variant="outline"
          icon={Download}
          tooltip="Export CSV"
          spinning={exporting}
          onClick={exportCSV}
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-full mx-auto p-4 lg:px-4 px-1 space-y-8">
      <Toaster position="top-center" richColors />
      <Header />
      <DashboardControls />
      <LogsTable
        loading={loading}
        logs={displayed}
        columnVisibility={columnVisibility}
        sortConfig={sortConfig}
        requestSort={requestSort}
        onDelete={(l) => {
          setSelected(l);
          setDelOpen(true);
        }}
        onSchedule={(list) => {
          if (!list.length) {
            toast.message("You don't have any schedule yet");
            return;
          }
          setSchedForDialog(list);
          setSchedDialogOpen(true);
        }}
        onRequestOT={(l) => {
          setOtForLog(l);
          const max = parseFloat(l.otHours) || 0;
          setOtMaxHours(max);
          setOtHoursEdit(l.otHours === "0.00" || l.otHours === "—" ? "" : l.otHours);
          setOtDialogOpen(true);
        }}
        onViewOT={(payload) => {
          setOtViewData(payload);
          setOtViewOpen(true);
        }}
      />
      <DeleteDialog open={delOpen} onOpenChange={setDelOpen} selected={selected} onDelete={deleteLog} />
      <ScheduleDialog open={schedDialogOpen} onOpenChange={setSchedDialogOpen} scheduleList={schedForDialog} />
      <OTDialogs
        otDialogOpen={otDialogOpen}
        setOtDialogOpen={setOtDialogOpen}
        otForLog={otForLog}
        otMaxHours={otMaxHours}
        otHoursEdit={otHoursEdit}
        setOtHoursEdit={setOtHoursEdit}
        approvers={approvers}
        otApprover={otApprover}
        setOtApprover={setOtApprover}
        otReason={otReason}
        setOtReason={setOtReason}
        submitOT={submitOT}
        otSubmitting={otSubmitting}
        otViewOpen={otViewOpen}
        setOtViewOpen={setOtViewOpen}
        otViewData={otViewData}
      />
    </div>
  );
}

const LogsTable = ({ loading, logs, columnVisibility, sortConfig, requestSort, onDelete, onSchedule, onRequestOT, onViewOT }) => (
  <Card className="border-2 shadow-md overflow-hidden dark:border-white/10 text-gray-600 dark:text-gray-300">
    <div className="h-1 w-full bg-orange-500" />
    <CardHeader className="pb-2 flex justify-between items-start">
      <div>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
            <Calendar className="h-5 w-5" />
          </div>
          Timelogs
        </CardTitle>
        <CardDescription>All recorded time entries</CardDescription>
      </div>
      <div className="text-sm text-muted-foreground mt-2 md:mt-1">{logs.length} entries</div>
    </CardHeader>
    <CardContent className="p-0">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columnOptions
                .filter((c) => columnVisibility.includes(c.value))
                .map(({ value, label }) => (
                  <TableHead key={value} className="text-center text-nowrap cursor-pointer" onClick={() => requestSort(value)}>
                    <div className="flex items-center justify-center">
                      {label}
                      {sortConfig.key === value &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />)}
                    </div>
                  </TableHead>
                ))}
              <TableHead className="text-center text-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {columnVisibility.concat("actions").map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : logs.length ? (
              <AnimatePresence>
                {logs.map((log) => (
                  <TimelogRow
                    key={log.id}
                    log={log}
                    columnVisibility={columnVisibility}
                    onDelete={onDelete}
                    onSchedule={onSchedule}
                    onRequestOT={onRequestOT}
                    onViewOT={onViewOT}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <TableRow>
                <TableCell colSpan={columnVisibility.length + 1} className="h-24 text-center">
                  <span className="text-muted-foreground">No logs</span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);

const TimelogRow = ({ log, columnVisibility, onDelete, onSchedule, onRequestOT, onViewOT }) => {
  const devIn = log.fullDevIn;
  const devOut = log.fullDevOut;
  const locIn = getLocation(log, "in");
  const locOut = getLocation(log, "out");
  const otRecord = log.overtime?.[0] || null;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="border-b hover:bg-muted/50"
    >
      {columnVisibility.includes("id") && <TableCell className="font-mono text-xs text-center">{log.id}</TableCell>}
      {columnVisibility.includes("schedule") && (
        <TableCell className="text-center">
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-slate-100 text-xs" onClick={() => onSchedule(log.scheduleList)}>
            {log.isScheduled ? "Yes" : "No"}
          </Button>
        </TableCell>
      )}
      {columnVisibility.includes("dateTimeIn") && <TableCell className="text-nowrap text-center">{safeDateTime(log.timeIn)}</TableCell>}
      {columnVisibility.includes("dateTimeOut") && <TableCell className="text-nowrap text-center">{safeDateTime(log.timeOut)}</TableCell>}
      {columnVisibility.includes("duration") && <TableCell className="text-nowrap text-center">{log.duration}</TableCell>}
      {columnVisibility.includes("coffee") && <TableCell className="text-nowrap text-center">{log.coffeeMins}</TableCell>}
      {columnVisibility.includes("lunch") && <TableCell className="text-nowrap text-center">{log.lunchMins}</TableCell>}
      {columnVisibility.includes("ot") && <TableCell className="text-nowrap text-center">{log.otHours}</TableCell>}
      {columnVisibility.includes("otStatus") && (
        <TableCell className="text-nowrap text-center text-xs">
          {log.otStatus === "No Approval" ? (
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-slate-100 text-xs p-1.5" onClick={() => onRequestOT(log)}>
              Request
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-slate-100 text-xs p-1.5"
              disabled={!otRecord}
              onClick={() => otRecord && onViewOT({ ot: otRecord, log })}
            >
              {log.otStatus}
            </Button>
          )}
        </TableCell>
      )}
      {columnVisibility.includes("late") && <TableCell className="text-nowrap text-center">{log.lateHours}</TableCell>}
      {columnVisibility.includes("deviceIn") && (
        <TableCell className="text-center text-xs">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex flex-col items-center leading-tight cursor-default">
                  {(devIn ?? "—").split(",").map((p, i) => (
                    <span key={i}>{truncate(p.trim())}</span>
                  ))}
                </span>
              </TooltipTrigger>
              <TooltipContent className="break-all max-w-xs whitespace-pre-wrap">{devIn || "—"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TableCell>
      )}
      {columnVisibility.includes("deviceOut") && (
        <TableCell className="text-center text-xs">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex flex-col items-center leading-tight cursor-default">
                  {(devOut ?? "—").split(",").map((p, i) => (
                    <span key={i}>{truncate(p.trim())}</span>
                  ))}
                </span>
              </TooltipTrigger>
              <TooltipContent className="break-all max-w-xs whitespace-pre-wrap">{devOut || "—"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TableCell>
      )}
      {columnVisibility.includes("locationIn") && (
        <TableCell className="text-center">
          {locIn.lat != null ? (
            <Button className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 leading-tight">
              <a
                href={`https://www.google.com/maps?q=${locIn.lat},${locIn.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex flex-col items-center"
              >
                <span>{locIn.lat.toFixed(5)}</span>
                <span>{locIn.lng.toFixed(5)}</span>
              </a>
            </Button>
          ) : (
            locIn.txt
          )}
        </TableCell>
      )}
      {columnVisibility.includes("locationOut") && (
        <TableCell className="text-center">
          {locOut.lat != null ? (
            <Button className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 leading-tight">
              <a
                href={`https://www.google.com/maps?q=${locOut.lat},${locOut.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex flex-col items-center"
              >
                <span>{locOut.lat.toFixed(5)}</span>
                <span>{locOut.lng.toFixed(5)}</span>
              </a>
            </Button>
          ) : (
            locOut.txt
          )}
        </TableCell>
      )}
      {columnVisibility.includes("period") && <TableCell className="text-nowrap text-center">{log.periodHours}</TableCell>}
      {columnVisibility.includes("status") && <TableCell className="text-nowrap text-center">{log.status ? "Active" : "Completed"}</TableCell>}
      <TableCell className="text-nowrap text-center">
        <div className="flex justify-end gap-1">
          {!log.status && <IconBtn icon={Trash2} tooltip="Delete" className="text-red-600" onClick={() => onDelete(log)} />}
        </div>
      </TableCell>
    </motion.tr>
  );
};

const DeleteDialog = ({ open, onOpenChange, selected, onDelete }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-900/50">
      <div className="h-1 w-full bg-red-500 -mt-4 mb-4" />
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-red-600" />
          Confirm Deletion
        </DialogTitle>
      </DialogHeader>
      {selected && (
        <div className="border rounded-md p-3 bg-muted/50 text-sm space-y-2">
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
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/20 dark:hover:bg-red-900/10"
        >
          Cancel
        </Button>
        <Button variant="destructive" onClick={onDelete}>
          Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const Detail = ({ label, value }) => (
  <div>
    <div className="text-sm font-medium">{label}</div>
    <div className="break-words">{value}</div>
  </div>
);

const NUM2DAY = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const parseRRuleDays = (str) => {
  try {
    return RRule.fromString(str).options.byweekday.map((w) => w.toString().slice(0, 2));
  } catch {
    const m = str.match(/BYDAY=([^;]+)/i);
    return m ? m[1].split(",") : [];
  }
};
const fmtLocal = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fmtUTC = (d) =>
  new Date(d).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

const ScheduleDialog = ({ open, onOpenChange, scheduleList }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md border-2 dark:border-white/30">
      <div className="h-1 w-full bg-orange-500 mb-4" />
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
              const startDate = findProp(s, ["startDate"]);
              const endDate = findProp(s, ["endDate"]);
              let rawDays = findProp(s, ["days", "repetitionDays", "repeatDays", "daysOfWeek"]) || parseRRuleDays(s.recurrencePattern || "");
              if (typeof rawDays === "string") rawDays = rawDays.split(/[, ]+/);
              if (!Array.isArray(rawDays)) rawDays = [];
              const daysLabel = rawDays
                .map((d) => {
                  const n = parseInt(d, 10);
                  return isNaN(n) ? d.toUpperCase() : NUM2DAY[n] ?? "";
                })
                .filter(Boolean)
                .join(", ");

              let durationStr = "—";
              if (s.shift?.startTime && s.shift?.endTime) {
                const st = new Date(s.shift.startTime);
                const et = new Date(s.shift.endTime);
                let diff = diffMins(st, et);
                if (diff < 0) diff += 1440;
                durationStr = toHour(diff);
              }

              return (
                <div key={s.id} className="p-3 border rounded-md bg-muted/50 space-y-2">
                  <div className="text-sm">
                    <strong>Shift:</strong> <span className="capitalize">{s.shift?.shiftName || "—"}</span>
                  </div>

                  <div className="text-sm grid grid-cols-2 gap-2">
                    <span>
                      <strong>Start (Local):</strong> {s.shift?.startTime ? fmtUTC(s.shift.startTime) : "—"}
                    </span>
                    <span>
                      <strong>Start (UTC):</strong> {s.shift?.startTime ? fmtLocal(s.shift.startTime) : "—"}
                    </span>
                    <span>
                      <strong>End (Local):</strong> {s.shift?.endTime ? fmtUTC(s.shift.endTime) : "—"}
                    </span>
                    <span>
                      <strong>End (UTC):</strong> {s.shift?.endTime ? fmtLocal(s.shift.endTime) : "—"}
                    </span>
                  </div>

                  <div className="text-sm">
                    <strong>Duration:</strong> {durationStr}
                  </div>
                  <div className="text-sm">
                    <strong>Schedule Start:</strong>{" "}
                    {startDate
                      ? new Date(startDate).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </div>
                  <div className="text-sm">
                    <strong>Schedule End:</strong>{" "}
                    {endDate
                      ? new Date(endDate).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </div>
                  <div className="text-sm">
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
        <Button onClick={() => onOpenChange(false)} className="bg-orange-600 hover:bg-orange-700 text-white">
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const OTDialogs = ({
  otDialogOpen,
  setOtDialogOpen,
  otForLog,
  otMaxHours,
  otHoursEdit,
  setOtHoursEdit,
  approvers,
  otApprover,
  setOtApprover,
  otReason,
  setOtReason,
  submitOT,
  otSubmitting,
  otViewOpen,
  setOtViewOpen,
  otViewData,
}) => (
  <>
    <Dialog open={otDialogOpen} onOpenChange={setOtDialogOpen}>
      <DialogContent className="sm:max-w-md border-2 dark:border-white/10">
        <div className="h-1 w-full bg-orange-500 -mt-4 mb-4" />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-orange-500" />
            Request Overtime Approval
          </DialogTitle>
          <DialogDescription>Fill in the details below.</DialogDescription>
        </DialogHeader>

        {otForLog && (
          <div className="space-y-4 text-sm">
            <div>
              <strong>Date:</strong> {safeDate(otForLog.timeIn)} |{" "}
              <label className="text-sm font-medium flex flex-col gap-1">
                OT Hours
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  {...(otMaxHours > 0 ? { max: otMaxHours } : {})}
                  value={otHoursEdit}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (otMaxHours > 0 && Number(v) > otMaxHours) {
                      toast.message(`Maximum OT is ${otMaxHours} hour${otMaxHours === 1 ? "" : "s"}.`);
                      return;
                    }
                    setOtHoursEdit(v);
                  }}
                  className="border rounded-md px-2 py-1 w-32"
                />
                {otMaxHours > 0 && <span className="text-xs text-muted-foreground">Maximum for this log: {otMaxHours}</span>}
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Approver</label>
              <Select value={otApprover} onValueChange={setOtApprover}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose approver" />
                </SelectTrigger>
                <SelectContent>
                  {approvers.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name || a.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea placeholder="Provide a brief reason" value={otReason} onChange={(e) => setOtReason(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOtDialogOpen(false)} disabled={otSubmitting}>
            Cancel
          </Button>
          <Button
            disabled={!otApprover || !otHoursEdit || Number(otHoursEdit) <= 0 || (otMaxHours > 0 && Number(otHoursEdit) > otMaxHours) || otSubmitting}
            onClick={submitOT}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {otSubmitting ? "Submitting…" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={otViewOpen} onOpenChange={setOtViewOpen}>
      <DialogContent className="sm:max-w-md border-2 dark:border-white/10">
        <div className="h-1 w-full bg-orange-500 -mt-4 mb-4" />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-orange-500" />
            Overtime Request Details
          </DialogTitle>
        </DialogHeader>

        {otViewData ? (
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Detail label="Request ID" value={otViewData.ot.id} />
              <Detail label="Status" value={<span className="capitalize">{otViewData.ot.status}</span>} />
              <Detail label="Requested At" value={`${safeDate(otViewData.ot.createdAt)} ${safeTime(otViewData.ot.createdAt)}`} />
              <Detail label="OT Hours" value={otViewData.log.otHours} />
              <Detail label="Time In" value={safeTime(otViewData.log.timeIn)} />
              <Detail label="Time Out" value={safeTime(otViewData.log.timeOut)} />
              <Detail label="Requester Reason" value={otViewData.ot.requesterReason || "—"} />
              <Detail label="Approver Comments" value={otViewData.ot.approverComments || "—"} />
            </div>
            <div className="pt-4">
              <div className="text-sm font-medium mb-1">Raw OT Record</div>
              <pre className="bg-muted p-2 rounded-md text-xs overflow-auto">{JSON.stringify(otViewData.ot, null, 2)}</pre>
            </div>
          </ScrollArea>
        ) : (
          <p className="text-center text-muted-foreground py-8">No data</p>
        )}

        <DialogFooter>
          <Button onClick={() => setOtViewOpen(false)} className="bg-orange-500 hover:bg-orange-600 text-white">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
);
