/* components/Dashboard/DashboardContent/TimeKeeping/Punch.jsx */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import useAuthStore from "@/store/useAuthStore";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Coffee,
  Sandwich,
  MapPin,
  AlertCircle,
  Check,
  Timer,
  LogOut,
  LogIn,
  Loader2,
  Calendar,
  RefreshCw,
  Play,
  Pause,
  Activity,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const fmt = (t = 0) =>
  [Math.floor(t / 3600), Math.floor((t % 3600) / 60), Math.floor(t % 60)].map((n) => String(n).padStart(2, "0")).join(":");

const getDeviceInfo = () =>
  typeof window === "undefined"
    ? {}
    : {
        brand: "web",
        manufacturer: "web",
        modelName: navigator.platform,
        modelId: navigator.userAgent,
        osName: navigator.userAgentData?.platform || "browser",
        osVersion: navigator.userAgent,
        deviceName: navigator.vendor || "browser",
      };

function fetchLocation() {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve({ latitude: null, longitude: null });

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve({ latitude: null, longitude: null }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

export default function Punch() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isTimedIn, setIsTimedIn] = useState(false);
  const [timeInAt, setTimeInAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [coffeeActive, setCoffeeActive] = useState(false);
  const [coffeeStart, setCoffeeStart] = useState(null);
  const [coffeeElapsed, setCoffeeElapsed] = useState(0);
  const [coffeeCount, setCoffeeCount] = useState(0);
  const [lunchActive, setLunchActive] = useState(false);
  const [lunchStart, setLunchStart] = useState(null);
  const [lunchElapsed, setLunchElapsed] = useState(0);
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [locationLoading, setLocationLoading] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    setLocationLoading(true);
    fetchLocation().then((loc) => {
      setLocation(loc);
      setLocationLoading(false);
    });
  }, []);

  const fetchActiveLog = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/timelogs/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (res.ok && Array.isArray(d.data)) {
        const active = d.data.find((l) => l.status);
        if (active) {
          setIsTimedIn(true);
          const ti = +new Date(active.timeIn);
          setTimeInAt(ti);
          setElapsed(Math.floor((Date.now() - ti) / 1000));

          if (active.coffeeBreaks?.length) {
            const last = active.coffeeBreaks.at(-1);
            setCoffeeCount(active.coffeeBreaks.length - (last?.end ? 0 : 1));
            if (last && !last.end) {
              setCoffeeActive(true);
              const cs = +new Date(last.start);
              setCoffeeStart(cs);
              setCoffeeElapsed(Math.floor((Date.now() - cs) / 1000));
            }
          }
          if (active.lunchBreak && active.lunchBreak.start && !active.lunchBreak.end) {
            setLunchActive(true);
            const ls = +new Date(active.lunchBreak.start);
            setLunchStart(ls);
            setLunchElapsed(Math.floor((Date.now() - ls) / 1000));
          }
        } else {
          resetAll();
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchActiveLog();
  }, [token]);

  const intervalRef = useRef(null);
  useEffect(() => {
    if (isTimedIn) {
      intervalRef.current = setInterval(() => {
        if (timeInAt) setElapsed(Math.floor((Date.now() - timeInAt) / 1000));
        if (coffeeActive && coffeeStart) setCoffeeElapsed(Math.floor((Date.now() - coffeeStart) / 1000));
        if (lunchActive && lunchStart) setLunchElapsed(Math.floor((Date.now() - lunchStart) / 1000));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isTimedIn, coffeeActive, lunchActive, timeInAt, coffeeStart, lunchStart]);

  const resetAll = () => {
    setIsTimedIn(false);
    setTimeInAt(null);
    setElapsed(0);

    setCoffeeActive(false);
    setCoffeeStart(null);
    setCoffeeElapsed(0);
    setCoffeeCount(0);

    setLunchActive(false);
    setLunchStart(null);
    setLunchElapsed(0);
  };

  async function doCall(endpoint) {
    setLoading(true);
    setLocationLoading(true);
    const loc = await fetchLocation();
    setLocation(loc);
    setLocationLoading(false);

    if (!loc.latitude && !loc.longitude) {
      toast.message("Location services disabled or location data unavailable. Please allow location to punch.", {
        description: "Check your browser settings and try again.",
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
        duration: 5000,
      });
      setLoading(false);
      return false;
    }

    try {
      const res = await fetch(`${API_URL}/api/timelogs${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deviceInfo: getDeviceInfo(),
          location: loc,
          localTimestamp: new Date().toISOString(),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Request failed");

      toast.message(d.message || "Success", {
        icon: <Check className="h-5 w-5 text-orange-500" />,
      });
      return true;
    } catch (e) {
      toast.message(e.message, {
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
        duration: 5000,
      });
      return false;
    } finally {
      setLoading(false);
    }
  }

  const handlePunch = async () => {
    if (isTimedIn && (coffeeActive || lunchActive)) {
      toast.message("End active break first.", {
        description: "You need to end your current break before timing out.",
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      });
      return;
    }

    setConfirmAction(isTimedIn ? "timeout" : "timein");
    setConfirmDialogOpen(true);
  };

  const confirmPunch = async () => {
    const ok = await doCall(confirmAction === "timeout" ? "/time-out" : "/time-in");
    if (!ok) return;

    if (confirmAction === "timein") {
      const now = Date.now();
      setIsTimedIn(true);
      setTimeInAt(now);
      setElapsed(0);
    } else {
      resetAll();
    }

    setConfirmDialogOpen(false);
    setConfirmAction(null);
  };

  const handleCoffee = async () => {
    if (!isTimedIn) {
      toast.message("You must be timed-in.", {
        description: "Time in first before taking a coffee break.",
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      });
      return;
    }

    if (!coffeeActive && coffeeCount >= 2) {
      toast.message("Coffee-break limit reached.", {
        description: "You've already taken your allowed coffee breaks for today.",
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      });
      return;
    }

    const ok = await doCall(coffeeActive ? "/coffee-break/end" : "/coffee-break/start");
    if (!ok) return;

    if (coffeeActive) {
      setCoffeeActive(false);
      setCoffeeStart(null);
      setCoffeeElapsed(0);
      setCoffeeCount((c) => c + 1);
    } else {
      const now = Date.now();
      setCoffeeActive(true);
      setCoffeeStart(now);
      setCoffeeElapsed(0);
    }
  };

  const handleLunch = async () => {
    if (!isTimedIn) {
      toast.message("You must be timed-in.", {
        description: "Time in first before taking a lunch break.",
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      });
      return;
    }

    if (!lunchActive && lunchElapsed > 0) {
      toast.message("Lunch break already taken.", {
        description: "You've already taken your lunch break for today.",
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      });
      return;
    }

    const ok = await doCall(lunchActive ? "/lunch-break/end" : "/lunch-break/start");
    if (!ok) return;

    if (lunchActive) {
      setLunchActive(false);
      setLunchStart(null);
      setLunchElapsed(0);
    } else {
      const now = Date.now();
      setLunchActive(true);
      setLunchStart(now);
      setLunchElapsed(0);
    }
  };

  const refreshStatus = () => {
    setRefreshing(true);
    fetchActiveLog().finally(() => setRefreshing(false));
  };

  const formatTimeDisplay = (timestamp) => {
    if (!timestamp) return "--:--";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const coffeeProgress = (coffeeCount / 2) * 100;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-5xl mx-auto p-4 lg:px-8 space-y-8">
        <Toaster position="top-center" />
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-2"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3 ">
              <div className="p-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
                <Clock className="h-8 w-8" />
              </div>
              Punch
            </h2>
          </div>
          <div className="flex gap-3 items-center">
            <Button variant="outline" className="flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black" asChild>
              <Link href="/dashboard/employee/punch-logs">
                <Timer className="h-4 w-4" />
                Punch logs
              </Link>
            </Button>

            <IconBtn
              className="outline-none flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-black"
              icon={RefreshCw}
              tooltip="Refresh"
              spinning={refreshing}
              onClick={refreshStatus}
            />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-2 shadow-xl overflow-hidden bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-800">
            <div
              className={`h-2 w-full ${
                isTimedIn
                  ? "bg-orange-500"
                  : "bg-gradient-to-r from-neutral-300 to-neutral-400 dark:from-neutral-600 dark:to-neutral-700"
              }`}
            />

            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: isTimedIn ? [1, 1.1, 1] : 1 }}
                    transition={{ repeat: isTimedIn ? Number.POSITIVE_INFINITY : 0, duration: 2 }}
                    className={`p-3 rounded-2xl ${
                      isTimedIn
                        ? "bg-orange-500 text-white shadow-lg"
                        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                    }`}
                  >
                    {isTimedIn ? <Activity className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                  </motion.div>
                  <div>
                    <span className="text-2xl font-bold">{isTimedIn ? "On the Clock" : "Off the Clock"}</span>
                    {timeInAt && <p className="text-sm text-muted-foreground">Started at {formatTimeDisplay(timeInAt)}</p>}
                  </div>
                </div>

                <AnimatePresence>
                  {locationLoading ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Badge variant="outline" className="animate-pulse">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Locating...
                      </Badge>
                    </motion.div>
                  ) : location.latitude ? (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800 cursor-help">
                            <MapPin className="h-3 w-3 mr-1" /> Location Active
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>GPS location is active and working</p>
                        </TooltipContent>
                      </Tooltip>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 cursor-help">
                            <AlertCircle className="h-3 w-3 mr-1" /> Location Required
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Enable location services to punch in/out</p>
                        </TooltipContent>
                      </Tooltip>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-8 pt-0">
              <div className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-4">
                  <Badge
                    className={`px-4 py-2 text-sm font-semibold ${
                      isTimedIn
                        ? "bg-orange-500 text-white shadow-md"
                        : "bg-gradient-to-r from-neutral-500 to-neutral-600 text-white"
                    }`}
                  >
                    {isTimedIn ? "ACTIVE SESSION" : "NO ACTIVE SESSION"}
                  </Badge>
                  {timeInAt && <span className="text-sm text-muted-foreground">Started at {formatTimeDisplay(timeInAt)}</span>}
                </div>
                {isTimedIn && (
                  <motion.div
                    key={elapsed}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="text-4xl font-mono font-bold text-orange-600 dark:text-orange-400"
                  >
                    {fmt(elapsed)}
                  </motion.div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Metric icon={<Timer className="h-6 w-6" />} label="Work Session" value={fmt(elapsed)} active={isTimedIn} />
                <Metric
                  icon={<Coffee className="h-6 w-6" />}
                  label="Coffee Break"
                  value={fmt(coffeeElapsed)}
                  active={coffeeActive}
                  progress={coffeeProgress}
                  progressLabel={`${coffeeCount}/2 breaks`}
                  disabled={!isTimedIn || (!coffeeActive && coffeeCount >= 2)}
                />
                <Metric
                  icon={<Sandwich className="h-6 w-6" />}
                  label="Lunch Break"
                  value={fmt(lunchElapsed)}
                  active={lunchActive}
                  disabled={!isTimedIn || (!lunchActive && lunchElapsed > 0)}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-6 pt-4 pb-8">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
                <Button
                  size="lg"
                  className={`w-full text-xl font-bold h-16 transition-all shadow-lg ${
                    isTimedIn
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-gradient-to-r from-orange-500 to-orange-500 hover:from-orange-600 hover:to-orange-600 text-white"
                  }`}
                  disabled={loading}
                  onClick={handlePunch}
                >
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin mr-3" />
                  ) : isTimedIn ? (
                    <>
                      <LogOut className="h-6 w-6 mr-3" /> TIME OUT
                    </>
                  ) : (
                    <>
                      <LogIn className="h-6 w-6 mr-3" /> TIME IN
                    </>
                  )}
                </Button>
              </motion.div>

              <AnimatePresence>
                {isTimedIn && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            variant="outline"
                            className={`w-full h-14 transition-all border-2 ${
                              coffeeActive
                                ? "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-300 hover:from-orange-200 hover:to-orange-300 dark:from-orange-900 dark:to-orange-800 dark:text-orange-200 dark:border-orange-700"
                                : coffeeCount >= 2
                                ? "opacity-60 cursor-not-allowed"
                                : "border-orange-300 text-orange-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 dark:border-orange-700 dark:text-orange-400 dark:hover:from-orange-950 dark:hover:to-orange-900"
                            }`}
                            disabled={loading || (!coffeeActive && coffeeCount >= 2)}
                            onClick={handleCoffee}
                          >
                            {coffeeActive ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                            <Coffee className="h-5 w-5 mr-2" />
                            {coffeeActive ? "End Coffee Break" : "Start Coffee Break"}
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      {!coffeeActive && coffeeCount >= 2 && (
                        <TooltipContent>
                          <p>You've reached your coffee break limit (2/2)</p>
                        </TooltipContent>
                      )}
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            variant="outline"
                            className={`w-full h-14 transition-all border-2 ${
                              lunchActive
                                ? "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-300 hover:from-orange-200 hover:to-orange-300 dark:from-orange-900 dark:to-orange-800 dark:text-orange-200 dark:border-orange-700"
                                : lunchElapsed > 0
                                ? "opacity-60 cursor-not-allowed"
                                : "border-orange-300 text-orange-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 dark:border-orange-700 dark:text-orange-400 dark:hover:from-orange-950 dark:hover:to-orange-900"
                            }`}
                            disabled={loading || (!lunchActive && lunchElapsed > 0)}
                            onClick={handleLunch}
                          >
                            {lunchActive ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                            <Sandwich className="h-5 w-5 mr-2" />
                            {lunchActive ? "End Lunch Break" : "Start Lunch Break"}
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      {!lunchActive && lunchElapsed > 0 && (
                        <TooltipContent>
                          <p>You've already taken your lunch break today</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-2 shadow-lg bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-800">
            <div className="h-1 w-full bg-orange-500" />
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500 text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                Today's Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryItem label="Work Time" value={fmt(elapsed)} icon={<Timer className="h-5 w-5" />} color="blue" />
                <SummaryItem
                  label="Coffee Breaks"
                  value={`${coffeeCount}/2`}
                  icon={<Coffee className="h-5 w-5" />}
                  color="orange"
                />
                <SummaryItem
                  label="Lunch Break"
                  value={lunchElapsed > 0 ? "Taken" : "Not Taken"}
                  icon={<Sandwich className="h-5 w-5" />}
                  color="orange"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="sm:max-w-md border-2 bg-gradient-to-br from-white to-orange-50 dark:from-neutral-900 dark:to-orange-950">
            <div className="h-2 w-full bg-orange-500 -mt-6 mb-4 rounded-t-lg" />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500 text-white">
                  {confirmAction === "timein" ? <LogIn className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
                </div>
                Confirm {confirmAction === "timein" ? "Time In" : "Time Out"}
              </DialogTitle>
              <DialogDescription>
                {confirmAction === "timein"
                  ? "Are you sure you want to start your work session? Make sure you're at your designated work location."
                  : "Are you sure you want to end your work session? This will complete your current time log entry."}
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 rounded-xl bg-orange-100 dark:bg-orange-900 border border-orange-300 dark:border-orange-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500 text-white">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Current Time</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={confirmPunch}
                disabled={loading}
                className={
                  confirmAction === "timein"
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : confirmAction === "timein" ? (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Confirm Time In
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Confirm Time Out
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function Metric({ icon, label, value, active, progress, progressLabel, disabled }) {
  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      className={`rounded-2xl border-2 p-6 transition-all shadow-lg ${disabled ? "opacity-60" : ""} ${
        active
          ? `bg-orange-500 text-white shadow-xl`
          : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:shadow-xl"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`p-3 rounded-xl ${
            active
              ? "bg-white/20 text-white"
              : "bg-gradient-to-r from-neutral-100 to-neutral-200 text-neutral-600 dark:from-neutral-800 dark:to-neutral-700 dark:text-neutral-400"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${active ? "text-white/90" : "text-neutral-600 dark:text-neutral-400"}`}>{label}</p>
        </div>
        {active && <Badge className="bg-white/20 text-white border-white/30 text-xs">Active</Badge>}
      </div>

      <div
        className={`font-mono text-3xl font-bold text-center my-4 ${
          active ? "text-white" : "text-neutral-800 dark:text-neutral-200"
        }`}
      >
        {value}
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-2">
            <span className={active ? "text-white/80" : "text-muted-foreground"}>Coffee Breaks</span>
            <span className={active ? "text-white/80" : "text-muted-foreground"}>{progressLabel}</span>
          </div>
          <Progress
            value={progress}
            className={`h-2 ${
              active ? "[&>div]:bg-white/80 bg-white/20" : "[&>div]:bg-orange-500 bg-neutral-200 dark:bg-neutral-700"
            }`}
          />
        </div>
      )}
    </motion.div>
  );
}

function SummaryItem({ label, value, icon, color }) {
  const colorClasses = {
    blue: "bg-orange-500",
    orange: "bg-orange-500",
    orange: "bg-orange-500",
  };

  return (
    <div className="text-center p-4 rounded-xl bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-700 border border-neutral-200 dark:border-neutral-600">
      <div className={`inline-flex p-3 rounded-xl ${colorClasses[color]} text-white mb-3`}>{icon}</div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{value}</p>
    </div>
  );
}

const IconBtn = ({ icon: Icon, tooltip, spinning, ...props }) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
          {...props}
        >
          <Icon className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
