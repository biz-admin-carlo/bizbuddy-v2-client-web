/* eslint-disable react-hooks/exhaustive-deps */
"use client";

/**
 * OverviewDashboard
 * -------------------------------------------------
 * • Four role-scoped buttons + a Refresh icon
 * • Real-time role detection from /api/account/profile
 * • ENDPOINTS
 *      super-admin  → /api/company/all , /api/employee?all=1
 *      admin        → /api/departments , /api/employee , /api/timelogs
 *      supervisor   → /api/employee        (filter by departmentId)
 *      employee     → /api/timelogs/user , /api/usershifts   ⬅︎ NEW
 * • Skeletons for every view while data loads
 * • Employee analytics now use **only** assigned shifts.
 *   – A day with *no* shift is ignored for Overtime /
 *     Absence / Late-clock-in calculations.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building, Users, BarChart3, UserCheck, User, Briefcase, TimerReset, Clock, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line, Tooltip as RTooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster, toast } from "sonner";
import useAuthStore from "@/store/useAuthStore";

/* ───────────────────────── helpers / small comps ───────────────────────── */
const COLORS = ["#f97316", "#fb923c", "#fdba74", "#ecc94b", "#facc15", "#d97706", "#ea580c"];

const ChartCard = ({ title, children }) => (
  <Card className="border-2 dark:border-white/10 overflow-hidden">
    <div className="h-1 w-full bg-orange-500" />
    <CardHeader className="py-2 px-4">
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="h-72">{children}</CardContent>
  </Card>
);

const PieSimple = ({ data }) => (
  <ResponsiveContainer>
    <PieChart>
      <Pie data={data} dataKey="value" nameKey="name" outerRadius={80} label>
        {data.map((_, i) => (
          <Cell key={i} fill={COLORS[i % COLORS.length]} />
        ))}
      </Pie>
      <RTooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

const BarSimple = ({ data, x, y }) => (
  <ResponsiveContainer>
    <BarChart data={data}>
      <XAxis dataKey={x} />
      <YAxis />
      <Bar dataKey={y} />
      <RTooltip />
    </BarChart>
  </ResponsiveContainer>
);

const LineSimple = ({ data, x, y }) => (
  <ResponsiveContainer>
    <LineChart data={data}>
      <XAxis dataKey={x} />
      <YAxis />
      <Line type="monotone" dataKey={y} stroke="#f97316" />
      <RTooltip />
    </LineChart>
  </ResponsiveContainer>
);

const diffHours = (tin, tout) => (tin && tout ? (new Date(tout).getTime() - new Date(tin).getTime()) / 36e5 : 0);

const hoursBetween = (startISO, endISO) => diffHours(startISO, endISO);
const addMinutes = (date, mins) => new Date(date.getTime() + mins * 60000);

/* ───────────────────────── component ───────────────────────── */
export default function OverviewDashboard() {
  const { token } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;

  /* ─────────────── profile (who-am-I) ─────────────── */
  const [me, setMe] = useState(null);
  const [loadingProfile, setLP] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    setLP(true);
    try {
      const r = await fetch(`${API}/api/account/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Profile fetch error");
      const d = j.data;
      setMe({
        id: d.user.id,
        username: d.user.username,
        role: d.user.role.toLowerCase(),
        companyId: d.company?.id || null,
        companyPlan: d.subscription?.plan?.name || "Free",
        departmentId: d.department?.id || null,
        departmentName: d.department?.name || null,
      });
    } catch (e) {
      toast.message(e.message);
    } finally {
      setLP(false);
    }
  }, [API, token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /* ─────────────── SUPER-ADMIN data ─────────────── */
  const [allCompanies, setAllCompanies] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loadingSuper, setLSuper] = useState(false);

  const fetchSuperData = useCallback(async () => {
    if (!token) return;
    setLSuper(true);
    try {
      const [cR, eR] = await Promise.all([
        fetch(`${API}/api/company/all`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/employee?all=1`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [cJ, eJ] = await Promise.all([cR.json(), eR.json()]);
      cR.ok ? setAllCompanies(cJ.data || []) : toast.message(cJ.error || "Company fetch failed");
      eR.ok ? setAllEmployees(eJ.data || []) : toast.message(eJ.error || "Employee fetch failed");
    } catch {
      toast.message("Network error while fetching super-admin data");
    }
    setLSuper(false);
  }, [API, token]);

  /* ─────────────── ADMIN (company) data ─────────────── */
  const [companyDepartments, setCompanyDepartments] = useState([]);
  const [companyEmployees, setCompanyEmployees] = useState([]);
  const [companyTimelogs, setCompanyTimelogs] = useState([]);
  const [loadingAdmin, setLAdmin] = useState(false);

  const fetchAdminData = useCallback(async () => {
    if (!token) return;
    setLAdmin(true);
    try {
      const [dR, eR, tR] = await Promise.all([
        fetch(`${API}/api/departments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/employee`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/timelogs`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [dJ, eJ, tJ] = await Promise.all([dR.json(), eR.json(), tR.json()]);
      dR.ok ? setCompanyDepartments(dJ.data || []) : toast.message(dJ.error || "Department fetch failed");
      eR.ok ? setCompanyEmployees(eJ.data || []) : toast.message(eJ.error || "Employee fetch failed");
      tR.ok ? setCompanyTimelogs(tJ.data || []) : toast.message(tJ.error || "Timelog fetch failed");
    } catch {
      toast.message("Network error while fetching admin data");
    }
    setLAdmin(false);
  }, [API, token]);

  /* ─────────────── EMPLOYEE timelogs + shifts ─────────────── */
  const [myLogs, setMyLogs] = useState([]);
  const [loadingLogs, setLLogs] = useState(false);
  const [myShifts, setMyShifts] = useState([]);
  const [loadingShift, setLShift] = useState(false);

  const fetchMyLogs = useCallback(async () => {
    if (!token) return;
    setLLogs(true);
    try {
      const r = await fetch(`${API}/api/timelogs/user`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      r.ok ? setMyLogs(j.data || []) : toast.message(j.error || "Timelogs fetch failed");
    } catch {
      toast.message("Network error while fetching timelogs");
    }
    setLLogs(false);
  }, [API, token]);

  const fetchMyShifts = useCallback(async () => {
    if (!token) return;
    setLShift(true);
    try {
      const r = await fetch(`${API}/api/usershifts`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      r.ok ? setMyShifts(j.data || []) : toast.message(j.error || "Shift fetch failed");
    } catch {
      toast.message("Network error while fetching shifts");
    }
    setLShift(false);
  }, [API, token]);

  /* ─────────────── SUPERVISOR team data ─────────────── */
  const [teamEmployees, setTeamEmployees] = useState([]);
  const [loadingSup, setLSup] = useState(false);

  const fetchSupervisorData = useCallback(async () => {
    if (!token || !me?.departmentId) return;
    setLSup(true);
    try {
      const r = await fetch(`${API}/api/employee?departmentId=${me.departmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      r.ok ? setTeamEmployees(j.data || []) : toast.message(j.error || "Team fetch failed");
    } catch {
      toast.message("Network error while fetching team");
    }
    setLSup(false);
  }, [API, token, me?.departmentId]);

  /* ─────────────── tab buttons & mode ─────────────── */
  const roleButtons = useMemo(() => {
    if (!me) return [];
    switch (me.role) {
      case "superadmin":
        return ["super", "admin", "employee"];
      case "admin":
        return ["admin", "employee"];
      case "supervisor":
        return me.departmentId ? ["supervisor"] : ["employee"];
      default:
        return ["employee"];
    }
  }, [me]);

  const [mode, setMode] = useState("employee");
  useEffect(() => {
    if (roleButtons.length) setMode(roleButtons[0]);
  }, [roleButtons]);

  /* ─────────────── fetch on mode switch ─────────────── */
  useEffect(() => {
    if (mode === "super") fetchSuperData();
    if (mode === "admin") fetchAdminData();
    if (mode === "employee") {
      fetchMyLogs();
      fetchMyShifts();
    }
    if (mode === "supervisor") fetchSupervisorData();
  }, [mode, fetchSuperData, fetchAdminData, fetchMyLogs, fetchMyShifts, fetchSupervisorData]);

  /* ─────────────── refresh icon ─────────────── */
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    if (mode === "super") await fetchSuperData();
    if (mode === "admin") await fetchAdminData();
    if (mode === "employee") {
      await fetchMyLogs();
      await fetchMyShifts();
    }
    if (mode === "supervisor") await fetchSupervisorData();
    setRefreshing(false);
  };

  /* ─────────────── analytics builders ─────────────── */
  const analytics = useMemo(() => {
    if (!me || loadingProfile) return null;

    /* -------- SUPER-ADMIN -------- */
    if (mode === "super") {
      if (loadingSuper) return null;

      const planMix = {};
      allCompanies.forEach((c) => {
        const plan = c.Subscription?.find((s) => s.active)?.plan?.name || "None";
        planMix[plan] = (planMix[plan] || 0) + 1;
      });
      const planArr = Object.entries(planMix).map(([name, value]) => ({ name, value }));

      const monthlyCompanies = {};
      allCompanies.forEach((c) => {
        const d = (c.createdAt || "").slice(0, 7);
        if (d) monthlyCompanies[d] = (monthlyCompanies[d] || 0) + 1;
      });
      const monthlyArr = Object.entries(monthlyCompanies)
        .sort()
        .map(([month, count]) => ({ month, count }));

      const hires = {};
      allEmployees.forEach((e) => {
        const d = (e.createdAt || "").slice(0, 7);
        if (d) hires[d] = (hires[d] || 0) + 1;
      });
      const hiresArr = Object.entries(hires)
        .sort()
        .map(([month, count]) => ({ month, count }));

      return {
        cards: [
          { icon: <Building className="h-6 w-6 text-orange-500" />, label: "Companies", value: allCompanies.length },
          { icon: <Users className="h-6 w-6 text-orange-500" />, label: "Employees", value: allEmployees.length },
          { icon: <BarChart3 className="h-6 w-6 text-orange-500" />, label: "Plans", value: Object.keys(planMix).length },
        ],
        charts: (
          <div className="grid lg:grid-cols-3 gap-6">
            <ChartCard title="Subscription Mix">
              <PieSimple data={planArr} />
            </ChartCard>
            <ChartCard title="New Companies / Month">
              <BarSimple data={monthlyArr} x="month" y="count" />
            </ChartCard>
            <ChartCard title="New Employees / Month">
              <LineSimple data={hiresArr} x="month" y="count" />
            </ChartCard>
          </div>
        ),
      };
    }

    /* -------- ADMIN -------- */
    if (mode === "admin") {
      if (loadingAdmin) return null;

      const deptCount = companyDepartments.length;
      const empCount = companyEmployees.length;

      const empByDept = {};
      companyEmployees.forEach((e) => {
        const d = e.department?.name || "None";
        empByDept[d] = (empByDept[d] || 0) + 1;
      });
      const empDeptArr = Object.entries(empByDept).map(([name, value]) => ({ name, value }));

      const hoursByMonth = {};
      companyTimelogs
        .filter((l) => l.timeIn && l.timeOut)
        .forEach((l) => {
          const m = l.timeIn.slice(0, 7);
          const h = diffHours(l.timeIn, l.timeOut);
          hoursByMonth[m] = (hoursByMonth[m] || 0) + h;
        });
      const hoursArr = Object.entries(hoursByMonth)
        .sort()
        .map(([month, hours]) => ({
          month,
          hours: Number(hours.toFixed(2)),
        }));

      const roleMix = {};
      companyEmployees.forEach((e) => {
        const r = e.role?.toLowerCase() || "unknown";
        roleMix[r] = (roleMix[r] || 0) + 1;
      });
      const roleArr = Object.entries(roleMix).map(([name, value]) => ({ name, value }));

      return {
        cards: [
          { icon: <Briefcase className="h-6 w-6 text-orange-500" />, label: "Departments", value: deptCount },
          { icon: <Users className="h-6 w-6 text-orange-500" />, label: "Employees", value: empCount },
          { icon: <BarChart3 className="h-6 w-6 text-orange-500" />, label: "Plan", value: me.companyPlan },
        ],
        charts: (
          <div className="grid lg:grid-cols-3 gap-6">
            <ChartCard title="Employees / Department">
              <PieSimple data={empDeptArr} />
            </ChartCard>
            <ChartCard title="Role Distribution">
              <PieSimple data={roleArr} />
            </ChartCard>
            <ChartCard title="Total Hours / Month">
              <BarSimple data={hoursArr} x="month" y="hours" />
            </ChartCard>
          </div>
        ),
      };
    }

    /* -------- SUPERVISOR -------- */
    if (mode === "supervisor") {
      if (loadingSup) return null;
      return {
        cards: [{ icon: <UserCheck className="h-6 w-6 text-orange-500" />, label: "Team Size", value: teamEmployees.length }],
        charts: null,
      };
    }

    /* -------- EMPLOYEE -------- */
    if (loadingLogs || loadingShift) return null;

    /* ---- build maps ---- */
    const logsByDate = {}; // yyyy-mm-dd → { hours: number, firstIn: Date|null }
    myLogs.forEach((l) => {
      if (!l.timeIn) return;
      const key = l.timeIn.slice(0, 10);
      const h = l.timeOut ? diffHours(l.timeIn, l.timeOut) : 0;
      const fi = new Date(l.timeIn);
      if (!logsByDate[key]) logsByDate[key] = { hours: 0, firstIn: fi };
      logsByDate[key].hours += h;
      if (fi < logsByDate[key].firstIn) logsByDate[key].firstIn = fi;
    });

    const shiftsByDate = {}; // yyyy-mm-dd → [shift,…]
    myShifts.forEach((s) => {
      if (!s.assignedDate) return;
      const key = s.assignedDate.slice(0, 10);
      if (!shiftsByDate[key]) shiftsByDate[key] = [];
      shiftsByDate[key].push(s.shift);
    });

    /* ---- metrics ---- */
    let totalHours = 0;
    let overtime = 0;
    let lateCount = 0;
    let absences = 0;

    Object.entries(shiftsByDate).forEach(([dateKey, shiftArr]) => {
      const actual = logsByDate[dateKey]?.hours || 0;
      totalHours += actual;

      // scheduled hours & earliest start
      const schedHours = shiftArr.reduce((sum, sh) => sum + hoursBetween(sh.startTime, sh.endTime), 0);
      const firstStart = Math.min(...shiftArr.map((sh) => new Date(sh.startTime)));
      const graceCutoff = addMinutes(new Date(firstStart), 15);

      // overtime: only if actual > scheduled
      overtime += Math.max(0, actual - schedHours);

      // late clock-in: only if there was at least one punch
      const firstPunch = logsByDate[dateKey]?.firstIn;
      if (firstPunch && firstPunch > graceCutoff) lateCount++;

      // absence
      if (actual === 0) absences++;
    });

    /* any hours on days WITHOUT shifts should still count towards TOTAL hours */
    Object.entries(logsByDate).forEach(([dateKey, obj]) => {
      if (!shiftsByDate[dateKey]) totalHours += obj.hours;
    });

    /* data for charts */
    const hoursArr = Object.entries(logsByDate)
      .sort()
      .map(([date, obj]) => ({ date, hours: Number(obj.hours.toFixed(2)) }));

    return {
      cards: [
        { icon: <User className="h-6 w-6 text-orange-500" />, label: "Username", value: me.username },
        { icon: <Briefcase className="h-6 w-6 text-orange-500" />, label: "Department", value: me.departmentName || "—" },
        { icon: <TimerReset className="h-6 w-6 text-orange-500" />, label: "Total Hours", value: totalHours.toFixed(2) },
        { icon: <Clock className="h-6 w-6 text-orange-500" />, label: "Absences", value: absences },
        { icon: <Clock className="h-6 w-6 text-orange-500" />, label: "Late In", value: lateCount },
        { icon: <Clock className="h-6 w-6 text-orange-500" />, label: "Overtime", value: overtime.toFixed(2) },
      ],
      charts: (
        <div className="grid lg:grid-cols-3 gap-6">
          <ChartCard title="Daily Hours Worked">
            <BarSimple data={hoursArr} x="date" y="hours" />
          </ChartCard>
          <ChartCard title="Session Status">
            <PieSimple
              data={[
                { name: "Active", value: myLogs.filter((l) => l.status).length },
                { name: "Completed", value: myLogs.filter((l) => !l.status).length },
              ]}
            />
          </ChartCard>
          <ChartCard title="Absence & Late">
            <PieSimple
              data={[
                { name: "Absences", value: absences },
                { name: "Late Ins", value: lateCount },
              ]}
            />
          </ChartCard>
        </div>
      ),
    };
  }, [
    mode,
    me,
    loadingProfile,
    /* super */
    loadingSuper,
    allCompanies,
    allEmployees,
    /* admin */
    loadingAdmin,
    companyDepartments,
    companyEmployees,
    companyTimelogs,
    /* sup */
    loadingSup,
    teamEmployees,
    /* employee */
    loadingLogs,
    loadingShift,
    myLogs,
    myShifts,
  ]);

  /* ─────────────── skeleton helpers ─────────────── */
  const SkeletonCards = (n) => (
    <div className={`grid ${n > 2 ? "sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2"} gap-6 mt-6 mb-8`}>
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full" />
      ))}
    </div>
  );

  const SkeletonCharts = (n) => (
    <div className={`grid ${n === 1 ? "grid-cols-1" : "lg:grid-cols-3"} gap-6`}>
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-80 w-full" />
      ))}
    </div>
  );

  const renderSkeleton = () => {
    if (mode === "super" || mode === "admin")
      return (
        <>
          {SkeletonCards(4)}
          {SkeletonCharts(3)}
        </>
      );
    if (mode === "supervisor") return SkeletonCards(1);
    /* employee */
    return (
      <>
        {SkeletonCards(6)}
        {SkeletonCharts(3)}
      </>
    );
  };

  /* ───────────────────────── UI ───────────────────────── */
  return (
    <div className="max-w-7xl mx-auto p-6">
      <Toaster position="top-center" />

      {/* ███ role buttons + refresh ███ */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap gap-2">
          {roleButtons.map((b) => (
            <Button key={b} variant={mode === b ? "default" : "outline"} onClick={() => setMode(b)}>
              {b === "super" ? "Super-Admin" : b.charAt(0).toUpperCase() + b.slice(1)}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={refreshing}
          className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* ███ content ███ */}
      {analytics ? (
        <>
          {/* KPI cards */}
          <div className={`grid ${analytics.cards.length > 2 ? "sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2"} gap-6 mt-6 mb-8`}>
            {analytics.cards.map((c) => (
              <Card key={c.label} className="border-2 dark:border-white/10 overflow-hidden">
                <div className="h-1 w-full bg-orange-500" />
                <CardHeader className="flex items-center gap-2">
                  {c.icon}
                  <CardTitle className="text-base">{c.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{c.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* charts (if any) */}
          {analytics.charts}
        </>
      ) : (
        renderSkeleton()
      )}
    </div>
  );
}
