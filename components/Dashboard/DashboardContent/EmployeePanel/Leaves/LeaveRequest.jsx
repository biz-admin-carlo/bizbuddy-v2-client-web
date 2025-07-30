// components/Dashboard/DashboardContent/EmployeePanel/Leaves/LeaveRequest.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Calendar, Clock, Send, User, FileText, AlertCircle, CheckCircle2, PenLine } from "lucide-react";
import { toast, Toaster } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { DateTimePicker } from "@/components/DateTimePicker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function LeaveRequest() {
  const { token } = useAuthStore();
  const [policies, setPolicies] = useState([]);
  const [leaveType, setLeaveType] = useState("");
  const [approverId, setApproverId] = useState("");
  const [reason, setReason] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [balances, setBalances] = useState([]);
  const [balance, setBalance] = useState(null);
  const [shiftHours, setShiftHours] = useState(8);
  const [approvers, setApprovers] = useState([]);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const leaveRows = useMemo(() => {
    return policies.map((p) => {
      const alloc = p.accrualUnit === "days" ? Number(p.annualAllocation) * p.defaultShiftHours : Number(p.annualAllocation);
      const balObj = balances.find((b) => b.leaveType === p.leaveType);
      const available = balObj ? Number(balObj.balanceHours) : 0;
      const credits = Math.max(alloc, available); // ensure credits ≥ available
      const used = credits - available;
      return { type: p.leaveType, credits, used, available };
    });
  }, [policies, balances]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API}/api/leave-policies`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${API}/api/leaves/balances`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${API}/api/leaves/approvers`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([p, b, a]) => {
        const companyShift = p.data?.[0]?.defaultShiftHours != null ? Number(p.data[0].defaultShiftHours) : 8;
        setPolicies((p.data || []).map((pl) => ({ ...pl, defaultShiftHours: companyShift })));
        setBalances(b.data || []);
        setApprovers(
          (a.data || []).map((ap) => ({
            id: ap.id,
            label: `${ap.username} (${ap.email})`,
          }))
        );
        setShiftHours(companyShift);
      })
      .catch(() => toast.message("Failed to initialise leave data"));
  }, [token]);

  useEffect(() => {
    if (!leaveType) {
      setBalance(null);
      return;
    }
    fetch(`${API}/api/leaves/balance?type=${encodeURIComponent(leaveType)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setBalance(d.data?.balanceHours ?? null);
        setShiftHours(d.data?.shiftHours ?? 8);
      })
      .catch(() => setBalance(null));
  }, [leaveType, token]);

  useEffect(() => {
    let p = 0;
    if (leaveType) p += 25;
    if (approverId) p += 25;
    if (start) p += 25;
    if (end) p += 25;
    setProgress(p);
  }, [leaveType, approverId, start, end]);

  const requested = useMemo(() => {
    if (!start || !end) return 0;
    const days = Math.floor((new Date(end) - new Date(start)) / 86_400_000) + 1;
    return days * shiftHours;
  }, [start, end, shiftHours]);

  const currentPolicy = useMemo(() => policies.find((p) => p.leaveType === leaveType), [policies, leaveType]);

  const creditsForType = useMemo(() => {
    if (!currentPolicy) return null;
    const alloc =
      currentPolicy.accrualUnit === "days"
        ? Number(currentPolicy.annualAllocation) * currentPolicy.defaultShiftHours
        : Number(currentPolicy.annualAllocation);
    if (balance == null) return alloc;
    return Math.max(alloc, balance);
  }, [currentPolicy, balance]);

  const usedForType = creditsForType != null && balance != null ? creditsForType - balance : null;

  const exceeds = balance != null && requested > balance;

  const validate = () => {
    const e = {};
    if (!leaveType) e.leaveType = "Select leave type";
    if (!approverId) e.approverId = "Select approver";
    if (!start) e.start = "Select start";
    if (!end) e.end = "Select end";
    if (start && end && new Date(start) >= new Date(end)) e.end = "End must be after start";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = () => {
    if (submitting) return;
    if (!validate()) {
      toast.message("Please fix the form", {
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      });
      return;
    }
    setSubmitting(true);
    fetch(`${API}/api/leaves/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: leaveType,
        fromDate: new Date(start).toISOString(),
        toDate: new Date(end).toISOString(),
        approverId,
        leaveReason: reason,
      }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (ok) {
          toast.message("Leave request submitted", {
            icon: <CheckCircle2 className="h-5 w-5 text-orange-500" />,
          });
          setLeaveType("");
          setApproverId("");
          setReason("");
          setStart("");
          setEnd("");
          setBalance(null);
        } else {
          toast.message(d.message || "Submit failed", {
            icon: <AlertCircle className="h-5 w-5 text-orange-500" />,
          });
        }
        setSubmitting(false);
      })
      .catch(() => {
        toast.message("Submit failed", {
          icon: <AlertCircle className="h-5 w-5 text-orange-500" />,
        });
        setSubmitting(false);
      });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-6xl mx-auto p-4 lg:px-10 px-2 space-y-8">
        <Toaster position="top-center" />
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <PenLine className="h-7 w-7 text-orange-500" />
          Leave Request
        </h2>
        <Card className="border-2 shadow-md">
          <div className="h-1 w-full bg-orange-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              Your Leave Credits
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-neutral-100">
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead className="text-center">Credits (h)</TableHead>
                  <TableHead className="text-center">Used (h)</TableHead>
                  <TableHead className="text-center">Available (h)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveRows.map((row) => (
                  <TableRow key={row.type}>
                    <TableCell>{row.type}</TableCell>
                    <TableCell className="text-center">{row.credits.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{row.used.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{row.available.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-md">
          <div className="h-1 w-full bg-orange-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              New Leave Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Progress value={progress} className="h-2 [&>div]:bg-orange-500 bg-black/10 dark:bg-white/10" />
              <p className="text-center text-xs text-muted-foreground">{progress}%</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-500" />
                  Leave type <span className="text-orange-500">*</span>
                </label>
                <Select
                  value={leaveType}
                  onValueChange={(v) => {
                    setLeaveType(v);
                    setErrors((e) => ({ ...e, leaveType: undefined }));
                  }}
                >
                  <SelectTrigger className={errors.leaveType ? "border-red-300" : ""}>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {policies.map((p) => (
                      <SelectItem key={p.leaveType} value={p.leaveType}>
                        {p.leaveType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {creditsForType != null && balance != null && (
                  <p className={`text-xs mt-1 ${exceeds ? "text-red-600" : "text-neutral-700 dark:text-neutral-300"}`}>
                    {usedForType}/{creditsForType} h ({balance} h available) • requesting {requested} h
                  </p>
                )}
                {errors.leaveType && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.leaveType}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-orange-500" />
                  Approver <span className="text-orange-500">*</span>
                </label>
                <Select
                  value={approverId}
                  onValueChange={(v) => {
                    setApproverId(v);
                    setErrors((e) => ({ ...e, approverId: undefined }));
                  }}
                >
                  <SelectTrigger className={errors.approverId ? "border-red-300" : ""}>
                    <SelectValue placeholder="Select approver" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {approvers.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.approverId && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.approverId}
                  </p>
                )}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  Start <span className="text-orange-500">*</span>
                </label>
                <DateTimePicker
                  value={start}
                  onChange={(v) => {
                    setStart(v);
                    setErrors((e) => ({ ...e, start: undefined }));
                  }}
                  placeholder="Start date & time"
                />
                {errors.start && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.start}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  End <span className="text-orange-500">*</span>
                </label>
                <DateTimePicker
                  value={end}
                  onChange={(v) => {
                    setEnd(v);
                    setErrors((e) => ({ ...e, end: undefined }));
                  }}
                  placeholder="End date & time"
                />
                {errors.end && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.end}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-500" />
                Reason (optional)
              </label>
              <Textarea
                placeholder="Explain the reason…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-4 pb-6 justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white gap-2 py-6 sm:py-2"
                  onClick={handleSubmit}
                  disabled={submitting || progress < 100}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? "Submitting…" : "Submit"}
                </Button>
              </TooltipTrigger>
              {progress < 100 && (
                <TooltipContent>
                  <p>Complete all required fields</p>
                </TooltipContent>
              )}
            </Tooltip>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setLeaveType("");
                setApproverId("");
                setReason("");
                setStart("");
                setEnd("");
                setErrors({});
                setBalance(null);
              }}
              disabled={submitting}
            >
              Reset
            </Button>
          </CardFooter>
        </Card>
      </div>
    </TooltipProvider>
  );
}
