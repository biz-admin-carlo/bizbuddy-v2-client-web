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
import IconBtn from "@/components/common/IconBtn";
import MultiSelect from "@/components/common/MultiSelect";
import ColumnSelector from "@/components/common/ColumnSelector";
import TableSkeleton from "@/components/common/TableSkeleton";
import DeleteBtn from "@/components/common/DeleteBtn";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import FormDialog from "@/components/common/FormDialog";

const MAX_DEV_CHARS = 9;
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
  const [otDialogOpen, setOtDialogOpen] = useState(false);
  const [otForLog, setOtForLog] = useState(null);
  const [otMaxHours, setOtMaxHours] = useState(0);
  const [otHoursEdit, setOtHoursEdit] = useState("");
  const [otApprover, setOtApprover] = useState("");
  const [otReason, setOtReason] = useState("");
  const [otSubmitting, setOtSubmitting] = useState(false);
  const [approvers, setApprovers] = useState([]);
  const [schedDialogOpen, setSchedDialogOpen] = useState(false);
  const [schedForDialog, setSchedForDialog] = useState([]);
  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [locDialogList, setLocDialogList] = useState([]);
  const defaultRowsPerPage = 10;
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [locList, setLocList] = useState([]);
  const columnOptions = [
    { value: "id", label: "Punch log ID" },
    { value: "schedule", label: "Schedule" },
    { value: "locationRestricted", label: "Location" },
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
    key: "dateTimeIn",
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
      case "id":
        return parseInt(l.id, 10);
      case "schedule":
        return l.isScheduled ? 1 : 0;
      case "locationRestricted":
        return l.isLocRestricted ? 1 : 0;
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
    } catch (e) {
      toast.message(e.message);
    }
    setOtSubmitting(false);
  };
  const refresh = () => {
    setRefreshing(true);
    Promise.all([fetchLogs(), fetchCompanySettings(), fetchLocations()]).finally(() => setRefreshing(false));
  };
  const buildCSV = (rows) => {
    const visibleCols = columnOptions.filter((c) => columnVisibility.includes(c.value));
    const header = visibleCols.map((c) => wrap(c.label.replace(" ", "")));
    const cell = (r, key) => {
      switch (key) {
        case "id":
          return r.id;
        case "schedule":
          return r.isScheduled ? "Yes" : "No";
        case "locationRestricted":
          return r.isLocRestricted ? "Yes" : "No";
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
          return getLocation(r, "in").txt;
        case "locationOut":
          return getLocation(r, "out").txt;
        case "period":
          return r.periodHours;
        case "status":
          return r.status ? "Active" : "Completed";
        default:
          return "";
      }
    };
    const body = rows.map((r) => visibleCols.map((c) => wrap(cell(r, c.value))));
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
    const visibleCols = columnOptions.filter((c) => columnVisibility.includes(c.value));
    const tableHead = [visibleCols.map((c) => c.label.replace(" ", ""))];
    const cellValue = (row, colKey) => {
      switch (colKey) {
        case "id":
          return row.id;
        case "schedule":
          return row.isScheduled ? "Yes" : "No";
        case "locationRestricted":
          return row.isLocRestricted ? "Yes" : "No";
        case "dateTimeIn":
          return safeDateTime(row.timeIn);
        case "dateTimeOut":
          return safeDateTime(row.timeOut);
        case "duration":
          return row.duration;
        case "coffee":
          return row.coffeeMins;
        case "lunch":
          return row.lunchMins;
        case "ot":
          return row.otHours;
        case "otStatus":
          return row.otStatus;
        case "late":
          return row.lateHours;
        case "deviceIn":
          return row.fullDevIn;
        case "deviceOut":
          return row.fullDevOut;
        case "locationIn":
          return getLocation(row, "in").txt;
        case "locationOut":
          return getLocation(row, "out").txt;
        case "period":
          return row.periodHours;
        case "status":
          return row.status ? "Active" : "Completed";
        default:
          return "";
      }
    };
    const tableBody = filteredSorted.map((row) => visibleCols.map((c) => cellValue(row, c.value)));
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
    <div className="max-w-full mx-auto p-4 lg:px-4 px-1 space-y-8">
      <Toaster position="top-center" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
            <Clock className="h-8 w-8 text-orange-500" />
            Punch logs
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/employee/punch">Punch</Link>
          </Button>
          <IconBtn icon={RefreshCw} tooltip="Refresh table" spinning={refreshing} onClick={refresh} />
          <IconBtn icon={Download} tooltip="Export CSV" spinning={exporting} onClick={exportCSV} />
          <IconBtn icon={FileText} tooltip="Export PDF" onClick={exportPDF} />
        </div>
      </div>
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2 relative">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-orange-500" />
            Table Controls
          </CardTitle>
          <span className="absolute top-2 right-4 text-sm text-muted-foreground">
            {displayed.length} of {filteredSorted.length}
          </span>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="my-auto shrink-0 text-sm font-medium text-muted-foreground">Column:</span>
              <ColumnSelector options={columnOptions} visible={columnVisibility} setVisible={setColumnVisibility} />
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <span className="my-auto shrink-0 text-sm font-medium text-muted-foreground">Filter:</span>
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
              <Select value={filters.schedule} onValueChange={(v) => handleFilterChange("schedule", v)}>
                <SelectTrigger className="w-[170px] justify-center">
                  <SelectValue placeholder="All schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All schedule</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="unscheduled">Unscheduled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(v) => handleFilterChange("status", v)}>
                <SelectTrigger className="w-[170px] justify-center">
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">From:</span>
                <Input
                  type="date"
                  value={filters.from}
                  onChange={(e) => handleFilterChange("from", e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">To:</span>
                <Input
                  type="date"
                  value={filters.to}
                  onChange={(e) => handleFilterChange("to", e.target.value)}
                  className="h-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10 text-neutral-600 dark:text-neutral-300">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2 flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Punch logs
            </CardTitle>
          </div>
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
                        className="text-center text-nowrap cursor-pointer"
                        onClick={() => requestSort(value)}
                      >
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
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton rows={6} cols={columnVisibility.length + 1} />
                ) : displayed.length ? (
                  <AnimatePresence>
                    {displayed.map((log) => (
                      <TimelogRow
                        key={log.id}
                        log={log}
                        columnVisibility={columnVisibility}
                        onSchedule={(list) => {
                          setSchedForDialog(list);
                          setSchedDialogOpen(true);
                        }}
                        onRequestOT={(l) => {
                          setOtForLog(l);
                          setOtMaxHours(parseFloat(l.otHours) || 0);
                          setOtHoursEdit(l.otHours === "0.00" ? "" : l.otHours);
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
                    <TableCell colSpan={columnVisibility.length + 1} className="h-24 text-center">
                      No logs match the selected filters.
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
              <Button size="sm" variant="outline" className="flex gap-1" disabled={page === 1} onClick={() => setPage(1)}>
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
                className="flex gap-1"
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
                  Load more ({Math.min(rowsPerPage + defaultRowsPerPage, filteredSorted.length)}/{filteredSorted.length})
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
        setOpen={setOtDialogOpen}
        icon={Send}
        title="Request Overtime Approval"
        subtitle={otForLog && `For ${safeDate(otForLog.timeIn)} (${otForLog.otHours} h OT)`}
        loading={otSubmitting}
        primaryLabel="Submit"
        onSubmit={submitOT}
      >
        {otForLog && (
          <div className="space-y-4 text-sm">
            <div className="space-y-1">
              <label className="font-medium">OT Hours</label>
              <Input
                type="number"
                min="0"
                step="0.25"
                max={otMaxHours}
                value={otHoursEdit}
                onChange={(e) => setOtHoursEdit(e.target.value)}
                className="w-32"
              />
              {!!otMaxHours && <p className="text-xs text-muted-foreground">Maximum allowed: {otMaxHours}</p>}
            </div>
            <div className="space-y-1">
              <label className="font-medium">Approver</label>
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
            <div className="space-y-1">
              <label className="font-medium">Reason (optional)</label>
              <Textarea value={otReason} onChange={(e) => setOtReason(e.target.value)} placeholder="Brief reason" />
            </div>
          </div>
        )}
      </FormDialog>
      <ScheduleDialog open={schedDialogOpen} onOpenChange={setSchedDialogOpen} scheduleList={schedForDialog} />
      <LocationDialog open={locDialogOpen} onOpenChange={setLocDialogOpen} list={locDialogList} />
    </div>
  );
}
function TimelogRow({ log, columnVisibility, onSchedule, onRequestOT, onDelete, onLocation }) {
  const locIn = getLocation(log, "in");
  const locOut = getLocation(log, "out");
  return (
    <motion.tr
      key={log.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="border-b hover:bg-muted/50"
    >
      {columnVisibility.includes("id") && <TableCell className="font-mono text-xs text-center">{log.id}</TableCell>}
      {columnVisibility.includes("schedule") && (
        <TableCell className="text-center text-xs">
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-slate-100 text-xs"
            onClick={() => onSchedule(log.scheduleList)}
          >
            {log.isScheduled ? "Yes" : "No"}
          </Button>
        </TableCell>
      )}
      {columnVisibility.includes("locationRestricted") && (
        <TableCell className="text-center text-xs">
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
            disabled={!log.isLocRestricted}
            onClick={() => onLocation(log.locList)}
          >
            {log.isLocRestricted ? "Yes" : "No"}
          </Button>
        </TableCell>
      )}
      {columnVisibility.includes("dateTimeIn") && (
        <TableCell className="text-nowrap text-center text-xs">{safeDateTime(log.timeIn)}</TableCell>
      )}
      {columnVisibility.includes("dateTimeOut") && (
        <TableCell className="text-nowrap text-center text-xs">{safeDateTime(log.timeOut)}</TableCell>
      )}
      {columnVisibility.includes("duration") && <TableCell className="text-nowrap text-center text-xs">{log.duration}</TableCell>}
      {columnVisibility.includes("coffee") && <TableCell className="text-nowrap text-center text-xs">{log.coffeeMins}</TableCell>}
      {columnVisibility.includes("lunch") && <TableCell className="text-nowrap text-center text-xs">{log.lunchMins}</TableCell>}
      {columnVisibility.includes("ot") && <TableCell className="text-nowrap text-center text-xs">{log.otHours}</TableCell>}
      {columnVisibility.includes("otStatus") && (
        <TableCell className="text-nowrap text-center text-xs">
          {log.otStatus === "No Approval" ? (
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-slate-100 text-xs p-1.5"
              onClick={() => onRequestOT(log)}
            >
              Request
            </Button>
          ) : (
            log.otStatus
          )}
        </TableCell>
      )}
      {columnVisibility.includes("late") && <TableCell className="text-nowrap text-center text-xs">{log.lateHours}</TableCell>}
      {columnVisibility.includes("deviceIn") && (
        <TableCell className="text-center text-xs">
          {log.fullDevIn
            .split(",")
            .map((p) => truncate(p.trim()))
            .join(" / ")}
        </TableCell>
      )}
      {columnVisibility.includes("deviceOut") && (
        <TableCell className="text-center text-xs">
          {log.fullDevOut
            .split(",")
            .map((p) => truncate(p.trim()))
            .join(" / ")}
        </TableCell>
      )}
      {columnVisibility.includes("locationIn") && (
        <TableCell className="text-center text-xs">
          {locIn.lat != null ? (
            <Button className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 leading-tight text-xs">
              <a
                href={`https://www.google.com/maps?q=${locIn.lat},${locIn.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex flex-col items-center"
              >
                <span className="text-xs">{locIn.lat.toFixed(5)}</span>
                <span className="text-xs">{locIn.lng.toFixed(5)}</span>
              </a>
            </Button>
          ) : (
            locIn.txt
          )}
        </TableCell>
      )}
      {columnVisibility.includes("locationOut") && (
        <TableCell className="text-center text-xs">
          {locOut.lat != null ? (
            <Button className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 leading-tight">
              <a
                href={`https://www.google.com/maps?q=${locOut.lat},${locOut.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex flex-col items-center"
              >
                <span className="text-xs">{locOut.lat.toFixed(5)}</span>
                <span className="text-xs">{locOut.lng.toFixed(5)}</span>
              </a>
            </Button>
          ) : (
            locOut.txt
          )}
        </TableCell>
      )}
      {columnVisibility.includes("period") && (
        <TableCell className="text-nowrap text-center text-xs">{log.periodHours}</TableCell>
      )}
      {columnVisibility.includes("status") && (
        <TableCell className="text-nowrap text-center text-xs">{log.status ? "Active" : "Completed"}</TableCell>
      )}
      <TableCell className="text-center text-xs">{!log.status && <DeleteBtn onClick={() => onDelete(log)} />}</TableCell>
    </motion.tr>
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
