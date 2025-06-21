// components/Dashboard/DashboardContent/Features/MyShiftSchedule.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { format, parseISO, isSameDay, isValid } from "date-fns";
import Link from "next/link";
import useAuthStore from "@/store/useAuthStore";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarIcon, Clock, ArrowRight, RefreshCw, Timer, Activity, TrendingUp } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function hoursBetween(startISO, endISO) {
  try {
    const start = new Date(startISO);
    const end = new Date(endISO);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "N/A";
    let diff = end - start;
    if (diff < 0) diff += 24 * 60 * 60 * 1000;
    return (diff / 36e5).toFixed(2);
  } catch (err) {
    console.error("Error calculating hours:", err);
    return "N/A";
  }
}

export default function MyShiftSchedule() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [allShifts, setAllShifts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchShifts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/usershifts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setAllShifts(data.data || []);
      else toast.message(data.error || "Failed to fetch shifts.");
    } catch (err) {
      console.error(err);
      toast.message("Failed to fetch shifts.");
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const shiftDays = useMemo(() => {
    const uniq = new Set();
    allShifts.forEach((s) => {
      if (!s.assignedDate) return;
      const day = parseISO(s.assignedDate);
      if (isNaN(day.getTime())) return;
      uniq.add(format(day, "yyyy-MM-dd"));
    });
    return Array.from(uniq).map((d) => parseISO(d));
  }, [allShifts]);

  const shiftsToday = useMemo(() => {
    return allShifts
      .filter((s) => {
        if (!s.assignedDate) return false;
        const shiftDate = parseISO(s.assignedDate);
        if (isNaN(shiftDate.getTime())) return false;
        return isSameDay(shiftDate, selectedDate);
      })
      .sort((a, b) => new Date(a.shift.startTime) - new Date(b.shift.startTime));
  }, [allShifts, selectedDate]);

  const shiftCountByDay = useMemo(() => {
    const counts = {};
    allShifts.forEach((s) => {
      if (!s.assignedDate) return;
      const shiftDate = parseISO(s.assignedDate);
      if (isNaN(shiftDate.getTime())) return;
      const key = format(shiftDate, "yyyy-MM-dd");
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [allShifts]);

  const goToToday = () => {
    setSelectedDate(new Date());
    setCurrentMonth(new Date());
  };

  const safeFormat = (date, fmtStr) => (isValid(date) ? format(date, fmtStr) : "Invalid date");
  const safeTimeFormat = (s) => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? "Invalid time" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const totalHoursToday = useMemo(() => {
    return shiftsToday.reduce((total, shift) => {
      const hours = Number.parseFloat(hoursBetween(shift.shift.startTime, shift.shift.endTime));
      return total + (isNaN(hours) ? 0 : hours);
    }, 0);
  }, [shiftsToday]);

  return (
    <div className="max-w-full mx-auto p-4 lg:px-8 space-y-8">
      <Toaster position="top-center" />
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
              <CalendarIcon className="h-8 w-8" />
            </div>
            My Shift Schedules
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">View and manage your upcoming shifts</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black" asChild>
            <Link href="/dashboard/my-punch">
              <Clock className="h-4 w-4" />
              Punch
            </Link>
          </Button>
          <Button variant="outline" className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black" asChild>
            <Link href="/dashboard/my-time-log">
              <Timer className="h-4 w-4" />
              Time Card
            </Link>
          </Button>

          <Button onClick={goToToday} variant="outline" className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>

          <Button onClick={fetchShifts} variant="outline" size="icon" disabled={loading} aria-label="Refresh shift data" className="">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-2 shadow-xl overflow-hidden bg-gradient-to-br from-white to-orange-50 dark:from-neutral-900 dark:to-orange-950">
            <div className="h-2 w-full bg-gradient-to-r from-orange-500 to-orange-600" />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                Today's Shifts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent mb-2">
                  {shiftsToday.length}
                </div>
                <p className="text-sm text-muted-foreground">{shiftsToday.length === 1 ? "shift scheduled" : "shifts scheduled"}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-2 shadow-xl overflow-hidden bg-gradient-to-br from-white to-blue-50 dark:from-neutral-900 dark:to-blue-950">
            <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-blue-600" />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <Clock className="h-5 w-5" />
                </div>
                Total Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent mb-2">
                  {totalHoursToday.toFixed(1)}
                </div>
                <p className="text-sm text-muted-foreground">hours today</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-2 shadow-xl overflow-hidden bg-gradient-to-br from-white to-emerald-50 dark:from-neutral-900 dark:to-emerald-950">
            <div className="h-2 w-full bg-gradient-to-r from-emerald-500 to-emerald-600" />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent mb-2">
                  {allShifts.length}
                </div>
                <p className="text-sm text-muted-foreground">total shifts</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <Card className="lg:col-span-2 shadow-xl border-2 bg-gradient-to-br from-white to-orange-50 dark:from-neutral-900 dark:to-orange-950 overflow-hidden">
            <div className="h-2 w-full bg-gradient-to-r from-orange-500 to-orange-600" />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                Calendar View
              </CardTitle>
              <CardDescription>Click on any date to view shifts for that day</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                modifiers={{ hasShift: shiftDays }}
                className="w-full p-0 rounded-xl border border-orange-200 dark:border-orange-800"
                components={{
                  DayContent: (props) => {
                    const day = props.date;
                    const dayNumber = isValid(day) ? day.getDate() : "?";
                    const dateKey = isValid(day) ? format(day, "yyyy-MM-dd") : "";
                    const shiftCount = shiftCountByDay[dateKey] || 0;
                    const hasShifts = shiftCount > 0;

                    return (
                      <div
                        className={`flex flex-col items-center justify-center h-full w-full m-1 rounded-lg transition-all duration-200 ${
                          hasShifts
                            ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-md transform hover:scale-105"
                            : "hover:bg-orange-50 dark:hover:bg-orange-950"
                        }`}
                      >
                        <span className={hasShifts ? "mb-1" : ""}>{dayNumber}</span>
                        {hasShifts && (
                          <div className="text-xs bg-white/20 px-1 rounded-full">
                            {shiftCount} {shiftCount === 1 ? "shift" : "shifts"}
                          </div>
                        )}
                      </div>
                    );
                  },
                }}
                initialFocus
              />
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
          <Card className="shadow-xl border-2 bg-gradient-to-br from-white to-blue-50 dark:from-neutral-900 dark:to-blue-950 overflow-hidden">
            <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-blue-600" />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-lg">{safeFormat(selectedDate, "EEEE")}</div>
                  <div className="text-sm text-muted-foreground">{safeFormat(selectedDate, "MMMM d, yyyy")}</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : shiftsToday.length ? (
                <div className="divide-y divide-blue-200 dark:divide-blue-800">
                  <AnimatePresence>
                    {shiftsToday.map((s, index) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-6 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-lg capitalize flex items-center">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 mr-3" />
                            {s.shift.shiftName}
                          </h3>
                          <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                            {hoursBetween(s.shift.startTime, s.shift.endTime)} hrs
                          </Badge>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground bg-blue-100 dark:bg-blue-900 rounded-xl p-3">
                          <Clock className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="font-mono">{safeTimeFormat(s.shift.startTime)}</span>
                          <ArrowRight className="h-4 w-4 mx-3 text-blue-500" />
                          <span className="font-mono">{safeTimeFormat(s.shift.endTime)}</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="py-16 text-center text-muted-foreground">
                  <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="h-10 w-10 text-blue-500" />
                  </div>
                  <p className="text-lg font-medium mb-2">No shifts scheduled</p>
                  <p className="text-sm">for {format(selectedDate, "MMMM d, yyyy")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card className="shadow-xl border-2 bg-gradient-to-br from-white to-emerald-50 dark:from-neutral-900 dark:to-emerald-950 overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <CalendarIcon className="h-5 w-5" />
              </div>
              Shift Details
            </CardTitle>
            <CardDescription>Detailed information about your scheduled shifts for the selected date</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
                    <TableHead className="font-semibold">Shift Name</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Start Time</TableHead>
                    <TableHead className="font-semibold">End Time</TableHead>
                    <TableHead className="text-right font-semibold">Total Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(3)
                      .fill(0)
                      .map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}>
                            <Skeleton className="h-8 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                  ) : shiftsToday.length ? (
                    <AnimatePresence>
                      {shiftsToday.map((s, index) => (
                        <motion.tr
                          key={s.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                        >
                          <TableCell className="font-medium capitalize">{s.shift.shiftName}</TableCell>
                          <TableCell className="font-mono">{safeFormat(parseISO(s.assignedDate), "MMM d, yyyy")}</TableCell>
                          <TableCell className="font-mono">{safeTimeFormat(s.shift.startTime)}</TableCell>
                          <TableCell className="font-mono">{safeTimeFormat(s.shift.endTime)}</TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                              {hoursBetween(s.shift.startTime, s.shift.endTime)} hrs
                            </Badge>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mb-4">
                            <Clock className="h-8 w-8 text-emerald-500" />
                          </div>
                          <p className="text-lg font-medium mb-2">No shifts scheduled</p>
                          <p className="text-sm">for {safeFormat(selectedDate, "MMM d, yyyy")}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
