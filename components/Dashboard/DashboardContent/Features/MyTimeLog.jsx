"use client";

import { useEffect, useState, useMemo } from "react";
import useAuthStore from "@/store/useAuthStore";
import { toast, Toaster } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Trash2, Info, Clock, Calendar, ArrowUpDown, RefreshCw, Filter, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

/* safe helpers ------------------------------------------------------------- */
const safeDT = (d) => (d ? new Date(d).toLocaleString() : "—");
const safeTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");
const safeDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "—");
const formatDuration = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) return "—";

  const start = new Date(timeIn);
  const end = new Date(timeOut);
  const diffMs = end - start;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
};

/* -------------------------------------------------------------------------- */
export default function MyTimeLog() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const [sortAsc, setSortAsc] = useState(false);

  /* fetch --------------------------------------------------------------- */
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/timelogs/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Fetch failed");
      setLogs(d.data || []);
    } catch (e) {
      toast.message(e.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshLogs = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/api/timelogs/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Refresh failed");
      setLogs(d.data || []);
      toast.message("Time logs refreshed");
    } catch (e) {
      toast.message(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* derived */
  const sorted = useMemo(() => {
    return [...logs].sort((a, b) => (sortAsc ? new Date(a.timeIn) - new Date(b.timeIn) : new Date(b.timeIn) - new Date(a.timeIn)));
  }, [logs, sortAsc]);

  /* delete -------------------------------------------------------------- */
  const openDeleteDialog = (log) => {
    setSelectedLog(log);
    setDeleteDialogOpen(true);
  };

  const deleteLog = async () => {
    if (!selectedLog) return;

    try {
      const res = await fetch(`${API_URL}/api/timelogs/delete/${selectedLog.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Delete failed");
      toast.message(d.message || "Time log deleted successfully");
      setLogs((l) => l.filter((x) => x.id !== selectedLog.id));
      setDeleteDialogOpen(false);
    } catch (e) {
      toast.message(e.message);
    }
  };

  /* view details -------------------------------------------------------- */
  const viewDetails = (log) => {
    setSelectedLog(log);
    setDetailsDialogOpen(true);
  };

  /* active logs count --------------------------------------------------- */
  const activeLogs = useMemo(() => {
    return logs.filter((log) => log.status).length;
  }, [logs]);

  /* -------------------------------------------------------------------- */
  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      <Toaster position="top-center" richColors />

      {/* header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-7 w-7 text-orange-500" />
            My Time Logs
          </h2>
          <p className="text-muted-foreground mt-1">Track and manage your work hours</p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refreshLogs}
                  disabled={refreshing}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh logs</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortAsc((s) => !s)}
                  className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                >
                  {sortAsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sort by {sortAsc ? "oldest" : "newest"} first</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast.message("Filter functionality coming soon")}>All logs</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.message("Filter functionality coming soon")}>Active only</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.message("Filter functionality coming soon")}>Completed only</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.message("Filter functionality coming soon")}>Today</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.message("Filter functionality coming soon")}>This week</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* latest card */}
        <Card className="md:col-span-2 border-2 shadow-md overflow-hidden dark:border-white/10">
          <div className="h-1 w-full bg-orange-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <Clock className="h-5 w-5" />
              </div>
              Latest Punch
            </CardTitle>
            <CardDescription>Your most recent time entry</CardDescription>
          </CardHeader>
          <CardContent>
            <LatestCard log={sorted[0]} loading={loading} />
          </CardContent>
        </Card>

        {/* summary card */}
        <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
          <div className="h-1 w-full bg-orange-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
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
                <div>
                  <div className="text-sm text-muted-foreground">Active sessions</div>
                  <div className="text-2xl font-bold">{activeLogs}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total entries</div>
                  <div className="text-2xl font-bold">{logs.length}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* table of all logs */}
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500"></div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <Calendar className="h-5 w-5" />
            </div>
            All Logs
          </CardTitle>
          <CardDescription>Complete history of your time entries</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">
                    <div className="flex items-center gap-1">
                      Date
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Time Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : logs.length ? (
                  <AnimatePresence>
                    {sorted.map((log) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      >
                        <TableCell className="font-medium">{safeDate(log.timeIn)}</TableCell>
                        <TableCell>{safeTime(log.timeIn)}</TableCell>
                        <TableCell>{safeTime(log.timeOut)}</TableCell>
                        <TableCell>{formatDuration(log.timeIn, log.timeOut)}</TableCell>
                        <TableCell>
                          {log.status ? (
                            <Badge className="bg-green-500 hover:bg-green-600 text-white">Active</Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                            >
                              Completed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" onClick={() => viewDetails(log)}>
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View details</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {!log.status && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" onClick={() => openDeleteDialog(log)}>
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete log</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Clock className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p>No time logs found</p>
                        <p className="text-sm">Your punch records will appear here</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-800/50">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4"></div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>Are you sure you want to delete this time log? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="border rounded-md p-3 bg-muted/50">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span> {safeDate(selectedLog.timeIn)}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span> {selectedLog.status ? "Active" : "Completed"}
                </div>
                <div>
                  <span className="text-muted-foreground">Time In:</span> {safeTime(selectedLog.timeIn)}
                </div>
                <div>
                  <span className="text-muted-foreground">Time Out:</span> {safeTime(selectedLog.timeOut)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteLog} className="bg-red-500 hover:bg-red-600">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-md border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4"></div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <Info className="h-5 w-5" />
              </div>
              Time Log Details
            </DialogTitle>
            <DialogDescription>Complete information about this time entry</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-y-3">
                  <div>
                    <div className="text-sm font-medium">Date</div>
                    <div>{safeDate(selectedLog.timeIn)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Status</div>
                    <div>
                      {selectedLog.status ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline">Completed</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Time In</div>
                    <div>{safeTime(selectedLog.timeIn)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Time Out</div>
                    <div>{safeTime(selectedLog.timeOut)}</div>
                  </div>
                  {!selectedLog.status && (
                    <div>
                      <div className="text-sm font-medium">Duration</div>
                      <div>{formatDuration(selectedLog.timeIn, selectedLog.timeOut)}</div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <div className="text-sm font-medium mb-1">Raw Data</div>
                  <pre className="bg-muted p-2 rounded-md text-xs overflow-auto">{JSON.stringify(selectedLog, null, 2)}</pre>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailsDialogOpen(false)} className="bg-orange-500 hover:bg-orange-600 text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* latest punch highlight --------------------------------------------------- */
function LatestCard({ log, loading }) {
  if (loading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!log) {
    return (
      <div className="flex flex-col items-center justify-center h-24 text-center text-muted-foreground">
        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="h-8 w-8 text-orange-500/50" />
        </div>
        <p>No time logs recorded yet</p>
      </div>
    );
  }

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
            {isActive ? (
              <Badge className="bg-green-500 hover:bg-green-600 text-white">Currently active</Badge>
            ) : (
              <Badge variant="outline">Completed</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm p-2 rounded-lg bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-muted-foreground">In:</span>
          <span className="font-medium">{safeTime(log.timeIn)}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? "bg-gray-300" : "bg-red-500"}`}></div>
          <span className="text-muted-foreground">Out:</span>
          <span className="font-medium">{safeTime(log.timeOut)}</span>
        </div>

        {!isActive && (
          <>
            <div className="flex items-center gap-2 col-span-2 mt-1 border-t pt-2 border-black/10 dark:border-white/10">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{formatDuration(log.timeIn, log.timeOut)}</span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
