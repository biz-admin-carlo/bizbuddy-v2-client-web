/* Timezone-Aware Schedule.jsx - Employee Dashboard */
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { format, parseISO, isSameDay, isValid, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import Link from "next/link";
import useAuthStore from "@/store/useAuthStore";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CalendarIcon, 
  Clock, 
  ArrowRight, 
  RefreshCw, 
  Timer, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight,
  MapPin,
  Building,
  Users,
  Zap,
  Globe,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Timezone utility functions
const getTimezoneAbbreviation = (timezone) => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find(part => part.type === 'timeZoneName');
    return tzPart ? tzPart.value : timezone.split('/').pop();
  } catch (error) {
    console.error('Error getting timezone abbreviation:', error);
    return timezone.split('/').pop();
  }
};

const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

const formatTimeInTimezone = (dateString, timezone, formatStr = 'HH:mm') => {
  try {
    if (!dateString || !timezone) return 'N/A';
    return formatInTimeZone(new Date(dateString), timezone, formatStr);
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid';
  }
};

function hoursBetween(startISO, endISO, timezone) {
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

// Timezone Badge Component
function TimezoneBadge({ timezone, compact = false }) {
  const abbr = getTimezoneAbbreviation(timezone);
  
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="text-xs font-mono">
              <Globe className="h-3 w-3 mr-1" />
              {abbr}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div className="font-medium">{timezone}</div>
              <div className="text-muted-foreground mt-1">
                Current time: {formatInTimeZone(new Date(), timezone, 'h:mm a')}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Globe className="h-3 w-3" />
      <span className="font-mono">{abbr}</span>
    </div>
  );
}

// Enhanced Calendar Component with Multi-Shift Support
function ModernCalendar({ 
  selectedDate, 
  onDateSelect, 
  currentMonth, 
  onMonthChange, 
  shiftsByDate,
  loading 
}) {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad with previous month days
  const startDay = monthStart.getDay();
  const prevMonthDays = [];
  for (let i = startDay - 1; i >= 0; i--) {
    const prevDay = new Date(monthStart);
    prevDay.setDate(prevDay.getDate() - (i + 1));
    prevMonthDays.push(prevDay);
  }

  // Pad with next month days
  const nextMonthDays = [];
  const totalCells = 42; // 6 rows × 7 days
  const remainingCells = totalCells - (prevMonthDays.length + calendarDays.length);
  for (let i = 1; i <= remainingCells; i++) {
    const nextDay = new Date(monthEnd);
    nextDay.setDate(nextDay.getDate() + i);
    nextMonthDays.push(nextDay);
  }

  const allDays = [...prevMonthDays, ...calendarDays, ...nextMonthDays];

  const getShiftsForDate = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return shiftsByDate[dateKey] || [];
  };

  const getShiftIndicatorColors = (shifts) => {
    const colors = ['bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500'];
    return shifts.slice(0, 4).map((_, index) => colors[index % colors.length]);
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    onMonthChange(newMonth);
  };

  return (
    <div className="w-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth(-1)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth(1)}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {allDays.map((day, index) => {
            const shifts = getShiftsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const hasShifts = shifts.length > 0;

            // Check if shifts have different timezones
            const timezones = [...new Set(shifts.map(s => s.shift?.timeZone).filter(Boolean))];
            const hasMultipleTimezones = timezones.length > 1;

            return (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onDateSelect(day)}
                      className={`
                        relative p-2 h-16 border-r border-b border-gray-200 dark:border-gray-700 
                        last-in-row:border-r-0 transition-all duration-200 group
                        ${!isCurrentMonth 
                          ? 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600' 
                          : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }
                        ${isSelected 
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 ring-2 ring-orange-500 ring-inset' 
                          : ''
                        }
                        ${isTodayDate && isCurrentMonth 
                          ? 'bg-blue-50 dark:bg-blue-900/20' 
                          : ''
                        }
                      `}
                      disabled={loading}
                    >
                      {/* Date Number */}
                      <div className={`
                        text-sm font-medium mb-1
                        ${isSelected 
                          ? 'text-orange-700 dark:text-orange-300' 
                          : isTodayDate && isCurrentMonth
                          ? 'text-blue-700 dark:text-blue-300'
                          : isCurrentMonth 
                          ? 'text-gray-900 dark:text-gray-100' 
                          : 'text-gray-400 dark:text-gray-600'
                        }
                      `}>
                        {day.getDate()}
                      </div>

                      {/* Shift Indicators */}
                      {hasShifts && isCurrentMonth && (
                        <div className="absolute bottom-1 left-1 right-1">
                          {shifts.length <= 3 ? (
                            <div className="flex gap-0.5 justify-center">
                              {getShiftIndicatorColors(shifts).map((color, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-1.5 rounded-full ${color}`}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <div className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1 py-0.5 rounded">
                                {shifts.length}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Today Indicator */}
                      {isTodayDate && isCurrentMonth && (
                        <div className="absolute top-1 right-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                      )}

                      {/* Multi-timezone indicator */}
                      {hasMultipleTimezones && isCurrentMonth && (
                        <div className="absolute top-1 left-1">
                          <Globe className="h-3 w-3 text-orange-500" />
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <div className="font-medium">{format(day, 'MMM d, yyyy')}</div>
                      {hasShifts && (
                        <>
                          <div className="mt-1 text-xs">
                            {shifts.length} shift{shifts.length !== 1 ? 's' : ''} scheduled
                          </div>
                          {hasMultipleTimezones && (
                            <div className="mt-1 text-xs flex items-center gap-1 text-orange-400">
                              <Globe className="h-3 w-3" />
                              <span>Multiple timezones</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Enhanced Shift Card Component with Timezone
function ShiftCard({ shift, index, compact = false, showLocalTime = false }) {
  const timezone = shift.shift?.timeZone || 'UTC';
  const userTimezone = getUserTimezone();
  const isDifferentTimezone = timezone !== userTimezone;

  const startTime = formatTimeInTimezone(shift.shift.startTime, timezone, 'HH:mm');
  const endTime = formatTimeInTimezone(shift.shift.endTime, timezone, 'HH:mm');
  const duration = hoursBetween(shift.shift.startTime, shift.shift.endTime, timezone);

  // Calculate local time if needed
  const localStartTime = showLocalTime && isDifferentTimezone 
    ? formatTimeInTimezone(shift.shift.startTime, userTimezone, 'HH:mm')
    : null;
  const localEndTime = showLocalTime && isDifferentTimezone
    ? formatTimeInTimezone(shift.shift.endTime, userTimezone, 'HH:mm')
    : null;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 capitalize">
              {shift.shift.shiftName}
            </h4>
            <TimezoneBadge timezone={timezone} compact />
          </div>
          <Badge variant="secondary" className="text-xs ml-2">
            {duration}h
          </Badge>
        </div>

        {/* Shift timezone times */}
        <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mb-1">
          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="font-mono">{startTime}</span>
          <ArrowRight className="h-3 w-3 mx-2 flex-shrink-0" />
          <span className="font-mono">{endTime}</span>
        </div>

        {/* Local time if different */}
        {showLocalTime && isDifferentTimezone && (
          <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="font-mono">{localStartTime}</span>
            <ArrowRight className="h-3 w-3 mx-2 flex-shrink-0" />
            <span className="font-mono">{localEndTime}</span>
            <Badge variant="outline" className="text-xs ml-2">
              {getTimezoneAbbreviation(userTimezone)}
            </Badge>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/20 rounded-r-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 capitalize mb-1">
            {shift.shift.shiftName}
          </h4>
          <div className="flex items-center gap-2 mb-2">
            <TimezoneBadge timezone={timezone} />
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4 mr-1" />
            <span className="font-mono">{startTime}</span>
            <ArrowRight className="h-4 w-4 mx-2" />
            <span className="font-mono">{endTime}</span>
          </div>
        </div>
        <div className="text-right">
          <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
            {duration} hours
          </Badge>
        </div>
      </div>

      {/* Local time conversion */}
      {showLocalTime && isDifferentTimezone && (
        <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
          <div className="flex items-center text-xs text-muted-foreground mb-1">
            <MapPin className="h-3 w-3 mr-1" />
            <span>Your local time ({getTimezoneAbbreviation(userTimezone)}):</span>
          </div>
          <div className="flex items-center text-sm text-blue-600 dark:text-blue-400 font-mono">
            <span>{localStartTime}</span>
            <ArrowRight className="h-3 w-3 mx-2" />
            <span>{localEndTime}</span>
          </div>
        </div>
      )}
      
      {shift.shift.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {shift.shift.description}
        </p>
      )}
    </motion.div>
  );
}

export default function ModernSchedule() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [allShifts, setAllShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLocalTime, setShowLocalTime] = useState(true);
  const userTimezone = getUserTimezone();

  const fetchShifts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/usershifts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log("Shifts data:", data);
      if (res.ok) setAllShifts(data.data || []);
      else toast.error(data.error || "Failed to fetch shifts.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch shifts.");
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Detect unique timezones in shifts
  const uniqueTimezones = useMemo(() => {
    const tzSet = new Set();
    allShifts.forEach(shift => {
      if (shift.shift?.timeZone) {
        tzSet.add(shift.shift.timeZone);
      }
    });
    return Array.from(tzSet);
  }, [allShifts]);

  const hasMultipleTimezones = uniqueTimezones.length > 1;

  // Group shifts by date for better organization
  const shiftsByDate = useMemo(() => {
    const grouped = {};
    allShifts.forEach((shift) => {
      if (!shift.assignedDate) return;
      const date = parseISO(shift.assignedDate);
      if (isNaN(date.getTime())) return;
      const dateKey = format(date, 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(shift);
    });
    // Sort shifts within each day by start time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => new Date(a.shift.startTime) - new Date(b.shift.startTime));
    });
    return grouped;
  }, [allShifts]);

  const shiftsToday = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return shiftsByDate[dateKey] || [];
  }, [shiftsByDate, selectedDate]);

  const totalHoursToday = useMemo(() => {
    return shiftsToday.reduce((total, shift) => {
      const hours = parseFloat(hoursBetween(shift.shift.startTime, shift.shift.endTime, shift.shift?.timeZone));
      return total + (isNaN(hours) ? 0 : hours);
    }, 0);
  }, [shiftsToday]);

  const totalHoursThisMonth = useMemo(() => {
    return allShifts
      .filter(shift => {
        if (!shift.assignedDate) return false;
        const shiftDate = parseISO(shift.assignedDate);
        return isSameMonth(shiftDate, selectedDate);
      })
      .reduce((total, shift) => {
        const hours = parseFloat(hoursBetween(shift.shift.startTime, shift.shift.endTime, shift.shift?.timeZone));
        return total + (isNaN(hours) ? 0 : hours);
      }, 0);
  }, [allShifts, selectedDate]);

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
  };

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Toaster position="top-center" richColors />
        
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500 text-white shadow-lg">
                <CalendarIcon className="h-6 w-6" />
              </div>
              Schedule
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
              View and manage your upcoming shifts
              {hasMultipleTimezones && (
                <Badge variant="outline" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  Multi-timezone
                </Badge>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={goToToday} className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Today
            </Button>
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href="/dashboard/employee/punch">
                <Clock className="h-4 w-4" />
                Punch
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href="/dashboard/employee/punch-logs">
                <Timer className="h-4 w-4" />
                Logs
              </Link>
            </Button>
            <Button
              onClick={fetchShifts}
              variant="outline"
              size="sm"
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Timezone Info Alert */}
        {hasMultipleTimezones && (
          <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
            <Globe className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <strong>Multiple timezones detected:</strong>{' '}
                  {uniqueTimezones.map((tz, i) => (
                    <span key={tz}>
                      {getTimezoneAbbreviation(tz)}
                      {i < uniqueTimezones.length - 1 && ', '}
                    </span>
                  ))}
                  {' '}| Your timezone: <strong>{getTimezoneAbbreviation(userTimezone)}</strong>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLocalTime(!showLocalTime)}
                  className="text-xs"
                >
                  {showLocalTime ? 'Hide' : 'Show'} Local Times
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
              <div className="h-1 w-full bg-orange-500" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Today's Shifts
                  </CardTitle>
                  <CalendarIcon className="h-4 w-4 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {shiftsToday.length}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {shiftsToday.length === 1 ? 'shift scheduled' : 'shifts scheduled'}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
              <div className="h-1 w-full bg-orange-500" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Hours
                  </CardTitle>
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {totalHoursToday.toFixed(1)}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  hours today
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
              <div className="h-1 w-full bg-orange-500" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    This Month
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {totalHoursThisMonth.toFixed(0)}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  total hours
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enhanced Calendar */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-2"
          >
            <Card className="border-2 shadow-lg">
              <div className="h-1 w-full bg-orange-500" />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-orange-500" />
                      Calendar View
                    </CardTitle>
                    <CardDescription>
                      Click on any date to view shifts for that day
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ModernCalendar
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                  shiftsByDate={shiftsByDate}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Enhanced Day View */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="border-2 shadow-lg">
              <div className="h-1 w-full bg-orange-500" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span className="truncate">{format(selectedDate, 'EEEE, MMM d')}</span>
                </CardTitle>
                <CardDescription>
                  {format(selectedDate, 'yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : shiftsToday.length > 0 ? (
                  <div className="space-y-3">
                    {shiftsToday.map((shift, index) => (
                      <ShiftCard 
                        key={shift.id} 
                        shift={shift} 
                        index={index} 
                        compact 
                        showLocalTime={showLocalTime}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Clock className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      No shifts scheduled
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(selectedDate, 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Enhanced Shift Details Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-2 shadow-lg">
            <div className="h-1 w-full bg-orange-500" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-500" />
                    Shift Details
                  </CardTitle>
                  <CardDescription>
                    Detailed information for {format(selectedDate, 'MMM d, yyyy')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shift Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Timezone</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      {showLocalTime && hasMultipleTimezones && (
                        <TableHead>Local Time</TableHead>
                      )}
                      <TableHead className="text-right">Total Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array(3).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={showLocalTime && hasMultipleTimezones ? 7 : 6}>
                            <Skeleton className="h-8 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : shiftsToday.length > 0 ? (
                      <AnimatePresence>
                        {shiftsToday.map((shift, index) => {
                          const timezone = shift.shift?.timeZone || 'UTC';
                          const isDifferentTz = timezone !== userTimezone;
                          
                          return (
                            <motion.tr
                              key={shift.id}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="hover:bg-gray-50 dark:hover:bg-gray-900/20"
                            >
                              <TableCell className="font-medium capitalize">
                                {shift.shift.shiftName}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {format(parseISO(shift.assignedDate), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>
                                <TimezoneBadge timezone={timezone} compact />
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatTimeInTimezone(shift.shift.startTime, timezone, 'HH:mm')}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatTimeInTimezone(shift.shift.endTime, timezone, 'HH:mm')}
                              </TableCell>
                              {showLocalTime && hasMultipleTimezones && (
                                <TableCell className="text-sm">
                                  {isDifferentTz ? (
                                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                      <MapPin className="h-3 w-3" />
                                      <span className="font-mono">
                                        {formatTimeInTimezone(shift.shift.startTime, userTimezone, 'HH:mm')}
                                        {' - '}
                                        {formatTimeInTimezone(shift.shift.endTime, userTimezone, 'HH:mm')}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </TableCell>
                              )}
                              <TableCell className="text-right">
                                <Badge variant="secondary">
                                  {hoursBetween(shift.shift.startTime, shift.shift.endTime, timezone)} hrs
                                </Badge>
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={showLocalTime && hasMultipleTimezones ? 7 : 6} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                              <Clock className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                              No shifts scheduled
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(selectedDate, 'MMM d, yyyy')}
                            </p>
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
    </TooltipProvider>
  );
}