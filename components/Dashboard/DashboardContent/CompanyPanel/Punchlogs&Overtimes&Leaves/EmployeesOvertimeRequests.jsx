// components/Dashboard/DashboardContent/CompanyPanel/PunchLogs&Overtime&Leaves/EmployeesOvertimeRequests.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Filter,
  CheckCircle2,
  XCircle,
  Trash2,
  Info,
  AlertCircle,
  FileText,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";

import ColumnSelector from "@/components/common/ColumnSelector";
import MultiSelect from "@/components/common/MultiSelect";
import DeleteBtn from "@/components/common/DeleteBtn";
import TableSkeleton from "@/components/common/TableSkeleton";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { fmtMMDDYYYY_hhmma } from "@/lib/dateTimeFormatter";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const statusClasses = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};
const statusIcons = {
  pending: <Clock className="h-3 w-3 mr-1" />,
  approved: <CheckCircle2 className="h-3 w-3 mr-1" />,
  rejected: <XCircle className="h-3 w-3 mr-1" />,
};

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const diffHours = (inTs, outTs) => {
  if (!inTs || !outTs) return 0;
  const ms = new Date(outTs) - new Date(inTs);
  return +(ms / 3_600_000).toFixed(2);
};

export default function EmployeesOvertimeRequests() {
  const { token } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState("requestedNewest");
  const [dialogType, setDialogType] = useState(null);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logData, setLogData] = useState(null);

  const columnOptions = [
    { value: "otId", label: "Overtime ID" },
    { value: "requester", label: "Requester Email" },
    { value: "timeLogId", label: "TimeLog ID" },
    { value: "otHours", label: "OT (h)" },
    { value: "lateHours", label: "Late (h)" },
    { value: "reason", label: "Reason" },
    { value: "status", label: "Status" },
    { value: "createdAt", label: "Created At" },
    { value: "updatedAt", label: "Updated At" },
  ];
  const [columnVisibility, setColumnVisibility] = useState(columnOptions.map((o) => o.value));

  const [filters, setFilters] = useState({
    otIds: ["all"],
    reqs: ["all"],
    tlIds: ["all"],
    otVals: ["all"],
    lateVals: ["all"],
    reasons: ["all"],
    statuses: ["all"],
  });

  const toggleFilter = (key, val) =>
    setFilters((prev) => {
      if (val === "all") return { ...prev, [key]: ["all"] };
      let list = prev[key].filter((v) => v !== "all");
      list = list.includes(val) ? list.filter((v) => v !== val) : [...list, val];
      return { ...prev, [key]: list.length ? list : ["all"] };
    });

  const fetchRows = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/overtime`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Failed to fetch overtime.");
      setRows(
        (j.data || []).map((o) => ({
          ...o,
          lateHours: o.lateHours ?? o.timeLog?.lateHours ?? null,
        }))
      );
    } catch (e) {
      toast.message(e.message || "Fetch error");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[status] || ""}`}>
      {statusIcons[status]} {status}
    </span>
  );

  const otVal = (r) =>
    r.requestedHours != null
      ? Number(r.requestedHours).toFixed(2)
      : r.timeLog?.otHours ?? diffHours(r.timeLog?.timeIn, r.timeLog?.timeOut) ?? "—";

  const lateVal = (r) => (r.lateHours != null ? Number(r.lateHours).toFixed(2) : r.timeLog?.lateHours ?? "—");

  const otIdOpts = useMemo(() => [...new Set(rows.map((r) => r.id))].map((v) => ({ value: v, label: v })), [rows]);
  const reqOpts = useMemo(
    () => [...new Set(rows.map((r) => r.requester?.email || r.requester?.username || "—"))].map((v) => ({ value: v, label: v })),
    [rows]
  );
  const tlIdOpts = useMemo(
    () =>
      [...new Set(rows.map((r) => r.timeLogId || "—"))].map((v) => ({
        value: v,
        label: v,
      })),
    [rows]
  );
  const otValOpts = useMemo(() => [...new Set(rows.map((r) => otVal(r)))].map((v) => ({ value: v, label: v })), [rows]);
  const lateValOpts = useMemo(
    () =>
      [...new Set(rows.map((r) => lateVal(r)))].map((v) => ({
        value: v,
        label: v,
      })),
    [rows]
  );
  const reasonOpts = useMemo(
    () =>
      [...new Set(rows.map((r) => r.requesterReason || "—"))].map((v) => ({
        value: v,
        label: v,
      })),
    [rows]
  );

  const viewRows = useMemo(() => {
    let list = [...rows];
    const f = filters;

    if (!f.otIds.includes("all")) list = list.filter((r) => f.otIds.includes(r.id));
    if (!f.reqs.includes("all")) list = list.filter((r) => f.reqs.includes(r.requester?.email || r.requester?.username || "—"));
    if (!f.tlIds.includes("all")) list = list.filter((r) => f.tlIds.includes(r.timeLogId || "—"));
    if (!f.otVals.includes("all")) list = list.filter((r) => f.otVals.includes(otVal(r)));
    if (!f.lateVals.includes("all")) list = list.filter((r) => f.lateVals.includes(lateVal(r)));
    if (!f.reasons.includes("all")) list = list.filter((r) => f.reasons.includes(r.requesterReason || "—"));
    if (!f.statuses.includes("all")) list = list.filter((r) => f.statuses.includes(r.status));

    const cmpStr = (a, b) => a.localeCompare(b);
    const cmpNum = (a, b) => a - b;
    const dir = (asc) => (asc ? 1 : -1);

    switch (sortKey) {
      case "otIdAsc":
        list.sort((a, b) => cmpStr(a.id, b.id) * dir(true));
        break;
      case "otIdDesc":
        list.sort((a, b) => cmpStr(a.id, b.id) * dir(false));
        break;
      case "requesterAsc":
        list.sort((a, b) => cmpStr(a.requester?.username || "", b.requester?.username || "") * dir(true));
        break;
      case "requesterDesc":
        list.sort((a, b) => cmpStr(a.requester?.username || "", b.requester?.username || "") * dir(false));
        break;
      case "tlAsc":
        list.sort((a, b) => cmpStr(a.timeLogId || "", b.timeLogId || "") * dir(true));
        break;
      case "tlDesc":
        list.sort((a, b) => cmpStr(a.timeLogId || "", b.timeLogId || "") * dir(false));
        break;
      case "otAsc":
        list.sort((a, b) => cmpNum(parseFloat(otVal(a)), parseFloat(otVal(b))) * dir(true));
        break;
      case "otDesc":
        list.sort((a, b) => cmpNum(parseFloat(otVal(a)), parseFloat(otVal(b))) * dir(false));
        break;
      case "lateAsc":
        list.sort((a, b) => cmpNum(parseFloat(lateVal(a)), parseFloat(lateVal(b))) * dir(true));
        break;
      case "lateDesc":
        list.sort((a, b) => cmpNum(parseFloat(lateVal(a)), parseFloat(lateVal(b))) * dir(false));
        break;
      case "reasonAsc":
        list.sort((a, b) => cmpStr(a.requesterReason || "", b.requesterReason || "") * dir(true));
        break;
      case "reasonDesc":
        list.sort((a, b) => cmpStr(a.requesterReason || "", b.requesterReason || "") * dir(false));
        break;
      case "requestedOld":
        list.sort((a, b) => (new Date(a.createdAt) - new Date(b.createdAt)) * dir(true));
        break;
      case "requestedNewest":
        list.sort((a, b) => (new Date(a.createdAt) - new Date(b.createdAt)) * dir(false));
        break;
      case "statusAsc":
        list.sort((a, b) => cmpStr(a.status, b.status) * dir(true));
        break;
      case "statusDesc":
        list.sort((a, b) => cmpStr(a.status, b.status) * dir(false));
        break;
      case "createdOld":
        list.sort((a, b) => (new Date(a.createdAt) - new Date(b.createdAt)) * dir(true));
        break;
      case "createdNewest":
        list.sort((a, b) => (new Date(a.createdAt) - new Date(b.createdAt)) * dir(false));
        break;
      case "updatedOld":
        list.sort((a, b) => (new Date(a.updatedAt) - new Date(b.updatedAt)) * dir(true));
        break;
      case "updatedNewest":
        list.sort((a, b) => (new Date(a.updatedAt) - new Date(b.updatedAt)) * dir(false));
        break;
      default:
        list.sort((a, b) => (new Date(a.createdAt) - new Date(b.createdAt)) * dir(false));
    }
    return list;
  }, [rows, filters, sortKey]);

  const openDialog = (type, row) => {
    setDialogType(type);
    setSelected(row);
    setComment("");
  };
  const closeDialog = () => {
    setDialogType(null);
    setSelected(null);
    setComment("");
  };

  const doAction = async (endpoint) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/overtime/${selected.id}/${endpoint}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approverComments: comment }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Operation failed.");
      toast.message(j.message || "Success");
      fetchRows();
      closeDialog();
    } catch (e) {
      toast.message(e.message || "Error");
    }
    setActionLoading(false);
  };

  const doDelete = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/overtime/${selected.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Delete failed.");
      toast.message(j.message || "Deleted");
      setRows((p) => p.filter((row) => row.id !== selected.id));
      setShowDelete(false);
      setSelected(null);
    } catch (e) {
      toast.message(e.message || "Delete failed");
    }
    setActionLoading(false);
  };

  const FilterRow = ({ label, options, selKey }) => (
    <MultiSelect
      options={options}
      selected={filters[selKey]}
      onChange={(v) => toggleFilter(selKey, v)}
      allLabel={`All ${label}`}
      width={200}
    />
  );

  return (
    <div className="max-w-full mx-auto p-4 lg:px-10 px-2 space-y-8">
      <Toaster position="top-center" richColors />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Clock className="h-7 w-7 text-orange-500" />
          Employee Overtime Requests
        </h2>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={fetchRows} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading && "animate-spin"}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh overtime list</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
              <Filter className="h-5 w-5" />
            </div>
            Table Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-muted-foreground">Column:</span>
            <ColumnSelector options={columnOptions} visible={columnVisibility} setVisible={setColumnVisibility} />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-muted-foreground">Filter:</span>
            <FilterRow label="OT IDs" options={otIdOpts} selKey="otIds" />
            <FilterRow label="requesters" options={reqOpts} selKey="reqs" />
            <FilterRow label="time-logs" options={tlIdOpts} selKey="tlIds" />
            <FilterRow label="OT hrs" options={otValOpts} selKey="otVals" />
            <FilterRow label="late hrs" options={lateValOpts} selKey="lateVals" />
            <FilterRow label="reasons" options={reasonOpts} selKey="reasons" />
            <FilterRow
              label="statuses"
              options={[
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]}
              selKey="statuses"
            />
          </div>
        </CardContent>
      </Card>
      <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
              <Calendar className="h-5 w-5" />
            </div>
            Overtime Requests
          </CardTitle>
          <CardDescription>Review overtime approvals</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columnVisibility.includes("otId") && (
                    <TableHead
                      className="cursor-pointer text-center whitespace-nowrap"
                      onClick={() => setSortKey((p) => (p === "otIdAsc" ? "otIdDesc" : "otIdAsc"))}
                    >
                      <div className="flex items-center justify-center gap-1">
                        OT&nbsp;ID
                        {sortKey === "otIdAsc" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : sortKey === "otIdDesc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : null}
                      </div>
                    </TableHead>
                  )}

                  {columnVisibility.includes("requester") && (
                    <TableHead
                      className="cursor-pointer text-center whitespace-nowrap"
                      onClick={() => setSortKey((p) => (p === "requesterAsc" ? "requesterDesc" : "requesterAsc"))}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Requester Email
                        {sortKey === "requesterAsc" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : sortKey === "requesterDesc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : null}
                      </div>
                    </TableHead>
                  )}

                  {columnVisibility.includes("timeLogId") && (
                    <TableHead
                      className="cursor-pointer text-center whitespace-nowrap"
                      onClick={() => setSortKey((p) => (p === "tlAsc" ? "tlDesc" : "tlAsc"))}
                    >
                      <div className="flex items-center justify-center gap-1">
                        TimeLog&nbsp;ID
                        {sortKey === "tlAsc" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : sortKey === "tlDesc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : null}
                      </div>
                    </TableHead>
                  )}

                  {columnVisibility.includes("otHours") && (
                    <TableHead
                      className="cursor-pointer text-center whitespace-nowrap"
                      onClick={() => setSortKey((p) => (p === "otAsc" ? "otDesc" : "otAsc"))}
                    >
                      <div className="flex items-center justify-center gap-1">
                        OT&nbsp;(h)
                        {sortKey === "otAsc" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : sortKey === "otDesc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : null}
                      </div>
                    </TableHead>
                  )}

                  {columnVisibility.includes("lateHours") && (
                    <TableHead
                      className="cursor-pointer text-center whitespace-nowrap"
                      onClick={() => setSortKey((p) => (p === "lateAsc" ? "lateDesc" : "lateAsc"))}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Late&nbsp;(h)
                        {sortKey === "lateAsc" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : sortKey === "lateDesc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : null}
                      </div>
                    </TableHead>
                  )}

                  {columnVisibility.includes("reason") && (
                    <TableHead
                      className="cursor-pointer text-center whitespace-nowrap"
                      onClick={() => setSortKey((p) => (p === "reasonAsc" ? "reasonDesc" : "reasonAsc"))}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Reason
                        {sortKey === "reasonAsc" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : sortKey === "reasonDesc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : null}
                      </div>
                    </TableHead>
                  )}

                  {columnVisibility.includes("status") && (
                    <TableHead
                      className="cursor-pointer text-center whitespace-nowrap"
                      onClick={() => setSortKey((p) => (p === "statusAsc" ? "statusDesc" : "statusAsc"))}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Status
                        {sortKey === "statusAsc" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : sortKey === "statusDesc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : null}
                      </div>
                    </TableHead>
                  )}

                  {columnVisibility.includes("createdAt") && (
                    <TableHead
                      className="cursor-pointer text-center whitespace-nowrap"
                      onClick={() => setSortKey((p) => (p === "createdNewest" ? "createdOld" : "createdNewest"))}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Created&nbsp;At
                        {sortKey === "createdNewest" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : sortKey === "createdOld" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : null}
                      </div>
                    </TableHead>
                  )}

                  {columnVisibility.includes("updatedAt") && (
                    <TableHead
                      className="cursor-pointer text-center whitespace-nowrap"
                      onClick={() => setSortKey((p) => (p === "updatedNewest" ? "updatedOld" : "updatedNewest"))}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Updated&nbsp;At
                        {sortKey === "updatedNewest" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : sortKey === "updatedOld" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : null}
                      </div>
                    </TableHead>
                  )}

                  <TableHead className="text-center whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableSkeleton rows={5} cols={columnVisibility.length + 1} />
                ) : viewRows.length ? (
                  <AnimatePresence>
                    {viewRows.map((r) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b hover:bg-muted/50"
                      >
                        {columnVisibility.includes("otId") && (
                          <TableCell className="text-center text-nowrap text-xs">{r.id}</TableCell>
                        )}
                        {columnVisibility.includes("requester") && (
                          <TableCell className="text-center text-nowrap">
                            {r.requester?.email || r.requester?.username || "—"}
                          </TableCell>
                        )}
                        {columnVisibility.includes("timeLogId") && (
                          <TableCell className="text-center text-nowrap">{r.timeLogId || "—"}</TableCell>
                        )}
                        {columnVisibility.includes("otHours") && (
                          <TableCell className="text-center text-nowrap">{otVal(r)}</TableCell>
                        )}
                        {columnVisibility.includes("lateHours") && (
                          <TableCell className="text-center text-nowrap">{lateVal(r)}</TableCell>
                        )}
                        {columnVisibility.includes("reason") && (
                          <TableCell className="max-w-xs truncate">
                            {r.requesterReason || <span className="italic text-muted-foreground">—</span>}
                          </TableCell>
                        )}
                        {columnVisibility.includes("status") && (
                          <TableCell className="text-center text-nowrap">
                            <StatusBadge status={r.status} />
                          </TableCell>
                        )}
                        {columnVisibility.includes("createdAt") && (
                          <TableCell className="text-center text-nowrap">{fmtMMDDYYYY_hhmma(r.createdAt)}</TableCell>
                        )}
                        {columnVisibility.includes("updatedAt") && (
                          <TableCell className="text-center text-nowrap">{fmtMMDDYYYY_hhmma(r.updatedAt)}</TableCell>
                        )}

                        <TableCell className="text-center whitespace-nowrap">
                          <div className="flex justify-center gap-1">
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-sky-700 hover:bg-sky-500/10 dark:text-sky-400 dark:hover:bg-sky-500/20"
                                    onClick={() => {
                                      setLogData(r.timeLog);
                                      setLogOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Time Log</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-orange-700 hover:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
                                    onClick={() => {
                                      setSelected(r);
                                      setDetailsOpen(true);
                                    }}
                                  >
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Overtime Details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {r.status === "pending" && (
                              <>
                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-green-700 hover:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20"
                                        onClick={() => openDialog("approve", r)}
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Approve</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider delayDuration={300}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                                        onClick={() => openDialog("reject", r)}
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reject</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}

                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DeleteBtn
                                    onClick={() => {
                                      setSelected(r);
                                      setShowDelete(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </DeleteBtn>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columnVisibility.length + 1} className="h-28 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Calendar className="h-8 w-8 text-orange-500/50" />
                        </div>
                        <p>No overtime requests found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!dialogType} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogType === "approve" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              {dialogType === "approve" ? "Approve" : "Reject"} Overtime
            </DialogTitle>
            <DialogDescription>
              {dialogType === "approve" ? "Add optional approval comments" : "Provide rejection reason (optional)"}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="border rounded-md p-3 bg-muted/50 text-sm space-y-1">
              <p>
                <strong>Overtime ID:</strong> {selected.id}
              </p>
              <p>
                <strong>Punch log ID:</strong> {selected.timeLogId}
              </p>
              <p>
                <strong>Requester Email:</strong> {selected.requester?.email || selected.requester?.username}
              </p>
              <p>
                <strong>OT Hours:</strong> {otVal(selected)}
              </p>
              <p>
                <strong>Late Hours:</strong> {lateVal(selected)}
              </p>
              {selected.requesterReason && (
                <p>
                  <strong>Reason:</strong> {selected.requesterReason}
                </p>
              )}
            </div>
          )}

          <Textarea
            placeholder={dialogType === "approve" ? "Approval comments (optional)" : "Rejection reason (optional)"}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <DialogFooter className="pt-4 gap-2">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              disabled={actionLoading}
              onClick={() => doAction(dialogType)}
              className={
                dialogType === "approve" ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"
              }
            >
              {actionLoading
                ? dialogType === "approve"
                  ? "Approving…"
                  : "Rejecting…"
                : dialogType === "approve"
                ? "Approve"
                : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md border-2 dark:border-white/10">
          <div className="h-1 w-full bg-orange-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" /> Overtime Details
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <h3 className="font-medium text-lg">{otVal(selected)} OT Hours</h3>
                <p className="text-sm">
                  <strong>Late Hours:&nbsp;</strong>
                  {lateVal(selected)}
                </p>
                <StatusBadge status={selected.status} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Overtime ID</p>
                  <p className="font-mono text-xs">{selected.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Punch log ID</p>
                  <p className="font-mono text-xs">{selected.timeLogId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Requester Email</p>
                  <p className="font-medium">{selected.requester?.email || selected.requester?.username}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Requested At</p>
                  <p className="font-medium">{fmtMMDDYYYY_hhmma(selected.createdAt)}</p>
                </div>
              </div>

              {selected.requesterReason && (
                <div className="space-y-1 pt-2 border-t border-black/10 dark:border-white/10">
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <div className="bg-muted p-3 rounded-md">{selected.requesterReason}</div>
                </div>
              )}

              {selected.approverComments && (
                <div className="space-y-1 pt-2 border-t border-black/10 dark:border-white/10">
                  <p className="text-sm text-muted-foreground">
                    {selected.status === "approved" ? "Approval" : "Rejection"} Comments
                  </p>
                  <div
                    className={`p-3 rounded-md ${
                      selected.status === "approved"
                        ? "bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30"
                        : "bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30"
                    }`}
                  >
                    {selected.approverComments}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setDetailsOpen(false)} className="bg-orange-500 hover:bg-orange-600 text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="sm:max-w-lg border-2 dark:border-white/10">
          <div className="h-1 w-full bg-sky-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-sky-500" /> Time Log Details
            </DialogTitle>
          </DialogHeader>

          {logData ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Time In</p>
                  <p className="font-medium">{fmtMMDDYYYY_hhmma(logData.timeIn)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Time Out</p>
                  <p className="font-medium">{fmtMMDDYYYY_hhmma(logData.timeOut)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{logData.status ? "Active" : "Completed"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Raw Hours</p>
                  <p className="font-medium">{diffHours(logData.timeIn, logData.timeOut)}</p>
                </div>
              </div>

              {Array.isArray(logData.coffeeBreaks) && logData.coffeeBreaks.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-black/10 dark:border-white/10">
                  <p className="text-muted-foreground">Coffee Breaks</p>
                  <ul className="list-disc ml-4">
                    {logData.coffeeBreaks.map((b, idx) => (
                      <li key={idx}>
                        {fmt(b.start)} – {b.end ? fmt(b.end) : "ongoing"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {logData.lunchBreak && (
                <div className="space-y-1 pt-2 border-t border-black/10 dark:border-white/10">
                  <p className="text-muted-foreground">Lunch Break</p>
                  <p className="font-medium">
                    {fmt(logData.lunchBreak.start)} – {logData.lunchBreak.end ? fmt(logData.lunchBreak.end) : "ongoing"}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No data</p>
          )}

          <DialogFooter>
            <Button onClick={() => setLogOpen(false)} className="bg-sky-500 hover:bg-sky-600 text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-md border-2 border-red-200 dark:border-red-900/40">
          <div className="h-1 w-full bg-red-500 -mt-6 mb-4" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" /> Delete Overtime Request
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 my-4 space-y-1 text-sm">
              <p>
                <strong>Overtime ID:</strong> {selected.id}
              </p>
              <p>
                <strong>Punch log ID:</strong> {selected.timeLogId}
              </p>
              <p>
                <strong>Requester Email:</strong> {selected.requester?.email || selected.requester?.username}
              </p>
              <p>
                <strong>OT Hours:</strong> {otVal(selected)}
              </p>
              <p>
                <strong>Late Hours:</strong> {lateVal(selected)}
              </p>
              <p>
                <strong>Status:</strong> <span className="capitalize">{selected.status}</span>
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDelete(false)}
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={doDelete} disabled={actionLoading} className="bg-red-500 hover:bg-red-600">
              {actionLoading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
