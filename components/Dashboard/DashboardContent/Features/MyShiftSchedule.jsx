/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useMemo } from "react";
import { format, parseISO, isSameDay, isValid } from "date-fns";
import Link from "next/link";
import useAuthStore from "@/store/useAuthStore";
import { toast, Toaster } from "sonner";
import { CalendarIcon, Clock, ArrowRight } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/* ---------------------------- helper: hours -------------------------------- */
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

/* -------------------------------------------------------------------------- */
/*                              main component                                */
/* -------------------------------------------------------------------------- */
export default function MyShiftSchedule() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [allShifts, setAllShifts] = useState([]);
  const [loading, setLoading] = useState(false);

  /* --------------------------- fetch user shifts -------------------------- */
  useEffect(() => {
    if (!token) return;
    (async () => {
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
    })();
  }, [token, API_URL]);

  /* ------------------ build helpers derived from fetched data ------------- */
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

  /* ------------------------------ rendering ------------------------------- */
  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4">
      <Toaster position="top-center" />

      {/* ---------------------------- page title + nav ---------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-7 w-7 text-orange-500" />
            My Shift Schedule
          </h2>
          <p className="text-muted-foreground mt-1">View and manage your upcoming shifts</p>
        </div>

        <div className="flex gap-2">
          {/* navigation buttons */}
          <Button variant="outline" className="flex items-center gap-1" asChild>
            <Link href="/dashboard/my-punch">
              <Clock className="h-4 w-4" />
              Punch
            </Link>
          </Button>
          <Button variant="outline" className="flex items-center gap-1" asChild>
            <Link href="/dashboard/my-time-log">
              <CalendarIcon className="h-4 w-4" />
              Time&nbsp;Card
            </Link>
          </Button>

          {/* today button */}
          <Button
            onClick={goToToday}
            variant="outline"
            className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---------------------------- calendar ----------------------------- */}
        <Card className="lg:col-span-2 shadow-md border-2 dark:border-white/10 overflow-hidden">
          <div className="h-1 w-full bg-orange-500" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <CalendarIcon className="h-5 w-5" />
              </div>
              Calendar View
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              modifiers={{ hasShift: shiftDays }}
              className="w-full p-0"
              components={{
                DayContent: (props) => {
                  const day = props.date;
                  const dayNumber = isValid(day) ? day.getDate() : "?";
                  const dateKey = isValid(day) ? format(day, "yyyy-MM-dd") : "";
                  const hasShifts = (shiftCountByDay[dateKey] || 0) > 0;

                  return (
                    <div
                      className={`flex flex-col items-center justify-center h-full w-full m-1 rounded-md transition-colors ${
                        hasShifts ? "bg-orange-500 text-white font-bold" : ""
                      }`}
                    >
                      <span className={hasShifts ? "mb-1" : ""}>{dayNumber}</span>
                    </div>
                  );
                },
              }}
              initialFocus
            />
          </CardContent>
        </Card>

        {/* --------------------------- daily shifts --------------------------- */}
        <Card className="shadow-md border-2 dark:border-white/10 overflow-hidden">
          <div className="h-1 w-full bg-orange-500" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
                <Clock className="h-5 w-5" />
              </div>
              {safeFormat(selectedDate, "EEEE, MMMM d, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : shiftsToday.length ? (
              <div className="divide-y">
                {shiftsToday.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b last:border-b-0 border-black/10 dark:border-white/10"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-lg capitalize flex items-center">
                        <div className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
                        {s.shift.shiftName}
                      </h3>
                      <Badge className="bg-orange-500 hover:bg-orange-600 text-white">{hoursBetween(s.shift.startTime, s.shift.endTime)} hrs</Badge>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground bg-black/5 dark:bg-white/5 rounded-md p-2">
                      <Clock className="h-4 w-4 mr-1 text-orange-500" />
                      <span>{safeTimeFormat(s.shift.startTime)}</span>
                      <ArrowRight className="h-3 w-3 mx-2" />
                      <span>{safeTimeFormat(s.shift.endTime)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-orange-500/50" />
                </div>
                <p>No shifts scheduled for</p>
                <p className="font-medium text-orange-500">{format(selectedDate, "MMMM d, yyyy")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --------------------------- shift details table --------------------------- */}
      <Card className="shadow-md border-2 dark:border-white/10 overflow-hidden">
        <div className="h-1 w-full bg-orange-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500">
              <CalendarIcon className="h-5 w-5" />
            </div>
            Shift Details
          </CardTitle>
          <CardDescription>Detailed information about your scheduled shifts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Total&nbsp;hrs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              ) : shiftsToday.length ? (
                shiftsToday.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium capitalize">{s.shift.shiftName}</TableCell>
                    <TableCell>{safeFormat(parseISO(s.assignedDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>{safeTimeFormat(s.shift.startTime)}</TableCell>
                    <TableCell>{safeTimeFormat(s.shift.endTime)}</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-orange-500 hover:bg-orange-600 text-white">{hoursBetween(s.shift.startTime, s.shift.endTime)}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mb-3">
                        <Clock className="h-6 w-6 text-orange-500/50" />
                      </div>
                      <p>No shifts scheduled for {safeFormat(selectedDate, "MMM d, yyyy")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
