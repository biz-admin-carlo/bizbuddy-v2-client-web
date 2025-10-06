// components/Dashboard/DashboardContent/CompanyPanel/Shifts&Schedules/Shifts.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  PlusCircle, 
  Edit3, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Clock, 
  RefreshCw, 
  Filter, 
  Check, 
  Plus,
  Eye,
  Search,
  AlertCircle,
  Info,
  Timer,
  Zap,
  Calendar,
  Target,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

const toUtcIso = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m)).toISOString();
};

const fmtClock = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });

const fmtClockWith12Hour = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" });

// Enhanced date formatting utilities
const formatRelativeTime = (dateStr) => {
  if (!dateStr) return "—";
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
};

const formatFullDateTime = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const totalHours = (a, b) => {
  if (!a || !b) return "—";
  let diff = new Date(b) - new Date(a);
  if (diff < 0) diff += 86400000;
  return (diff / 3600000).toFixed(2);
};

// Enhanced time display with tooltips
const TimeDisplayWithTooltip = ({ time, type }) => {
  const getTimeDefinition = (type) => {
    switch (type) {
      case 'start':
        return "The time when employees should begin their work shift";
      case 'end':
        return "The time when employees should finish their work shift";
      case 'total':
        return "Total duration of the work shift including any break time";
      case 'multiplier':
        return "Pay rate multiplier - affects how overtime and shift differentials are calculated";
      case 'created':
        return "When this shift template was first added to the system";
      case 'updated':
        return "When this shift template was last modified";
      default:
        return "";
    }
  };

  if (!time || time === "—") {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help border-b border-dotted border-muted-foreground">
            {time}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="text-sm">{getTimeDefinition(type)}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Enhanced date display with tooltips
const DateTimeDisplayWithTooltip = ({ dateTime, type }) => {
  const getTimeDefinition = (type) => {
    switch (type) {
      case 'created':
        return "When this shift template was first created in the system";
      case 'updated':
        return "When this shift template was last modified or updated";
      default:
        return "";
    }
  };

  if (!dateTime) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            <div className="text-xs font-medium">{formatRelativeTime(dateTime)}</div>
            <div className="text-xs text-muted-foreground">{formatFullDateTime(dateTime).split(',')[0]}</div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="text-sm space-y-1">
            <div>{getTimeDefinition(type)}</div>
            <div className="text-xs text-muted-foreground border-t pt-1">
              Exact time: {formatFullDateTime(dateTime)}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const columnOptions = [
  { value: "shiftName", label: "Shift Template", essential: true, group: "basic" },
  { value: "startTime", label: "Start Time", essential: true, group: "basic" },
  { value: "endTime", label: "End Time", essential: true, group: "basic" },
  { value: "totalHours", label: "Duration", essential: true, group: "basic" },
  { value: "differentialMultiplier", label: "Pay Multiplier", essential: false, group: "advanced" },
  { value: "createdAt", label: "Created", essential: false, group: "timestamps" },
  { value: "updatedAt", label: "Last Updated", essential: false, group: "timestamps" },
];

export default function Shifts() {
  const { token } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    shiftName: "",
    startTime: "08:00",
    endTime: "17:00",
    differentialMultiplier: "1.0",
  });

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    shiftName: "",
    startTime: "",
    endTime: "",
    differentialMultiplier: "1.0",
  });

  const [showDelete, setShowDelete] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [filters, setFilters] = useState({ name: "" });
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "ascending" });

  // Better default column visibility - show only essential columns by default
  const essentialColumns = columnOptions.filter(c => c.essential).map(c => c.value);
  const [columnVisibility, setColumnVisibility] = useState(essentialColumns);

  useEffect(() => {
    if (token) fetchShifts();
  }, [token]);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/shifts`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      if (r.ok) setShifts(j.data || []);
      else toast.error(j.message || "Failed to fetch shifts.");
    } catch {
      toast.error("Failed to fetch shifts.");
    }
    setLoading(false);
  };

  const refreshShifts = async () => {
    setRefreshing(true);
    await fetchShifts();
    toast.success("Shifts refreshed successfully");
    setRefreshing(false);
  };

  const filteredSorted = useMemo(() => {
    const data = shifts.filter((s) => s.shiftName.toLowerCase().includes(filters.name.toLowerCase()));
    if (sortConfig.key) {
      data.sort((a, b) => {
        const aVal =
          sortConfig.key === "totalHours"
            ? Number(totalHours(a.startTime, a.endTime))
            : sortConfig.key === "differentialMultiplier"
            ? Number(a[sortConfig.key])
            : (a[sortConfig.key] ?? "").toString().toLowerCase();
        const bVal =
          sortConfig.key === "totalHours"
            ? Number(totalHours(b.startTime, b.endTime))
            : sortConfig.key === "differentialMultiplier"
            ? Number(b[sortConfig.key])
            : (b[sortConfig.key] ?? "").toString().toLowerCase();
        if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [shifts, filters, sortConfig]);

  const toggleColumn = (c) => setColumnVisibility((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const MultiColumnSelect = () => {
    const allChecked = columnVisibility.length === columnOptions.length;
    const toggle = (val) => {
      if (val === "all") return setColumnVisibility(allChecked ? [] : columnOptions.map((o) => o.value));
      setColumnVisibility((prev) => (prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]));
    };
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
            <Checkbox checked={allChecked} />
            <span>All columns</span>
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
                  <Checkbox checked={checked} />
                  <span>{opt.label}</span>
                  {checked && <Check className="ml-auto h-4 w-4 text-orange-500" />}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const openCreate = () => {
    setCreateForm({ shiftName: "", startTime: "08:00", endTime: "17:00", differentialMultiplier: "1.0" });
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!createForm.shiftName.trim()) return toast.error("Shift name is required");
    setActionLoading(true);
    try {
      const payload = {
        shiftName: createForm.shiftName.trim(),
        startTime: toUtcIso(createForm.startTime),
        endTime: toUtcIso(createForm.endTime),
        differentialMultiplier: parseFloat(createForm.differentialMultiplier),
      };
      const r = await fetch(`${API}/api/shifts/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (r.status === 201 || r.status === 200) {
        toast.success(j.message || "Shift template created successfully");
        setShowCreate(false);
        fetchShifts();
      } else toast.error(j.message || "Failed to create shift template");
    } catch {
      toast.error("Failed to create shift template");
    }
    setActionLoading(false);
  };

  const openEdit = (s) => {
    setEditForm({
      id: s.id,
      shiftName: s.shiftName,
      startTime: fmtClock(s.startTime),
      endTime: fmtClock(s.endTime),
      differentialMultiplier: String(s.differentialMultiplier),
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.shiftName.trim()) return toast.error("Shift name is required");
    setActionLoading(true);
    try {
      const payload = {
        shiftName: editForm.shiftName.trim(),
        startTime: toUtcIso(editForm.startTime),
        endTime: toUtcIso(editForm.endTime),
        differentialMultiplier: parseFloat(editForm.differentialMultiplier),
      };
      const r = await fetch(`${API}/api/shifts/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (r.ok) {
        toast.success(j.message || "Shift template updated successfully");
        setShowEdit(false);
        fetchShifts();
      } else toast.error(j.message || "Failed to update shift template");
    } catch {
      toast.error("Failed to update shift template");
    }
    setActionLoading(false);
  };

  const openDelete = (s) => {
    setShiftToDelete(s);
    setShowDelete(true);
  };

  const confirmDelete = async () => {
    if (!shiftToDelete) return;
    setActionLoading(true);
    try {
      const r = await fetch(`${API}/api/shifts/${shiftToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (r.ok) {
        toast.success(j.message || "Shift template deleted successfully");
        setShifts((p) => p.filter((x) => x.id !== shiftToDelete.id));
      } else toast.error(j.message || "Failed to delete shift template");
    } catch {
      toast.error("Failed to delete shift template");
    }
    setActionLoading(false);
    setShowDelete(false);
    setShiftToDelete(null);
  };

  const labelClass = "my-auto shrink-0 text-sm font-medium text-muted-foreground";

  // Summary statistics component
  const SummaryStats = ({ data }) => {
    const stats = useMemo(() => {
      const totalShifts = data.length;
      const avgHours = totalShifts ? (data.reduce((sum, s) => sum + parseFloat(totalHours(s.startTime, s.endTime) || 0), 0) / totalShifts).toFixed(1) : '0.0';
      const morningShifts = data.filter(s => {
        const hour = new Date(s.startTime).getUTCHours();
        return hour >= 5 && hour < 12;
      }).length;
      const nightShifts = data.filter(s => {
        const hour = new Date(s.startTime).getUTCHours();
        return hour >= 18 || hour < 5;
      }).length;
      
      return { totalShifts, avgHours, morningShifts, nightShifts };
    }, [data]);

    const getDefinition = (type) => {
      switch (type) {
        case 'total':
          return "Total number of shift templates configured for your company";
        case 'average':
          return "Average duration across all shift templates";
        case 'morning':
          return "Shift templates that start between 5:00 AM and 12:00 PM";
        case 'night':
          return "Shift templates that start after 6:00 PM or before 5:00 AM";
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
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-600">Total Shifts</div>
                  <div className="text-lg font-bold">{stats.totalShifts}</div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="text-sm">{getDefinition('total')}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 cursor-help hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors">
                <div className="p-2 rounded-full bg-green-500/10">
                  <Timer className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-green-600">Avg Duration</div>
                  <div className="text-lg font-bold">{stats.avgHours}h</div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="text-sm">{getDefinition('average')}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 cursor-help hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors">
                <div className="p-2 rounded-full bg-orange-500/10">
                  <Target className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-orange-600">Morning Shifts</div>
                  <div className="text-lg font-bold">{stats.morningShifts}</div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="text-sm">{getDefinition('morning')}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 cursor-help hover:bg-purple-100 dark:hover:bg-purple-950/30 transition-colors">
                <div className="p-2 rounded-full bg-purple-500/10">
                  <Zap className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-purple-600">Night Shifts</div>
                  <div className="text-lg font-bold">{stats.nightShifts}</div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="text-sm">{getDefinition('night')}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  return (
    <div className="max-w-full mx-auto p-4 lg:px-6 px-2 space-y-6">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-7 w-7 text-orange-500" />
            Shift Templates
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage work shift templates for employee scheduling
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link href="/dashboard/company/schedules">
              <Calendar className="h-4 w-4 mr-2" />
              Schedules
            </Link>
          </Button>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={refreshShifts} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh shift templates</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button 
            onClick={openCreate} 
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <SummaryStats data={filteredSorted} />

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
              Showing {filteredSorted.length} of {shifts.length} shifts
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
            <MultiColumnSelect />
          </div>

          {/* Search Filter */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className={labelClass}>
              <Search className="w-4 h-4 mr-1 inline" />
              Search:
            </span>
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shift templates..."
                value={filters.name}
                onChange={(e) => setFilters(p => ({ ...p, name: e.target.value }))}
                className="pl-10 focus:border-orange-500 focus:ring-orange-500/20"
              />
            </div>
            {filters.name && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ name: "" })}
                className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
              >
                Clear Search
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
              <Clock className="h-4 w-4" />
            </div>
            Shift Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {columnOptions
                    .filter((c) => columnVisibility.includes(c.value))
                    .map(({ value, label }) => (
                      <TableHead
                        key={value}
                        className="text-center text-nowrap cursor-pointer font-semibold"
                        onClick={() =>
                          setSortConfig((p) => ({
                            key: value,
                            direction: p.key === value && p.direction === "ascending" ? "descending" : "ascending",
                          }))
                        }
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
                  <TableHead className="text-center text-nowrap font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        {columnVisibility.concat("actions").map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                ) : filteredSorted.length ? (
                  <AnimatePresence>
                    {filteredSorted.map((s, index) => (
                      <motion.tr
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="border-b transition-all hover:bg-muted/50"
                      >
                        {columnVisibility.includes("shiftName") && (
                          <TableCell className="font-medium text-center">
                            <div className="max-w-[200px] truncate mx-auto" title={s.shiftName}>
                              {s.shiftName}
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.includes("startTime") && (
                          <TableCell className="text-center">
                            <div className="space-y-1">
                              <div className="font-mono text-sm">
                                <TimeDisplayWithTooltip time={fmtClock(s.startTime)} type="start" />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {fmtClockWith12Hour(s.startTime)}
                              </div>
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.includes("endTime") && (
                          <TableCell className="text-center">
                            <div className="space-y-1">
                              <div className="font-mono text-sm">
                                <TimeDisplayWithTooltip time={fmtClock(s.endTime)} type="end" />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {fmtClockWith12Hour(s.endTime)}
                              </div>
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.includes("totalHours") && (
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-mono">
                              <TimeDisplayWithTooltip time={`${totalHours(s.startTime, s.endTime)}h`} type="total" />
                            </Badge>
                          </TableCell>
                        )}
                        {columnVisibility.includes("differentialMultiplier") && (
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Zap className="h-3 w-3 text-orange-500" />
                              <TimeDisplayWithTooltip time={`${s.differentialMultiplier}x`} type="multiplier" />
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.includes("createdAt") && (
                          <TableCell className="text-center">
                            <DateTimeDisplayWithTooltip dateTime={s.createdAt} type="created" />
                          </TableCell>
                        )}
                        {columnVisibility.includes("updatedAt") && (
                          <TableCell className="text-center">
                            <DateTimeDisplayWithTooltip dateTime={s.updatedAt} type="updated" />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEdit(s)}
                                    className="text-orange-700 hover:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit shift template</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDelete(s)}
                                    className="text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete shift template</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columnVisibility.length + 1} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                          <Clock className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <h3 className="font-medium mb-2">No shift templates found</h3>
                        <p className="text-sm">
                          {filters.name ? 
                            "No shifts match your search criteria." : 
                            "Create your first shift template to get started with employee scheduling."
                          }
                        </p>
                        {!filters.name && (
                          <Button 
                            onClick={openCreate} 
                            className="mt-3 bg-orange-500 hover:bg-orange-600 text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Shift
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-orange-500" />
              Create New Shift Template
            </DialogTitle>
            <DialogDescription>Add a new shift template for employee scheduling</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <span className="font-medium">Tip:</span> Shift templates can be reused across multiple employees and dates in your scheduling system.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Shift Template Name
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="text-xs">
                        Give your shift template a descriptive name like "Morning Shift" or "Night Security"
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                value={createForm.shiftName}
                onChange={(e) => setCreateForm((p) => ({ ...p, shiftName: e.target.value }))}
                placeholder="e.g., Morning Shift, Night Shift"
                className="focus:border-orange-500 focus:ring-orange-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Start Time
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="text-xs">
                          When employees should begin their work shift
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  type="time"
                  value={createForm.startTime}
                  onChange={(e) => setCreateForm((p) => ({ ...p, startTime: e.target.value }))}
                  className="focus:border-orange-500 focus:ring-orange-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  End Time
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="text-xs">
                          When employees should finish their work shift
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  type="time"
                  value={createForm.endTime}
                  onChange={(e) => setCreateForm((p) => ({ ...p, endTime: e.target.value }))}
                  className="focus:border-orange-500 focus:ring-orange-500/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Pay Rate Multiplier
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="text-xs">
                        Multiplier for pay rates (1.0 = normal, 1.5 = time and a half, 2.0 = double time)
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="5.0"
                value={createForm.differentialMultiplier}
                onChange={(e) => setCreateForm((p) => ({ ...p, differentialMultiplier: e.target.value }))}
                className="focus:border-orange-500 focus:ring-orange-500/20"
              />
            </div>

            {/* Preview */}
            {createForm.startTime && createForm.endTime && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <Timer className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <span className="font-medium">Preview:</span> This shift will be {totalHours(toUtcIso(createForm.startTime), toUtcIso(createForm.endTime))} hours long
                  {parseFloat(createForm.differentialMultiplier) !== 1.0 && ` with ${createForm.differentialMultiplier}x pay rate`}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={actionLoading || !createForm.shiftName.trim()} 
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Shift
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-orange-500" />
              Edit Shift Template
            </DialogTitle>
            <DialogDescription>Update shift template information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Shift Template Name</Label>
              <Input
                value={editForm.shiftName}
                onChange={(e) => setEditForm((p) => ({ ...p, shiftName: e.target.value }))}
                placeholder="e.g., Morning Shift, Night Shift"
                className="focus:border-orange-500 focus:ring-orange-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={editForm.startTime}
                  onChange={(e) => setEditForm((p) => ({ ...p, startTime: e.target.value }))}
                  className="focus:border-orange-500 focus:ring-orange-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm((p) => ({ ...p, endTime: e.target.value }))}
                  className="focus:border-orange-500 focus:ring-orange-500/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pay Rate Multiplier</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="5.0"
                value={editForm.differentialMultiplier}
                onChange={(e) => setEditForm((p) => ({ ...p, differentialMultiplier: e.target.value }))}
                className="focus:border-orange-500 focus:ring-orange-500/20"
              />
            </div>

            {/* Preview */}
            {editForm.startTime && editForm.endTime && (
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <Timer className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <span className="font-medium">Updated Duration:</span> {totalHours(toUtcIso(editForm.startTime), toUtcIso(editForm.endTime))} hours
                  {parseFloat(editForm.differentialMultiplier) !== 1.0 && ` with ${editForm.differentialMultiplier}x pay rate`}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={actionLoading || !editForm.shiftName.trim()} 
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-800/50">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete Shift Template
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the shift template.
            </DialogDescription>
          </DialogHeader>

          {shiftToDelete && (
            <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                <span className="font-medium">Deleting:</span> {shiftToDelete.shiftName}
                <br />
                <span className="text-sm">
                  Duration: {totalHours(shiftToDelete.startTime, shiftToDelete.endTime)} hours 
                  ({fmtClockWith12Hour(shiftToDelete.startTime)} - {fmtClockWith12Hour(shiftToDelete.endTime)})
                </span>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDelete(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={actionLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}