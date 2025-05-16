/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  Filter,
  RefreshCw,
  Download,
  ChevronUp,
  ChevronDown,
  Search,
  Calendar,
  Users,
  CheckCircle2,
  Check,
  MapPin,
  Smartphone,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";

/* ────────── shadcn/ui ────────── */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

/* ────────── helpers ────────── */

const fmtLocalDateTime = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const diffHours = (tin, tout) => (!tin || !tout ? "—" : ((new Date(tout) - new Date(tin)) / 36e5).toFixed(2));

const coffeeMinutes = (arr = []) => arr.reduce((m, b) => (b.start && b.end ? m + (new Date(b.end) - new Date(b.start)) / 60000 : m), 0).toFixed(0);

const lunchMinutes = (l) => (l && l.start && l.end ? ((new Date(l.end) - new Date(l.start)) / 60000).toFixed(0) : 0);

const fmtDevice = (d) => {
  if (!d) return "—";
  if (typeof d === "string") return d;
  if (d.model) return d.model;
  return JSON.stringify(d);
};

const fmtLoc = (loc) =>
  loc && loc.latitude != null && loc.longitude != null ? `${Number(loc.latitude).toFixed(5)}, ${Number(loc.longitude).toFixed(5)}` : "—";

/* ────────── CSV ────────── */

const wrap = (v) => `"${String(v).replace(/"/g, '""')}"`;

const buildCSV = (rows) => {
  const header = [
    "ID",
    "Employee",
    "Email",
    "Department",
    "Time In",
    "Time Out",
    "Hours",
    "Coffee (min)",
    "Lunch (min)",
    "Device In",
    "Device Out",
    "Location In",
    "Location Out",
    "Is Active",
    "Status",
  ].map(wrap);

  const body = rows.map((r) => {
    const deviceIn = `${fmtDevice(r.deviceIn?.manufacturer)}, ${fmtDevice(r.deviceIn?.deviceName)}`;
    const deviceOut = `${fmtDevice(r.deviceOut?.manufacturer)}, ${fmtDevice(r.deviceOut?.deviceName)}`;

    return [
      r.id,
      r.employeeName,
      r.email,
      r.department || "—",
      fmtLocalDateTime(r.timeIn),
      fmtLocalDateTime(r.timeOut),
      diffHours(r.timeIn, r.timeOut),
      r.coffeeMins,
      r.lunchMins,
      deviceIn,
      deviceOut,
      fmtLoc(r.locIn),
      fmtLoc(r.locOut),
      r.status === "active" ? "Yes" : "No",
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
    ].map(wrap);
  });

  return [header, ...body].map((row) => row.join(",")).join("\r\n");
};

/* ────────── component ────────── */

function ManageTimelogs() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  /* data */
  const [timelogs, setTimelogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [companyName, setCompanyName] = useState("");

  /* ui */
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  /* filters */
  const [filters, setFilters] = useState({
    search: "",
    employeeIds: ["all"],
    departmentId: "all",
    from: "",
    to: "",
    status: "all",
  });

  /* sort */
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "descending",
  });

  /* ────────── fetches ────────── */

  useEffect(() => {
    if (!token) return;
    fetchEmployees();
    fetchDepartments();
    fetchProfile();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchTimelogs();
  }, [token, filters.departmentId, filters.from, filters.to, filters.status]);

  async function fetchProfile() {
    try {
      const res = await fetch(`${API_URL}/api/account/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (res.ok && j.data?.company?.name) setCompanyName(j.data.company.name.replace(/\s+/g, "_"));
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchEmployees() {
    try {
      const res = await fetch(`${API_URL}/api/employee?all=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (res.ok) setEmployees(j.data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchDepartments() {
    try {
      const res = await fetch(`${API_URL}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (res.ok) setDepartments(j.data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchTimelogs() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.departmentId !== "all") qs.append("departmentId", filters.departmentId);
      if (filters.from) qs.append("from", filters.from);
      if (filters.to) qs.append("to", filters.to);
      if (filters.status !== "all") qs.append("status", filters.status);
      if (filters.employeeIds.length === 1 && filters.employeeIds[0] !== "all") qs.append("employeeId", filters.employeeIds[0]);

      const res = await fetch(`${API_URL}/api/timelogs?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (res.ok) {
        const enriched = (j.data || []).map((t) => ({
          ...t,
          coffeeMins: coffeeMinutes(t.coffeeBreaks),
          lunchMins: lunchMinutes(t.lunchBreak),
        }));
        setTimelogs(enriched);
      } else toast.message(j.error || "Failed to fetch timelogs.");
    } catch (e) {
      console.error(e);
      toast.message("Failed to fetch timelogs.");
    }
    setLoading(false);
  }

  const refreshAll = async () => {
    setRefreshing(true);
    await fetchTimelogs();
    toast.message("Data refreshed");
    setRefreshing(false);
  };

  /* ────────── filter + sort ────────── */

  const displayed = useMemo(() => {
    let data = [...timelogs];

    if (!filters.employeeIds.includes("all")) data = data.filter((t) => filters.employeeIds.includes(t.userId));

    if (filters.search) {
      const q = filters.search.toLowerCase();
      data = data.filter((t) => t.employeeName?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q));
    }

    if (sortConfig.key) {
      data.sort((a, b) => {
        let aVal, bVal;
        switch (sortConfig.key) {
          case "employee":
            aVal = a.employeeName?.toLowerCase() || "";
            bVal = b.employeeName?.toLowerCase() || "";
            break;
          case "date":
            aVal = new Date(a.timeIn).getTime();
            bVal = new Date(b.timeIn).getTime();
            break;
          case "hours":
            aVal = parseFloat(diffHours(a.timeIn, a.timeOut)) || 0;
            bVal = parseFloat(diffHours(b.timeIn, b.timeOut)) || 0;
            break;
          default:
            aVal = 0;
            bVal = 0;
        }
        if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [timelogs, filters.employeeIds, filters.search, sortConfig]);

  /* ────────── CSV export ────────── */

  const exportCSV = () => {
    if (!displayed.length) {
      toast.message("No rows to export");
      return;
    }
    setExporting(true);
    try {
      const d = new Date();
      const today = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const fileName = `${companyName || "Timelogs"}_${today}.csv`;

      const blob = new Blob([buildCSV(displayed)], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.message("CSV exported");
    } catch (e) {
      console.error(e);
      toast.message("Export failed");
    }
    setExporting(false);
  };

  /* ────────── multi-employee popover ────────── */

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
              const name = (`${e.profile?.firstName || ""} ${e.profile?.lastName || ""}`.trim() || e.email).slice(0, 38) || "Unnamed";
              const checked = filters.employeeIds.includes(id);
              return (
                <div key={id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => toggle(id)}>
                  <Checkbox checked={checked} />
                  <span className="truncate">{name}</span>
                  {checked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  /* ────────── render ────────── */

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      <Toaster position="top-center" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-7 w-7 text-orange-500" />
            Manage Timelogs
          </h2>
          <p className="text-muted-foreground mt-1">View and export employee time records</p>
        </div>

        <div className="flex gap-2">
          {/* refresh */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refreshAll}
                  disabled={refreshing}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* CSV export */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={exportCSV}
                  disabled={exporting || !displayed.length}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  <Download className={`h-4 w-4 ${exporting ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export CSV</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* FILTERS */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Filter className="h-5 w-5" />
            </div>
            Search & Filter
          </CardTitle>
          <CardDescription>Filter timelogs by employee, date or status</CardDescription>
        </CardHeader>

        <CardContent>
          {/* row 1 */}
          <div className="flex flex-wrap gap-3 mb-4">
            {/* search */}
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-center border rounded-md px-3 py-2 bg-black/5 dark:bg-white/5">
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Search name or email"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="border-0 h-8 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <MultiEmployeeSelect />

            {/* department */}
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

            {/* status */}
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
          </div>

          {/* row 2 – date range */}
          <div className="flex flex-wrap gap-3">
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
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2 flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
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
                  <TableHead className="w-[220px]">ID</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() =>
                      setSortConfig({
                        key: "employee",
                        direction: sortConfig.key === "employee" && sortConfig.direction === "ascending" ? "descending" : "ascending",
                      })
                    }
                  >
                    <div className="flex items-center">
                      Employee{" "}
                      {sortConfig.key === "employee" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() =>
                      setSortConfig({
                        key: "date",
                        direction: sortConfig.key === "date" && sortConfig.direction === "ascending" ? "descending" : "ascending",
                      })
                    }
                  >
                    <div className="flex items-center">
                      Time&nbsp;In{" "}
                      {sortConfig.key === "date" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </div>
                  </TableHead>
                  <TableHead>Time&nbsp;Out</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() =>
                      setSortConfig({
                        key: "hours",
                        direction: sortConfig.key === "hours" && sortConfig.direction === "ascending" ? "descending" : "ascending",
                      })
                    }
                  >
                    <div className="flex items-center">
                      Hours{" "}
                      {sortConfig.key === "hours" &&
                        (sortConfig.direction === "ascending" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                    </div>
                  </TableHead>
                  <TableHead>Coffee&nbsp;(min)</TableHead>
                  <TableHead>Lunch&nbsp;(min)</TableHead>
                  <TableHead>
                    <Smartphone className="h-4 w-4" /> In
                  </TableHead>
                  <TableHead>
                    <Smartphone className="h-4 w-4" /> Out
                  </TableHead>
                  <TableHead>
                    <MapPin className="h-4 w-4" /> In
                  </TableHead>
                  <TableHead>
                    <MapPin className="h-4 w-4" /> Out
                  </TableHead>
                  <TableHead>Is&nbsp;Active</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <TableRow key={i}>
                      {Array(13)
                        .fill(0)
                        .map((__, j) => (
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
                        <TableCell className="font-mono text-xs text-orange-500">{t.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-orange-500" />
                            {t.employeeName}
                          </div>
                        </TableCell>
                        <TableCell>{fmtLocalDateTime(t.timeIn)}</TableCell>
                        <TableCell>{fmtLocalDateTime(t.timeOut)}</TableCell>
                        <TableCell>{diffHours(t.timeIn, t.timeOut)}</TableCell>
                        <TableCell>{t.coffeeMins}</TableCell>
                        <TableCell>{t.lunchMins}</TableCell>
                        <TableCell>
                          {fmtDevice(t.deviceIn?.manufacturer)}, {fmtDevice(t.deviceIn?.deviceName)}
                        </TableCell>
                        <TableCell>
                          {fmtDevice(t.deviceOut?.manufacturer)}, {fmtDevice(t.deviceOut?.deviceName)}
                        </TableCell>
                        <TableCell>
                          {t.locIn && t.locIn.latitude != null && t.locIn.longitude != null ? (
                            <a
                              href={`https://www.google.com/maps?q=${t.locIn.latitude},${t.locIn.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-500 hover:underline"
                            >
                              {fmtLoc(t.locIn)}
                            </a>
                          ) : (
                            fmtLoc(t.locIn)
                          )}
                        </TableCell>
                        <TableCell>
                          {t.locOut && t.locOut.latitude != null && t.locOut.longitude != null ? (
                            <a
                              href={`https://www.google.com/maps?q=${t.locOut.latitude},${t.locOut.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-500 hover:underline"
                            >
                              {fmtLoc(t.locOut)}
                            </a>
                          ) : (
                            fmtLoc(t.locOut)
                          )}
                        </TableCell>

                        {/* Is Active */}
                        <TableCell>
                          {t.status === "active" ? <Badge className="bg-green-500 text-white">Yes</Badge> : <Badge variant="outline">No</Badge>}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {t.status === "active" ? (
                            <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Active</Badge>
                          ) : (
                            <Badge variant="secondary">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={13} className="h-28 text-center">
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
    </div>
  );
}

export default ManageTimelogs;
