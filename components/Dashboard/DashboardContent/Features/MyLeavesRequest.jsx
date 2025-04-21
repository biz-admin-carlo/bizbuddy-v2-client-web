"use client";

import { useEffect, useState } from "react";
import { Loader2, Calendar, Clock, Send, User, FileText, AlertCircle, CheckCircle2, PenLine } from "lucide-react";
import { toast, Toaster } from "sonner";

import useAuthStore from "@/store/useAuthStore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { DateTimePicker } from "@/components/DateTimePicker";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const leaveTypeOptions = [
  { id: "Sick Leave", icon: "🤒", description: "For health-related absences" },
  { id: "Vacation Leave", icon: "🏖️", description: "For planned time off" },
  { id: "Emergency Leave", icon: "🚨", description: "For unexpected situations" },
  { id: "Maternity/Paternity Leave", icon: "👶", description: "For new parents" },
  { id: "Casual Leave", icon: "🌴", description: "For personal matters" },
];

function MyLeavesRequest() {
  const { token } = useAuthStore();

  /* -------------------------------------------- */
  /* form state                                   */
  /* -------------------------------------------- */
  const [leaveType, setLeaveType] = useState("");
  const [approverId, setApproverId] = useState("");
  const [reason, setReason] = useState("");
  const [start, setStart] = useState(""); // YYYY‑MM‑DDTHH:mm
  const [end, setEnd] = useState("");

  const [approvers, setApprovers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingApprovers, setLoadingApprovers] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [formProgress, setFormProgress] = useState(0);

  /* fetch approvers once */
  useEffect(() => {
    if (!token) return;
    async function go() {
      setLoadingApprovers(true);
      try {
        const res = await fetch(`${API_URL}/api/leaves/approvers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setApprovers(
            (data.data || []).map((a) => ({
              id: a.id,
              label: `${a.username} (${a.email})`,
            }))
          );
        } else {
          toast.message(data.message || "Failed to fetch approvers", {
            icon: <AlertCircle className="h-5 w-5 text-red-500" />,
            duration: 5000,
          });
        }
      } catch (err) {
        toast.message("Failed to fetch approvers", {
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          duration: 5000,
        });
      }
      setLoadingApprovers(false);
    }
    go();
  }, [token]);

  /* Calculate form progress */
  useEffect(() => {
    let progress = 0;
    if (leaveType) progress += 25;
    if (approverId) progress += 25;
    if (start) progress += 25;
    if (end) progress += 25;
    setFormProgress(progress);
  }, [leaveType, approverId, start, end]);

  /* validate form */
  const validateForm = () => {
    const errors = {};

    if (!leaveType) errors.leaveType = "Please select a leave type";
    if (!approverId) errors.approverId = "Please select an approver";
    if (!start) errors.start = "Please select a start date and time";
    if (!end) errors.end = "Please select an end date and time";

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (startDate >= endDate) {
        errors.end = "End date must be after start date";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* -------------------------------------------- */
  /* submit handler                               */
  /* -------------------------------------------- */
  const handleSubmit = async () => {
    if (submitting) return;
    setSuccess(false);

    if (!validateForm()) {
      toast.message("Please fix the errors in the form", {
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
        duration: 5000,
      });
      return;
    }

    const startISO = new Date(start).toISOString();
    const endISO = new Date(end).toISOString();

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/leaves/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: leaveType,
          fromDate: startISO,
          toDate: endISO,
          approverId,
          leaveReason: reason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.message("Leave request submitted successfully!", {
          icon: <CheckCircle2 className="h-5 w-5 text-orange-500" />,
        });
        setSuccess(true);
        /* reset form */
        setLeaveType("");
        setApproverId("");
        setReason("");
        setStart("");
        setEnd("");
        setFormErrors({});
      } else {
        toast.message(data.message || "Failed to submit leave request", {
          icon: <AlertCircle className="h-5 w-5 text-orange-500" />,
          duration: 5000,
        });
      }
    } catch (err) {
      toast.message("Failed to submit leave request", {
        icon: <AlertCircle className="h-5 w-5 text-orange-500" />,
        duration: 5000,
      });
    }
    setSubmitting(false);
  };

  /* get selected leave type details */
  const selectedLeaveType = leaveTypeOptions.find((lt) => lt.id === leaveType);

  /* -------------------------------------------- */
  /* render                                       */
  /* -------------------------------------------- */
  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <Toaster position="top-center" richColors />

        {/* Header with title and icon */}
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <PenLine className="h-7 w-7 text-orange-500" />
            Request Leave
          </h2>
        </div>

        {/* Main card */}
        <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
          <div className="h-1 w-full bg-orange-500"></div>

          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <Calendar className="h-5 w-5" />
              </div>
              New Leave Request
            </CardTitle>
            <CardDescription className="text-slate-500">Fill out the form below to submit a new leave request</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Form progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Form completion</span>
                <span className="text-muted-foreground">{formProgress}%</span>
              </div>
              <Progress value={formProgress} className="h-2 [&>div]:bg-orange-500 bg-black/10 dark:bg-white/10" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Leave type */}
              <div className="space-y-2">
                <label className="font-medium text-sm block flex items-center">
                  <div className="p-1.5 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500 mr-2">
                    <FileText className="h-4 w-4" />
                  </div>
                  Leave type <span className="text-orange-500 ml-1">*</span>
                </label>
                <Select
                  value={leaveType}
                  onValueChange={(value) => {
                    setLeaveType(value);
                    setFormErrors({ ...formErrors, leaveType: undefined });
                  }}
                >
                  <SelectTrigger className={`w-full ${formErrors.leaveType ? "border-red-300 ring-red-100" : ""}`}>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypeOptions.map((t) => (
                      <SelectItem value={t.id} key={t.id} className="py-3 ">
                        <div className="flex items-center justify-start">
                          <div>
                            <div>{t.id}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.leaveType && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" /> {formErrors.leaveType}
                  </p>
                )}
              </div>
              {/* Approver */}
              <div className="space-y-2">
                <label className="font-medium text-sm block flex items-center">
                  <div className="p-1.5 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500 mr-2">
                    <User className="h-4 w-4" />
                  </div>
                  Approver <span className="text-orange-500 ml-1">*</span>
                </label>
                {loadingApprovers ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 p-3 border rounded-md">
                    <Loader2 className="animate-spin h-4 w-4 text-orange-500" /> Loading approvers…
                  </div>
                ) : (
                  <>
                    <Select
                      value={approverId}
                      onValueChange={(value) => {
                        setApproverId(value);
                        setFormErrors({ ...formErrors, approverId: undefined });
                      }}
                    >
                      <SelectTrigger className={`w-full ${formErrors.approverId ? "border-red-300 ring-red-100" : ""}`}>
                        <SelectValue placeholder="Select approver" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {approvers.length > 0 ? (
                          approvers.map((a) => (
                            <SelectItem value={String(a.id)} key={a.id}>
                              <div className="flex items-center">
                                <User className="h-3.5 w-3.5 mr-2 text-orange-500/70" />
                                {a.label}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-slate-500 text-center">No approvers available</div>
                        )}
                      </SelectContent>
                    </Select>
                    {formErrors.approverId && (
                      <p className="text-red-500 text-xs mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" /> {formErrors.approverId}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
            {/* Dates */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Start Date-Time Picker */}
              <div className="space-y-2">
                <label className="font-medium text-sm block flex items-center">
                  <div className="p-1.5 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500 mr-2">
                    <Calendar className="h-4 w-4" />
                  </div>
                  Start date &amp; time <span className="text-orange-500 ml-1">*</span>
                </label>
                <DateTimePicker
                  value={start}
                  onChange={(value) => {
                    setStart(value);
                    setFormErrors({ ...formErrors, start: undefined });
                  }}
                  placeholder="Start date & time"
                />
                {formErrors.start && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" /> {formErrors.start}
                  </p>
                )}
              </div>

              {/* End Date-Time Picker */}
              <div className="space-y-2">
                <label className="font-medium text-sm block flex items-center">
                  <div className="p-1.5 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500 mr-2">
                    <Clock className="h-4 w-4" />
                  </div>
                  End date &amp; time <span className="text-orange-500 ml-1">*</span>
                </label>
                <DateTimePicker
                  value={end}
                  onChange={(value) => {
                    setEnd(value);
                    setFormErrors({ ...formErrors, end: undefined });
                  }}
                  placeholder="End date & time"
                />
                {formErrors.end && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" /> {formErrors.end}
                  </p>
                )}
              </div>
            </div>
            {/* Reason */}
            <div className="space-y-2">
              <label className="font-medium text-sm block flex items-center">
                <div className="p-1.5 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500 mr-2">
                  <FileText className="h-4 w-4" />
                </div>
                Reason (optional)
              </label>
              <Textarea
                placeholder="Explain the reason for your leave request..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px] resize-none "
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-4 pt-2 pb-6 justify-end ">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold gap-2 py-6 sm:py-2"
                  onClick={handleSubmit}
                  disabled={submitting || formProgress < 100}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? "Submitting request..." : "Submit leave request"}
                </Button>
              </TooltipTrigger>
              {formProgress < 100 && (
                <TooltipContent>
                  <p>Please complete all required fields</p>
                </TooltipContent>
              )}
            </Tooltip>

            <Button
              variant="outline"
              className="w-full sm:w-auto text-neutral-700 hover:bg-neutral-50  dark:text-neutral-400 dark:hover:bg-neutral-800"
              onClick={() => {
                setLeaveType("");
                setApproverId("");
                setReason("");
                setStart("");
                setEnd("");
                setFormErrors({});
                setSuccess(false);
              }}
              disabled={submitting}
            >
              Reset form
            </Button>
          </CardFooter>
        </Card>

        {/* Quick tips card */}
      </div>
    </TooltipProvider>
  );
}

export default MyLeavesRequest;
