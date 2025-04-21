/* -------------------------------------------------------------------------- */
/*  Overview / Analytics – fixed role handling (pure JS)                      */
/* -------------------------------------------------------------------------- */
"use client";

import { useState, useEffect, useMemo } from "react";
import useAuthStore from "@/store/useAuthStore";
import { toast, Toaster } from "sonner";
import { ResponsiveContainer, BarChart, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Line } from "recharts";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ───────────────────────── helpers ────────────────────────── */
const money = (v = 0) =>
  Number(v).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const neat = (x = 0) => (x >= 1_000_000 ? `${(x / 1_000_000).toFixed(1)} M` : x >= 1_000 ? `${(x / 1_000).toFixed(1)} k` : x.toString());

/* map variants / typos → canonical role */
const mapRole = (raw = "") => {
  const r = raw.toString().trim().toLowerCase();
  if (r.startsWith("super")) return "superadmin";
  if (["admin", "administrator"].includes(r)) return "admin";
  if (r.startsWith("supervisor")) return "supervisor";
  return "employee";
};

/* which tabs each role may open */
const TABS = ["superadmin", "admin", "supervisor", "employee"];
const ACCESS = {
  superadmin: TABS,
  admin: ["admin", "supervisor", "employee"],
  supervisor: ["supervisor", "employee"],
  employee: ["employee"],
};

/* extract role from several possible places */
function useEffectiveRole(token, user) {
  return useMemo(() => {
    /* 1) store value */
    if (user?.role) return mapRole(user.role);

    /* 2) JWT payload */
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1] || ""));
        if (payload.role || payload.userRole) return mapRole(payload.role || payload.userRole);
      } catch {
        /* ignore */
      }
    }

    /* 3) localStorage fallback (optional) */
    if (typeof window !== "undefined") {
      const ls = localStorage.getItem("bb_role");
      if (ls) return mapRole(ls);
    }

    return "employee";
  }, [token, user?.role]);
}

/* small stat tile ---------------------------------------------------------- */
const Stat = ({ title, value }) => (
  <Card>
    <CardHeader className="pb-1">
      <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold">{value}</p>
    </CardContent>
  </Card>
);

/* quick loading skeleton */
const SkeletonGrid = (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i} className="p-6">
        <Skeleton className="h-6 w-2/3 mb-4" />
        <Skeleton className="h-8 w-full" />
      </Card>
    ))}
  </div>
);

/* ─────────────────────────── component ──────────────────────────────────── */
export default function Overview() {
  const { token, user } = useAuthStore();
  const role = useEffectiveRole(token, user); // ← fixed
  const allowedTabs = ACCESS[role];

  /* active tab */
  const [activeTab, setActiveTab] = useState(allowedTabs[0]);

  /* if the role changes, ensure we are on an allowed tab */
  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) setActiveTab(allowedTabs[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  /* ---------------------------------------------------------------------- */
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [dailyHours, setDailyHours] = useState(null);

  /* fetch whenever tab changes ------------------------------------------- */
  useEffect(() => {
    if (!token) return;
    let cancel = false;

    (async () => {
      try {
        setLoading(true);
        setData(null);
        setDailyHours(null);

        const mainReq = fetch(`${API}/api/analytics/${activeTab}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());

        const hoursReq = fetch(`${API}/api/analytics/${activeTab}/daily-hours-30`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);

        const [m, h] = await Promise.all([mainReq, hoursReq]);

        if (cancel) return;

        if (m && m.success !== false) setData(m.data);
        else throw new Error(m?.message || "Failed to load summary");

        if (h && h.success !== false) setDailyHours(h.data);
      } catch (err) {
        console.error(err);
        toast.message(err.message || "Failed to load data");
      } finally {
        !cancel && setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [API, token, activeTab]);

  /* simple reusable daily‑hours line chart */
  const DailyHoursChart = () =>
    dailyHours && dailyHours.length ? (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Daily Hours – last 30 days</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="hours" stroke="#fb923c" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    ) : null;

  /* render according to tab ---------------------------------------------- */
  const renderTab = () => {
    if (loading) return SkeletonGrid;
    if (!data) return <p className="text-muted-foreground">No data.</p>;

    switch (activeTab) {
      case "superadmin":
        return (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Stat title="Companies" value={neat(data.companyCount)} />
              <Stat title="Users" value={neat(data.userCount)} />
              <Stat title="Subscriptions" value={neat(data.subscriptionCount)} />
              <Stat title="Revenue" value={money(data.totalRevenue)} />
              <Stat title="Hours (30 d)" value={neat(data.totalHoursMonth)} />
            </div>
            <DailyHoursChart />
          </>
        );

      case "admin":
        return (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Stat title="Employees" value={neat(data.employeeCount)} />
              <Stat title="Departments" value={neat(data.departmentCount)} />
              <Stat title="Hours (30 d)" value={neat(data.totalHoursMonth)} />
              <Stat title="Punches (30 d)" value={neat((data.punchesPerDept || []).reduce((t, d) => t + d.punches, 0))} />
            </div>

            {Array.isArray(data.punchesPerDept) && data.punchesPerDept.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Punches per Department (30 d)</CardTitle>
                </CardHeader>
                <CardContent style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.punchesPerDept}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="punches" fill="#fb923c" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            <DailyHoursChart />
          </>
        );

      case "supervisor":
        return (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              <Stat title="Punches (30 d)" value={neat(data.punches)} />
              <Stat title="Hours (30 d)" value={neat(data.totalHoursMonth)} />
            </div>
            <DailyHoursChart />
          </>
        );

      default: // employee
        return (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              <Stat title="Punches (30 d)" value={neat(data.punches)} />
              <Stat title="Hours (7 d)" value={neat(data.totalHoursWeek)} />
              <Stat title="Hours (30 d)" value={neat(data.totalHoursMonth)} />
            </div>
            <DailyHoursChart />
          </>
        );
    }
  };

  /* ---------------------------------------------------------------------- */
  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4">
      <Toaster position="top-center" />

      {/* header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          Overview / Analytics
          {/* quick role chip */}
          <Badge variant="outline" className="capitalize">
            {role}
          </Badge>
        </h2>

        {/* section buttons */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const disabled = !allowedTabs.includes(tab);
            return (
              <Button
                key={tab}
                disabled={disabled}
                onClick={() => !disabled && setActiveTab(tab)}
                className={cn(
                  buttonVariants({
                    variant: tab === activeTab && !disabled ? "default" : "outline",
                    size: "sm",
                  }),
                  "capitalize",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {tab}
              </Button>
            );
          })}
        </div>
      </div>

      {/* body */}
      {renderTab()}
    </div>
  );
}
