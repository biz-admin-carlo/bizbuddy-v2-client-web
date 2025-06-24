// components/Dashboard/DashboardContent/Settings/Admin/ManageTimeLogs.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Clock, Filter, RefreshCw, Download, ChevronUp, ChevronDown, Search, Calendar, Check, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  if (!(tmpl.assignedToAll || tmpl.assignedUserId === userId)) return false;
  const d = new Date(isoDate);
  if (d < new Date(tmpl.startDate)) return false;
  if (tmpl.endDate && d > new Date(tmpl.endDate)) return false;
  const byDay = tmpl.recurrencePattern.match(/BYDAY=([^;]+)/i)?.[1] || "";
  return byDay.split(",").filter(Boolean).includes(JS_DAY_TO_RRULE[d.getUTCDay()]);
};

function ManageTimelogs() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [timelogs, setTimelogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [defaultHours, setDefaultHours] = useState(8);
  const [minLunchMins, setMinLunchMins] = useState(60);
  const [companyName, setCompanyName] = useState("");

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    employeeIds: ["all"],
    departmentId: "all",
    from: "",
    to: "",
    status: "all",
  });

  const [sortConfig, setSortConfig] = useState({
    key: "dateTimeIn",
    direction: "descending",
  });

  const [schedDialogOpen, setSchedDialogOpen] = useState(false);
  const [scheduleList, setScheduleList] = useState([]);
  const [otDialogOpen, setOtDialogOpen] = useState(false);
  const [otViewData, setOtViewData] = useState(null);

  const [columnVisibility, setColumnVisibility] = useState([
    "id",
    "schedule",
    "employee",
    "dateTimeIn",
    "dateTimeOut",
    "duration",
    "coffee",
    "lunch",
    "ot",
    "otStatus",
    "late",
    "deviceIn",
    "deviceOut",
    "locationIn",
    "locationOut",
    "period",
    "status",
  ]);

  const columnOptions = [
    { value: "id", label: "Timelog ID" },
    { value: "schedule", label: "Schedule" },
    { value: "employee", label: "Employee" },
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

  const sortOptions = [
    { key: "id", label: "Timelog ID" },
    { key: "schedule", label: "Schedule" },
    { key: "employee", label: "Employee" },
    { key: "dateTimeIn", label: "DateTimeIn" },
    { key: "dateTimeOut", label: "DateTimeOut" },
    { key: "duration", label: "Duration" },
    { key: "coffee", label: "Coffee" },
    { key: "lunch", label: "Lunch" },
    { key: "ot", label: "OT" },
    { key: "otStatus", label: "OT Status" },
    { key: "late", label: "Late" },
    { key: "deviceIn", label: "Device In" },
    { key: "deviceOut", label: "Device Out" },
    { key: "locationIn", label: "Location In" },
    { key: "locationOut", label: "Location Out" },
    { key: "period", label: "Period" },
    { key: "status", label: "Status" },
  ];

  const toggleColumn = (c) => setColumnVisibility((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const bootstrap = useCallback(async () => {
    try {
      const [cSet, prof, emps, depts, tmpl] = await Promise.all([
        fetch(`${API_URL}/api/company-settings/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/account/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/employee?all=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/departments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/shiftschedules?all=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [cJ, pJ, eJ, dJ, tJ] = await Promise.all([cSet.json(), prof.json(), emps.json(), depts.json(), tmpl.json()]);

      if (cSet.ok) {
        setDefaultHours(cJ.data?.defaultShiftHours ?? 8);
        const raw = cJ.data?.minimumLunchMinutes;
        setMinLunchMins(raw === null ? 0 : raw ?? 60);
      }

      if (pJ?.data?.company?.name) setCompanyName(pJ.data.company.name.replace(/\s+/g, "_"));
      if (eJ?.data) setEmployees(eJ.data);
      if (dJ?.data) setDepartments(dJ.data);
      if (tJ?.data) setShiftTemplates(tJ.data);
    } catch (e) {
      console.error(e);
    }
  }, [API_URL, token]);

  useEffect(() => {
    if (token) bootstrap();
  }, [token]);

  const fetchTimelogs = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.departmentId !== "all") qs.append("departmentId", filters.departmentId);
      if (filters.from) qs.append("from", filters.from);
      if (filters.to) qs.append("to", filters.to);
      if (filters.status !== "all") qs.append("status", filters.status);
      if (filters.employeeIds.length === 1 && filters.employeeIds[0] !== "all") qs.append("employeeId", filters.employeeIds[0]);

      const [tlRes, otRes] = await Promise.all([
        fetch(`${API_URL}/api/timelogs?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/overtime`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const [tlJ, otJ] = await Promise.all([tlRes.json(), otRes.json()]);
      if (!tlRes.ok) throw new Error(tlJ.error || "Timelog fetch failed");
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

        const grossMins = t.timeIn && t.timeOut ? diffMins(t.timeIn, t.timeOut) : 0;
        const lunchDeduct = minLunchMins ? Math.max(lunchMinsNum, minLunchMins) : lunchMinsNum;
        const netMins = grossMins - lunchDeduct - excessCoffeeMins;

        let workInside, rawOtMins, lateMins;
        lateMins = 0;
        const defaultShiftMins = defaultHours * 60;
        const effectiveCapUnscheduled = Math.max(0, defaultShiftMins - minLunchMins);

        if (isScheduled && firstSched?.shift?.startTime && firstSched?.shift?.endTime) {
          const base = t.timeIn ? new Date(t.timeIn) : new Date(`${dateKey}T00:00:00`);
          const ssUTC = new Date(firstSched.shift.startTime);
          const seUTC = new Date(firstSched.shift.endTime);

          const shiftStart = new Date(base);
          shiftStart.setHours(ssUTC.getUTCHours(), ssUTC.getUTCMinutes(), 0, 0);
          const shiftEnd = new Date(base);
          shiftEnd.setHours(seUTC.getUTCHours(), seUTC.getUTCMinutes(), 0, 0);
          if (shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);

          const schedDur = diffMins(shiftStart.toISOString(), shiftEnd.toISOString());
          lateMins = t.timeIn && new Date(t.timeIn) > shiftStart ? diffMins(shiftStart.toISOString(), t.timeIn) : 0;

          const insideRaw = Math.max(0, schedDur - lateMins - lunchDeduct - excessCoffeeMins);
          workInside = Math.min(insideRaw, netMins);

          rawOtMins = t.timeOut && new Date(t.timeOut) > shiftEnd ? diffMins(shiftEnd.toISOString(), t.timeOut) : 0;
        } else {
          workInside = Math.min(netMins, effectiveCapUnscheduled);
          rawOtMins = Math.max(0, netMins - effectiveCapUnscheduled);
        }

        const latestOt = otMap[t.id] ?? null;
        const approvedMins = latestOt && latestOt.status === "approved" && latestOt.requestedHours ? Number(latestOt.requestedHours) * 60 : 0;
        const usedOtMins = approvedMins > 0 ? Math.min(approvedMins, rawOtMins) : rawOtMins;

        let otStatus = "—";
        if (latestOt) otStatus = latestOt.status;
        else if (!isScheduled || rawOtMins > 0) otStatus = "No Approval";

        const periodMins = workInside + approvedMins;

        return {
          ...t,
          employeeName: t.email,
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
        };
      });

      setTimelogs(enriched);
    } catch (err) {
      console.error(err);
      toast.message(err.message);
    }
    setLoading(false);
  }, [API_URL, token, filters, shiftTemplates, defaultHours, minLunchMins]);

  useEffect(() => {
    if (!token) return;
    fetchTimelogs();
  }, [token, filters.departmentId, filters.from, filters.to, filters.status, shiftTemplates, defaultHours, minLunchMins]);

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([bootstrap(), fetchTimelogs()]);
    toast.message("Data refreshed");
    setRefreshing(false);
  };

  const displayed = useMemo(() => {
    const getVal = (item, key) => {
      switch (key) {
        case "id":
          return item.id;
        case "schedule":
          return item.isScheduled ? 1 : 0;
        case "employee":
          return item.employeeName?.toLowerCase() || "";
        case "dateTimeIn":
          return item.timeIn ? new Date(item.timeIn).getTime() : 0;
        case "dateTimeOut":
          return item.timeOut ? new Date(item.timeOut).getTime() : 0;
        case "duration":
          return parseFloat(item.duration) || 0;
        case "coffee":
          return parseFloat(item.coffeeMins) || 0;
        case "lunch":
          return parseFloat(item.lunchMins) || 0;
        case "ot":
          return parseFloat(item.otHours) || 0;
        case "otStatus":
          return item.otStatus?.toLowerCase() || "";
        case "late":
          return parseFloat(item.lateHours) || 0;
        case "deviceIn":
          return item.fullDevIn?.toLowerCase() || "";
        case "deviceOut":
          return item.fullDevOut?.toLowerCase() || "";
        case "locationIn":
          return item.locIn.txt?.toLowerCase() || "";
        case "locationOut":
          return item.locOut.txt?.toLowerCase() || "";
        case "period":
          return parseFloat(item.periodHours) || 0;
        case "status":
          return item.status?.toLowerCase() || "";
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

  const exportCSV = () => {
    if (!displayed.length) {
      toast.message("No rows to export");
      return;
    }
    setExporting(true);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const header = [
      "ID",
      "Schedule",
      "Employee",
      "Email",
      "Department",
      "DateTime In",
      "DateTime Out",
      "Duration(h)",
      "Coffee(h)",
      "Lunch(h)",
      "OT(h)",
      "OT Status",
      "Late(h)",
      "Device In",
      "Device Out",
      "Location In",
      "Location Out",
      "Period(h)",
      "Status",
    ].map(wrap);
    const body = displayed.map((r) =>
      [
        r.id,
        r.isScheduled ? "Yes" : "No",
        r.employeeName,
        r.email,
        r.department || "—",
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
        r.locIn.txt,
        r.locOut.txt,
        r.periodHours,
        r.status,
      ].map(wrap)
    );
    const csv = [header, ...body].map((row) => row.join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${companyName || "Timelogs"}_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.message("CSV exported");
    setExporting(false);
  };

  const IconBtn = ({ icon: Icon, tooltip, spinning, ...props }) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
            {...props}
          >
            <Icon className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const MultiEmployeeSelect = () => {
    const allChecked = filters.employeeIds.includes("all");
    const toggle = (id) => {
      if (id === "all") return setFilters({ ...filters, employeeIds: ["all"] });
      let list = filters.employeeIds.filter((x) => x !== "all");
      list = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      if (!list.length) list = ["all"];
      setFilters({ ...filters, employeeIds: list });
    };
    const label = allChecked ? "All employees" : `${filters.employeeIds.length} selected`;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-between">
            {label}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 space-y-1" align="start">
          <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => toggle("all")}>
            <Checkbox checked={allChecked} />
            <span>All employees</span>
            {allChecked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {employees.map((e) => {
              const id = e.id;
              const checked = filters.employeeIds.includes(id);
              return (
                <div key={id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => toggle(id)}>
                  <Checkbox checked={checked} />
                  <span className="truncate">{e.email}</span>
                  {checked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const labelClass = "my-auto shrink-0 text-sm font-medium text-muted-foreground";

  return (
    <div className="max-w-full mx-auto p-4 lg:px-6 px-2 space-y-8">
      <Toaster position="top-center" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-7 w-7 text-orange-500" />
            Manage Timelogs
          </h2>
          <p className="text-muted-foreground mt-1">View and export employee time records</p>
        </div>
        <div className="flex gap-2">
          <IconBtn
            className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black"
            icon={RefreshCw}
            tooltip="Refresh data"
            spinning={refreshing}
            onClick={refreshAll}
          />
          <IconBtn
            className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black"
            icon={Download}
            tooltip="Export CSV"
            spinning={exporting}
            onClick={exportCSV}
            disabled={exporting || !displayed.length}
          />
        </div>
      </div>

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
            Showing {displayed.length} of {timelogs.length} entries
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
              {sortOptions.map(({ key, label }) => (
                <TooltipProvider key={key} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSortConfig({
                            key,
                            direction: sortConfig.key === key && sortConfig.direction === "ascending" ? "descending" : "ascending",
                          })
                        }
                        className={sortConfig.key === key ? "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" : ""}
                      >
                        {label}
                        {sortConfig.key === key &&
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
              <MultiEmployeeSelect />
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
              <div className="min-w-[160px]">
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
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">From:</span>
                <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="h-8" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">To:</span>
                <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="h-8" />
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
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
                <Clock className="h-5 w-5" />
              </div>
              Timelogs
            </CardTitle>
            <CardDescription>All recorded time entries</CardDescription>
          </div>
          <div className="text-sm text-muted-foreground mt-2 md:mt-1">{displayed.length} entries</div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columnVisibility.includes("id") && <TableHead className="text-center text-nowrap w-[200px]">Timelog ID</TableHead>}
                  {columnVisibility.includes("schedule") && <TableHead className="text-center text-nowrap">Schedule</TableHead>}
                  {columnVisibility.includes("employee") && <TableHead className="text-center text-nowrap">Employee</TableHead>}
                  {columnVisibility.includes("dateTimeIn") && <TableHead className="text-center text-nowrap">DateTimeIn</TableHead>}
                  {columnVisibility.includes("dateTimeOut") && <TableHead className="text-center text-nowrap">DateTimeOut</TableHead>}
                  {columnVisibility.includes("duration") && <TableHead className="text-center text-nowrap">Duration(h)</TableHead>}
                  {columnVisibility.includes("coffee") && <TableHead className="text-center text-nowrap">Coffee(h)</TableHead>}
                  {columnVisibility.includes("lunch") && <TableHead className="text-center text-nowrap">Lunch(h)</TableHead>}
                  {columnVisibility.includes("ot") && <TableHead className="text-center text-nowrap">OT(h)</TableHead>}
                  {columnVisibility.includes("otStatus") && <TableHead className="text-center text-nowrap">OT Status</TableHead>}
                  {columnVisibility.includes("late") && <TableHead className="text-center text-nowrap">Late(h)</TableHead>}
                  {columnVisibility.includes("deviceIn") && <TableHead className="text-center text-nowrap">Device In</TableHead>}
                  {columnVisibility.includes("deviceOut") && <TableHead className="text-center text-nowrap">Device Out</TableHead>}
                  {columnVisibility.includes("locationIn") && <TableHead className="text-center text-nowrap">Location In</TableHead>}
                  {columnVisibility.includes("locationOut") && <TableHead className="text-center text-nowrap">Location Out</TableHead>}
                  {columnVisibility.includes("period") && <TableHead className="text-center text-nowrap">Period(h)</TableHead>}
                  {columnVisibility.includes("status") && <TableHead className="text-center text-nowrap">Status</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <TableRow key={i}>
                      {columnVisibility.map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : displayed.length ? (
                  <AnimatePresence>
                    {displayed.map((t) => (
                      <motion.tr
                        key={t.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        {columnVisibility.includes("id") && <TableCell className="font-mono text-xs text-center">{t.id}</TableCell>}
                        {columnVisibility.includes("schedule") && (
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                              onClick={() => {
                                setScheduleList(t.scheduleList);
                                setSchedDialogOpen(true);
                              }}
                            >
                              {t.isScheduled ? "Yes" : "No"}
                            </Button>
                          </TableCell>
                        )}
                        {columnVisibility.includes("employee") && <TableCell className="text-left text-nowrap capitalize">{t.employeeName}</TableCell>}
                        {columnVisibility.includes("dateTimeIn") && <TableCell className="text-center text-nowrap">{safeDateTime(t.timeIn)}</TableCell>}
                        {columnVisibility.includes("dateTimeOut") && <TableCell className="text-center text-nowrap">{safeDateTime(t.timeOut)}</TableCell>}
                        {columnVisibility.includes("duration") && <TableCell className="text-center text-nowrap">{t.duration}</TableCell>}
                        {columnVisibility.includes("coffee") && <TableCell className="text-center text-nowrap">{t.coffeeMins}</TableCell>}
                        {columnVisibility.includes("lunch") && <TableCell className="text-center text-nowrap">{t.lunchMins}</TableCell>}
                        {columnVisibility.includes("ot") && <TableCell className="text-center text-nowrap">{t.otHours}</TableCell>}
                        {columnVisibility.includes("otStatus") && (
                          <TableCell className="text-center text-nowrap">
                            <Button
                              size="sm"
                              className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-2"
                              disabled={!t.overtimeRec}
                              onClick={() => {
                                if (!t.overtimeRec) return;
                                setOtViewData({ ot: t.overtimeRec, log: t });
                                setOtDialogOpen(true);
                              }}
                            >
                              {t.otStatus}
                            </Button>
                          </TableCell>
                        )}
                        {columnVisibility.includes("late") && <TableCell className="text-center">{t.lateHours}</TableCell>}
                        {columnVisibility.includes("deviceIn") && (
                          <TableCell className="text-center text-xs">
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex flex-col items-center leading-tight cursor-default">
                                    {(t.fullDevIn ?? "—").split(",").map((p, i) => (
                                      <span key={i}>{truncate(p.trim())}</span>
                                    ))}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="break-all max-w-xs whitespace-pre-wrap">{t.fullDevIn || "—"}</TooltipContent>
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
                                    {(t.fullDevOut ?? "—").split(",").map((p, i) => (
                                      <span key={i}>{truncate(p.trim())}</span>
                                    ))}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="break-all max-w-xs whitespace-pre-wrap">{t.fullDevOut || "—"}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        )}
                        {columnVisibility.includes("locationIn") && (
                          <TableCell className="text-center">
                            {t.locIn.lat != null ? (
                              <Button className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 leading-tight">
                                <a
                                  href={`https://www.google.com/maps?q=${t.locIn.lat},${t.locIn.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs flex flex-col items-center"
                                >
                                  <span>{t.locIn.lat.toFixed(5)}</span>
                                  <span>{t.locIn.lng.toFixed(5)}</span>
                                </a>
                              </Button>
                            ) : (
                              t.locIn.txt
                            )}
                          </TableCell>
                        )}
                        {columnVisibility.includes("locationOut") && (
                          <TableCell className="text-center">
                            {t.locOut.lat != null ? (
                              <Button className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 leading-tight">
                                <a
                                  href={`https://www.google.com/maps?q=${t.locOut.lat},${t.locOut.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs flex flex-col items-center"
                                >
                                  <span>{t.locOut.lat.toFixed(5)}</span>
                                  <span>{t.locOut.lng.toFixed(5)}</span>
                                </a>
                              </Button>
                            ) : (
                              t.locOut.txt
                            )}
                          </TableCell>
                        )}
                        {columnVisibility.includes("period") && <TableCell className="text-center">{t.periodHours}</TableCell>}
                        {columnVisibility.includes("status") && (
                          <TableCell className="text-center">{t.status === "active" ? "Active" : "Completed"}</TableCell>
                        )}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columnVisibility.length} className="h-28 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Clock className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p>No timelogs match the selected filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ScheduleDialog open={schedDialogOpen} onOpenChange={setSchedDialogOpen} scheduleList={scheduleList} />

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
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Request ID</div>
                <div>{otViewData.ot.id}</div>
                <div>Status</div>
                <div className="capitalize">{otViewData.ot.status}</div>
                <div>Requested At</div>
                <div>
                  {safeDate(otViewData.ot.createdAt)} {safeTime(otViewData.ot.createdAt)}
                </div>
                <div>OT Hours</div>
                <div>{otViewData.log.otHours}</div>
                <div>Time In</div>
                <div>{safeTime(otViewData.log.timeIn)}</div>
                <div>Time Out</div>
                <div>{safeTime(otViewData.log.timeOut)}</div>
                <div>Requester Reason</div>
                <div>{otViewData.ot.requesterReason || "—"}</div>
                <div>Approver Comments</div>
                <div>{otViewData.ot.approverComments || "—"}</div>
              </div>
              <div className="pt-4">
                <div className="text-sm font-medium mb-1">Raw OT Record</div>
                <pre className="bg-muted p-2 rounded-md text-xs overflow-auto">{JSON.stringify(otViewData.ot, null, 2)}</pre>
              </div>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-4">No data</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const NUM2DAY = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const parseRRuleDays = (str) => {
  const m = str.match(/BYDAY=([^;]+)/i);
  return m ? m[1].split(",") : [];
};
const fmtLocalTime = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fmtUTCTime = (d) =>
  new Date(d).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

function ScheduleDialog({ open, onOpenChange, scheduleList }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-2 dark:border-white/30">
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
          <p className="text-center text-muted-foreground py-4">No schedule details.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ManageTimelogs;
