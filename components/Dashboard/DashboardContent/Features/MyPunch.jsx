/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import useAuthStore from "@/store/useAuthStore";
import { toast, Toaster } from "sonner";
import { Clock, Coffee, Sandwich, MapPin, AlertCircle, Check, Timer, LogOut, LogIn, Loader2, Calendar } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* --------------- tiny helpers -------------------------------------------- */
const fmt = (t = 0) => [Math.floor(t / 3600), Math.floor((t % 3600) / 60), Math.floor(t % 60)].map((n) => String(n).padStart(2, "0")).join(":");

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

/* try to fetch browser geolocation – resolves {lat, lon} OR null,null */
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

/* -------------------------------------------------------------------------- */
export default function MyPunch() {
  const { token } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  /* --------------------- reactive state ---------------------------------- */
  const [loading, setLoading] = useState(false);
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

  /* location status */
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [locationLoading, setLocationLoading] = useState(true);

  /* grab location once on mount */
  useEffect(() => {
    setLocationLoading(true);
    fetchLocation().then((loc) => {
      setLocation(loc);
      setLocationLoading(false);
    });
  }, []);

  /* master interval */
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

  /* initial active-log check */
  useEffect(() => {
    if (!token) return;
    (async () => {
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

            /* coffee */
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
            /* lunch */
            if (active.lunchBreak && active.lunchBreak.start && !active.lunchBreak.end) {
              setLunchActive(true);
              const ls = +new Date(active.lunchBreak.start);
              setLunchStart(ls);
              setLunchElapsed(Math.floor((Date.now() - ls) / 1000));
            }
          }
        }
      } catch {
        /* silent */
      }
    })();
  }, [token, API_URL]);

  /* reset helper */
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

  /* ------------- API helper ---------------------------------------------- */
  async function doCall(endpoint) {
    setLoading(true);

    /* always re-fetch location right before hitting the API */
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

  /* punch -------------------------------------------------------------- */
  const handlePunch = async () => {
    if (isTimedIn && (coffeeActive || lunchActive)) {
      toast.message("End active break first.", {
        description: "You need to end your current break before timing out.",
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      });
      return;
    }
    const ok = await doCall(isTimedIn ? "/time-out" : "/time-in");
    if (!ok) return;

    if (!isTimedIn) {
      const now = Date.now();
      setIsTimedIn(true);
      setTimeInAt(now);
      setElapsed(0);
    } else {
      resetAll();
    }
  };

  /* coffee ------------------------------------------------------------- */
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

  /* lunch -------------------------------------------------------------- */
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

  /* Format time for display */
  const formatTimeDisplay = (timestamp) => {
    if (!timestamp) return "--:--";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* Calculate coffee break progress */
  const coffeeProgress = (coffeeCount / 2) * 100;

  /* ---------------------------------------------------------------- UI --- */
  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-7xl mx-auto px-2 py-6 space-y-8">
        <Toaster position="top-center" richColors />

        {/* Header with title, nav buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-7 w-7 text-orange-500" />
            My Punches
          </h2>

          {/* navigation buttons */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center gap-1" asChild>
              <Link href="/dashboard/my-time-log">
                <Timer className="h-4 w-4" />
                Time&nbsp;Card
              </Link>
            </Button>
            <Button variant="outline" className="flex items-center gap-1" asChild>
              <Link href="/dashboard/my-shift-schedule">
                <Calendar className="h-4 w-4" />
                Schedule
              </Link>
            </Button>
          </div>
        </div>

        {/* status card */}
        <Card className="border-2 shadow-md overflow-hidden dark:border-white/10">
          <div className={`h-1 w-full ${isTimedIn ? "bg-orange-500" : "bg-black/20 dark:bg-white/20"}`} />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-full ${
                    isTimedIn
                      ? "bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-500"
                      : "bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70"
                  }`}
                >
                  <Clock className="h-5 w-5" />
                </div>
                <span>{isTimedIn ? "On the Clock" : "Off the Clock"}</span>
              </div>

              {/* location status */}
              {locationLoading ? (
                <Badge variant="outline" className="animate-pulse">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Locating...
                </Badge>
              ) : location.latitude ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-orange-600 dark:text-orange-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-help">
                      <MapPin className="h-3 w-3 mr-1" /> Location Available
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>GPS location is active and working</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-red-600 dark:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-help">
                      <AlertCircle className="h-3 w-3 mr-1" /> Location Unavailable
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enable location services to punch</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 pt-0">
            {/* Status and time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={isTimedIn ? "default" : "secondary"} className={isTimedIn ? "bg-orange-500 hover:bg-orange-600 dark:bg-orange-500" : ""}>
                  {isTimedIn ? "TIMED IN" : "TIMED OUT"}
                </Badge>
                {timeInAt && <span className="text-sm text-muted-foreground">since {formatTimeDisplay(timeInAt)}</span>}
              </div>

              {isTimedIn && <div className="text-2xl font-mono font-bold">{fmt(elapsed)}</div>}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Metric icon={<Timer className="h-5 w-5" />} label="Work Session" value={fmt(elapsed)} active={isTimedIn} />

              <Metric
                icon={<Coffee className="h-5 w-5" />}
                label="Coffee Break"
                value={fmt(coffeeElapsed)}
                active={coffeeActive}
                progress={coffeeProgress}
                progressLabel={`${coffeeCount}/2 breaks`}
                disabled={!isTimedIn || (!coffeeActive && coffeeCount >= 2)}
              />

              <Metric
                icon={<Sandwich className="h-5 w-5" />}
                label="Lunch Break"
                value={fmt(lunchElapsed)}
                active={lunchActive}
                disabled={!isTimedIn || (!lunchActive && lunchElapsed > 0)}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2 pb-6">
            {/* main punch button */}
            <Button
              size="lg"
              className={`w-full text-lg font-bold h-14 transition-all  ${
                isTimedIn
                  ? "bg-black hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }`}
              disabled={loading}
              onClick={handlePunch}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : isTimedIn ? (
                <>
                  <LogOut className="h-5 w-5 mr-2" /> TIME OUT
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" /> TIME IN
                </>
              )}
            </Button>

            {/* break buttons */}
            {isTimedIn && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant={coffeeActive ? "secondary" : "outline"}
                        className={`w-full transition-all ${
                          coffeeActive
                            ? "bg-orange-500/10 text-orange-700 border-orange-500/30 hover:bg-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30 dark:hover:bg-orange-500/30"
                            : coffeeCount >= 2
                            ? "opacity-60"
                            : "border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                        }`}
                        disabled={loading || (!coffeeActive && coffeeCount >= 2)}
                        onClick={handleCoffee}
                      >
                        <Coffee className="h-4 w-4 mr-2" />
                        {coffeeActive ? "End Coffee Break" : "Start Coffee Break"}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!coffeeActive && coffeeCount >= 2 && (
                    <TooltipContent>
                      <p>You've reached your coffee break limit (2/2)</p>
                    </TooltipContent>
                  )}
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant={lunchActive ? "secondary" : "outline"}
                        className={`w-full transition-all ${
                          lunchActive
                            ? "bg-orange-500/10 text-orange-700 border-orange-500/30 hover:bg-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30 dark:hover:bg-orange-500/30"
                            : lunchElapsed > 0
                            ? "opacity-60"
                            : "border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
                        }`}
                        disabled={loading || (!lunchActive && lunchElapsed > 0)}
                        onClick={handleLunch}
                      >
                        <Sandwich className="h-4 w-4 mr-2" />
                        {lunchActive ? "End Lunch Break" : "Start Lunch Break"}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!lunchActive && lunchElapsed > 0 && (
                    <TooltipContent>
                      <p>You've already taken your lunch break today</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            )}
          </CardFooter>
        </Card>

        {/* Quick stats summary */}
        <Card className="border dark:border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Work Time</p>
                <p className="text-lg font-semibold">{fmt(elapsed)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Coffee Breaks</p>
                <p className="text-lg font-semibold">{coffeeCount}/2</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Lunch Break</p>
                <p className="text-lg font-semibold">{lunchElapsed > 0 ? "Taken" : "Not Taken"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

/* Enhanced metric tile ------------------------------------------------------- */
function Metric({ icon, label, value, active, progress, progressLabel, disabled }) {
  return (
    <div
      className={`rounded-lg border p-4 transition-all ${disabled ? "opacity-60" : ""} ${
        active
          ? "bg-orange-500/10 border-orange-500/30 dark:bg-orange-500/20 dark:border-orange-500/30"
          : "bg-black/5 border-black/10 dark:bg-white/5 dark:border-white/10"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`p-1.5 rounded-full ${
            active ? "bg-white text-orange-500 dark:bg-black/50 dark:text-orange-500" : "bg-white text-black/70 dark:bg-black/50 dark:text-white/70"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{label}</p>
        </div>
        {active && (
          <Badge
            variant="outline"
            className="bg-white/80 text-xs text-orange-500 border-orange-500/30 dark:bg-black/50 dark:text-orange-500 dark:border-orange-500/30"
          >
            Active
          </Badge>
        )}
      </div>

      <div className="font-mono text-xl font-bold text-center my-2">{value}</div>

      {progress !== undefined && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Coffee Breaks</span>
            <span className="text-muted-foreground">{progressLabel}</span>
          </div>
          <Progress value={progress} className="h-2 [&>div]:bg-orange-500 bg-black/10 dark:bg-white/10" />
        </div>
      )}
    </div>
  );
}
