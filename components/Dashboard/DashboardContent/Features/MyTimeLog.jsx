/* eslint-disable react-hooks/exhaustive-deps */
"use client";

/**
 * MyTimeLog — employee view
 * ------------------------------------------------------------
 * • Device-/Location-In/Out columns
 * • Coffee / Lunch hours (decimal)
 * • CSV export
 * • Raw JSON view in Details dialog
 * • Handles:
 *     deviceIn / deviceOut
 *     deviceInfo.start / deviceInfo.end
 *     location.start / location.end
 *     any nested or JSON-encoded string
 */

import { useEffect, useMemo, useState } from "react";
import useAuthStore from "@/store/useAuthStore";
import { toast, Toaster } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar, ChevronDown, ChevronUp, RefreshCw, Download, Filter, Info, Trash2, Smartphone, MapPin, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

/* ────────────── generic helpers ────────────── */

const safeDate = (d) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "—";

const safeTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");

/* ------------- hours helpers (decimal) ------------- */

const toHourString = (mins) => {
  const h = mins / 60;
  const s = parseFloat(h.toFixed(2)).toString(); // drop trailing zeros
  return s.startsWith("0.") ? s.slice(1) : s; // ".5" instead of "0.5"
};

const duration = (tin, tout) => {
  if (!tin || !tout) return "—";
  const diffMin = (new Date(tout) - new Date(tin)) / 60000;
  return toHourString(diffMin);
};

const coffeeMinutes = (l = []) => {
  const mins = l.reduce((m, b) => (b.start && b.end ? m + (new Date(b.end) - new Date(b.start)) / 60000 : m), 0);
  return toHourString(mins);
};

const lunchMinutes = (l) => {
  if (!l || !l.start || !l.end) return "0";
  const mins = (new Date(l.end) - new Date(l.start)) / 60000;
  return toHourString(mins);
};

/* ────────────── deep parse for JSON strings ────────────── */

const deepParse = (v) => {
  if (typeof v === "string" && (v.startsWith("{") || v.startsWith("["))) {
    try {
      return deepParse(JSON.parse(v));
    } catch {
      return v;
    }
  }
  if (Array.isArray(v)) return v.map(deepParse);
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = deepParse(val);
    return out;
  }
  return v;
};

/* ────────────── search helpers ────────────── */

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

/* ────────────── top-level key sets ────────────── */

const DEV_IN_KEYS = ["deviceIn", "deviceInfoStart", "deviceStart", "deviceInfoIn"];
const DEV_OUT_KEYS = ["deviceOut", "deviceInfoEnd", "deviceEnd", "deviceInfoOut"];
const LOC_IN_KEYS = ["locIn", "locationIn", "locationStart", "locStart"];
const LOC_OUT_KEYS = ["locOut", "locationOut", "locationEnd", "locEnd"];

const firstField = (log, keys) => keys.map((k) => log[k]).find((v) => v != null);

/* ────────────── device / location extractors ────────────── */

const chooseStartEnd = (log, dir, base) => (dir === "in" ? log?.[base]?.start : log?.[base]?.end);

const getDevice = (log, dir) => {
  let obj = firstField(log, dir === "in" ? DEV_IN_KEYS : DEV_OUT_KEYS);
  if (!obj) obj = chooseStartEnd(log, dir, "deviceInfo"); // ← NEW
  if (!obj) return "—";
  obj = deepParse(obj);
  if (typeof obj === "string") return obj;
  const brand = findProp(obj, ["manufacturer", "brand"]);
  const name = findProp(obj, ["deviceName", "model"]);
  if (brand || name) return [brand, name].filter(Boolean).join(", ");
  return JSON.stringify(obj);
};

const getLocation = (log, dir) => {
  let obj = firstField(log, dir === "in" ? LOC_IN_KEYS : LOC_OUT_KEYS);
  if (!obj) obj = chooseStartEnd(log, dir, "location"); // ← NEW
  if (!obj) return { txt: "—", lat: null, lng: null };
  obj = deepParse(obj);

  if (typeof obj === "string") {
    const parts = obj.split(/[, ]+/);
    const lat = parseFloat(parts[0]),
      lng = parseFloat(parts[1]);
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
  if (lat != null && lng != null)
    return {
      txt: `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
      lat,
      lng,
    };
  return { txt: "—", lat: null, lng: null };
};

/* ────────────── CSV builder ────────────── */

const wrap = (v) => `"${String(v).replace(/"/g, '""')}"`;

const buildCSV = (rows) =>
  [
    [
      "ID",
      "Date",
      "Time In",
      "Time Out",
      "Duration (h)",
      "Coffee (h)",
      "Lunch (h)",
      "Device In",
      "Device Out",
      "Location In",
      "Location Out",
      "Status",
    ].map(wrap),
    ...rows.map((r) =>
      [
        r.id,
        safeDate(r.timeIn),
        safeTime(r.timeIn),
        safeTime(r.timeOut),
        duration(r.timeIn, r.timeOut),
        r.coffeeMins,
        r.lunchMins,
        getDevice(r, "in"),
        getDevice(r, "out"),
        getLocation(r, "in").txt,
        getLocation(r, "out").txt,
        r.status ? "Active" : "Completed",
      ].map(wrap)
    ),
  ]
    .map((row) => row.join(","))
    .join("\r\n");

/* ────────────── component ────────────── */

export default function MyTimeLog() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);

  const [selected, setSelected] = useState(null);
  const [delOpen, setDelOpen] = useState(false);
  const [detOpen, setDetOpen] = useState(false);

  /* fetch logs */
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
            lunchMins: lunchMinutes(t.lunchBreak),
          };
        })
      );
    } catch (e) {
      toast.message(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchLogs();
  }, [token]);

  const sorted = useMemo(
    () => [...logs].sort((a, b) => (sortAsc ? new Date(a.timeIn) - new Date(b.timeIn) : new Date(b.timeIn) - new Date(a.timeIn))),
    [logs, sortAsc]
  );

  const refresh = () => {
    setRefreshing(true);
    fetchLogs().finally(() => setRefreshing(false));
  };

  const exportCSV = () => {
    if (!sorted.length) return toast.message("No rows to export");
    setExporting(true);
    const blob = new Blob([buildCSV(sorted)], {
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
    } catch (e) {
      toast.message(e.message);
    }
  };

  /* ────────────── UI ────────────── */

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      <Toaster position="top-center" richColors />

      <Header sortAsc={sortAsc} setSortAsc={setSortAsc} refresh={refresh} refreshing={refreshing} exportCSV={exportCSV} exporting={exporting} />

      <Stats loading={loading} latest={sorted[0]} total={logs.length} active={logs.filter((l) => l.status).length} />

      <LogsTable
        loading={loading}
        logs={sorted}
        onDetails={(l) => {
          setSelected(l);
          setDetOpen(true);
        }}
        onDelete={(l) => {
          setSelected(l);
          setDelOpen(true);
        }}
      />

      <DeleteDialog open={delOpen} onOpenChange={setDelOpen} selected={selected} onDelete={deleteLog} />
      <DetailsDialog open={detOpen} onOpenChange={setDetOpen} selected={selected} />
    </div>
  );
}

/* ────────────── icon button ────────────── */

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

/* ────────────── header ────────────── */

const Header = ({ sortAsc, setSortAsc, refresh, refreshing, exportCSV, exporting }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
        <Clock className="h-7 w-7 text-orange-500" /> My Time Logs
      </h2>
      <p className="text-muted-foreground mt-1">Track and manage your work hours</p>
    </div>
    <div className="flex items-center gap-2">
      <IconBtn icon={RefreshCw} tooltip="Refresh logs" spinning={refreshing} onClick={refresh} />
      <IconBtn icon={Download} tooltip="Export CSV" spinning={exporting} onClick={exportCSV} />
      <IconBtn icon={sortAsc ? ChevronUp : ChevronDown} tooltip={`Sort by ${sortAsc ? "oldest" : "newest"} first`} onClick={() => setSortAsc((s) => !s)} />
      <Button
        variant="outline"
        size="icon"
        className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
      >
        <Filter className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

/* ────────────── stats / latest ────────────── */

const Stats = ({ loading, latest, total, active }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card className="md:col-span-2 border-2 shadow-md overflow-hidden dark:border-white/10">
      <div className="h-1 w-full bg-orange-500" />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
            <Clock className="h-5 w-5" />
          </div>
          Latest Punch
        </CardTitle>
        <CardDescription>Your most recent entry</CardDescription>
      </CardHeader>
      <CardContent>
        <LatestCard log={latest} loading={loading} />
      </CardContent>
    </Card>

    <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
      <div className="h-1 w-full bg-orange-500" />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
            <Calendar className="h-5 w-5" />
          </div>
          Summary
        </CardTitle>
        <CardDescription>Quick stats</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : (
          <div className="space-y-4">
            <Stat label="Active sessions" value={active} />
            <Stat label="Total entries" value={total} />
          </div>
        )}
      </CardContent>
    </Card>
  </div>
);

const Stat = ({ label, value }) => (
  <div>
    <div className="text-sm text-muted-foreground">{label}</div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

const LatestCard = ({ log, loading }) => {
  if (loading) return <Skeleton className="h-24 w-full" />;

  if (!log)
    return (
      <div className="flex flex-col items-center justify-center h-24 text-center text-muted-foreground">
        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-orange-500/50" />
        </div>
        <p>No time logs recorded yet</p>
      </div>
    );

  const isActive = log.status;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${isActive ? "bg-orange-500" : "bg-neutral-600"}`}>
          <Clock className={`h-6 w-6 ${isActive ? "text-white" : "text-neutral-200"}`} />
        </div>
        <div>
          <h3 className="font-medium text-lg">{safeDate(log.timeIn)}</h3>
          <div className="text-sm text-muted-foreground">
            {isActive ? <Badge className="bg-green-500 text-white">Active</Badge> : <Badge variant="outline">Completed</Badge>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm p-2 rounded-lg bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10">
        <div>
          <span className="text-muted-foreground mr-1">In:</span>
          {safeTime(log.timeIn)}
        </div>
        <div>
          <span className="text-muted-foreground mr-1">Out:</span>
          {safeTime(log.timeOut)}
        </div>
      </div>
    </motion.div>
  );
};

/* ────────────── main table ────────────── */

const LogsTable = ({ loading, logs, onDetails, onDelete }) => (
  <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
    <div className="h-1 w-full bg-orange-500" />
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2">
        <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
          <Calendar className="h-5 w-5" />
        </div>
        All Logs
      </CardTitle>
      <CardDescription>Complete history of your entries</CardDescription>
    </CardHeader>
    <CardContent className="p-0">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time&nbsp;In</TableHead>
              <TableHead>Time&nbsp;Out</TableHead>
              <TableHead>Duration&nbsp;(h)</TableHead>
              <TableHead>Coffee&nbsp;(h)</TableHead>
              <TableHead>Lunch&nbsp;(h)</TableHead>
              <TableHead>
                <Smartphone className="h-4 w-4 inline-block mr-1" />
                In
              </TableHead>
              <TableHead>
                <Smartphone className="h-4 w-4 inline-block mr-1" />
                Out
              </TableHead>
              <TableHead>
                <MapPin className="h-4 w-4 inline-block mr-1" />
                In
              </TableHead>
              <TableHead>
                <MapPin className="h-4 w-4 inline-block mr-1" />
                Out
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
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
            ) : logs.length ? (
              <AnimatePresence>
                {logs.map((log) => {
                  const devIn = getDevice(log, "in");
                  const devOut = getDevice(log, "out");
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
                      <TableCell className="font-mono text-xs text-orange-500">{log.id}</TableCell>
                      <TableCell>{safeDate(log.timeIn)}</TableCell>
                      <TableCell>{safeTime(log.timeIn)}</TableCell>
                      <TableCell>{safeTime(log.timeOut)}</TableCell>
                      <TableCell>{duration(log.timeIn, log.timeOut)}</TableCell>
                      <TableCell>{log.coffeeMins}</TableCell>
                      <TableCell>{log.lunchMins}</TableCell>
                      <TableCell>{devIn}</TableCell>
                      <TableCell>{devOut}</TableCell>

                      {/* Location In */}
                      <TableCell>
                        {locIn.lat != null ? (
                          <a
                            href={`https://www.google.com/maps?q=${locIn.lat},${locIn.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-500 hover:underline"
                          >
                            {locIn.txt}
                          </a>
                        ) : (
                          locIn.txt
                        )}
                      </TableCell>

                      {/* Location Out */}
                      <TableCell>
                        {locOut.lat != null ? (
                          <a
                            href={`https://www.google.com/maps?q=${locOut.lat},${locOut.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-500 hover:underline"
                          >
                            {locOut.txt}
                          </a>
                        ) : (
                          locOut.txt
                        )}
                      </TableCell>

                      <TableCell>
                        {log.status ? <Badge className="bg-green-500 text-white">Active</Badge> : <Badge variant="outline">Completed</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <IconBtn icon={Info} tooltip="Details" onClick={() => onDetails(log)} />
                          {!log.status && <IconBtn icon={Trash2} tooltip="Delete" className="text-red-500" onClick={() => onDelete(log)} />}
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            ) : (
              <TableRow>
                <TableCell colSpan={13} className="h-24 text-center">
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

/* ────────────── Delete dialog ────────────── */

const DeleteDialog = ({ open, onOpenChange, selected, onDelete }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-900/40">
      <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          Confirm Deletion
        </DialogTitle>
        <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
      </DialogHeader>
      {selected && (
        <div className="border rounded-md p-3 bg-muted/50 text-sm space-y-1">
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
          className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
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

/* ────────────── Details dialog ────────────── */

const DetailsDialog = ({ open, onOpenChange, selected }) => {
  if (!selected) return null;
  const devIn = getDevice(selected, "in");
  const devOut = getDevice(selected, "out");
  const locIn = getLocation(selected, "in");
  const locOut = getLocation(selected, "out");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-2 dark:border-white/10">
        <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-orange-500" />
            Time Log Details
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="grid grid-cols-2 gap-4">
            <Detail label="ID" value={selected.id} />
            <Detail
              label="Status"
              value={selected.status ? <Badge className="bg-green-500 text-white">Active</Badge> : <Badge variant="outline">Completed</Badge>}
            />
            <Detail label="Date" value={safeDate(selected.timeIn)} />
            <Detail label="Duration (h)" value={duration(selected.timeIn, selected.timeOut)} />
            <Detail label="Time In" value={safeTime(selected.timeIn)} />
            <Detail label="Time Out" value={safeTime(selected.timeOut)} />
            <Detail label="Coffee (h)" value={selected.coffeeMins} />
            <Detail label="Lunch (h)" value={selected.lunchMins} />
            <Detail label="Device In" value={devIn} />
            <Detail label="Device Out" value={devOut} />
            <Detail
              label="Location In"
              value={
                locIn.lat != null ? (
                  <a
                    href={`https://www.google.com/maps?q=${locIn.lat},${locIn.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:underline break-all"
                  >
                    {locIn.txt}
                  </a>
                ) : (
                  locIn.txt
                )
              }
            />
            <Detail
              label="Location Out"
              value={
                locOut.lat != null ? (
                  <a
                    href={`https://www.google.com/maps?q=${locOut.lat},${locOut.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:underline break-all"
                  >
                    {locOut.txt}
                  </a>
                ) : (
                  locOut.txt
                )
              }
            />
          </div>

          {/* Raw JSON */}
          <div className="pt-4">
            <div className="text-sm font-medium mb-1">Raw Data</div>
            <pre className="bg-muted p-2 rounded-md text-xs overflow-auto">{JSON.stringify(selected, null, 2)}</pre>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="bg-orange-500 hover:bg-orange-600 text-white">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Detail = ({ label, value }) => (
  <div>
    <div className="text-sm font-medium">{label}</div>
    <div className="break-words">{value}</div>
  </div>
);
