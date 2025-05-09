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
 *      employee     → /api/timelogs/user
 * • Skeletons for every view while data loads
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building, Users, BarChart3, UserCheck, User, Briefcase, TimerReset, Clock, Plus, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line, Tooltip as RTooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster, toast } from "sonner";
import useAuthStore from "@/store/useAuthStore";

/* ───────────────────────── constants / helpers ───────────────────────── */
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

/* ───────────────────────── component ───────────────────────── */
export default function OverviewDashboard() {
  const { token } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;

  /* profile ----------------------------------------------------------------- */
  const [me, setMe] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    setLoadingProfile(true);
    try {
      const r = await fetch(`${API}/api/account/profile`, { headers: { Authorization: `Bearer ${token}` } });
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
      setLoadingProfile(false);
    }
  }, [API, token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /* super-admin data -------------------------------------------------------- */
  const [allCompanies, setAllCompanies] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loadingSuper, setLoadingSuper] = useState(false);

  const fetchSuperData = useCallback(async () => {
    if (!token) return;
    setLoadingSuper(true);
    try {
      const [cR, eR] = await Promise.all([
        fetch(`${API}/api/company/all`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/employee?all=1`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [cJ, eJ] = await Promise.all([cR.json(), eR.json()]);
      if (cR.ok) setAllCompanies(cJ.data || []);
      else toast.message(cJ.error || "Company fetch failed");
      if (eR.ok) setAllEmployees(eJ.data || []);
      else toast.message(eJ.error || "Employee fetch failed");
    } catch {
      toast.message("Network error while fetching super-admin data");
    }
    setLoadingSuper(false);
  }, [API, token]);

  /* admin (company) data ---------------------------------------------------- */
  const [companyDepartments, setCompanyDepartments] = useState([]);
  const [companyEmployees, setCompanyEmployees] = useState([]);
  const [companyTimelogs, setCompanyTimelogs] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  const fetchAdminData = useCallback(async () => {
    if (!token) return;
    setLoadingAdmin(true);
    try {
      const [dR, eR, tR] = await Promise.all([
        fetch(`${API}/api/departments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/employee`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/timelogs`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [dJ, eJ, tJ] = await Promise.all([dR.json(), eR.json(), tR.json()]);
      if (dR.ok) setCompanyDepartments(dJ.data || []);
      else toast.message(dJ.error || "Department fetch failed");
      if (eR.ok) setCompanyEmployees(eJ.data || []);
      else toast.message(eJ.error || "Employee fetch failed");
      if (tR.ok) setCompanyTimelogs(tJ.data || []);
      else toast.message(tJ.error || "Timelog fetch failed");
    } catch {
      toast.message("Network error while fetching admin data");
    }
    setLoadingAdmin(false);
  }, [API, token]);

  /* employee timelogs ------------------------------------------------------- */
  const [myLogs, setMyLogs] = useState([]);
  const [loadingMyLogs, setLoadingMyLogs] = useState(false);

  const fetchMyLogs = useCallback(async () => {
    if (!token) return;
    setLoadingMyLogs(true);
    try {
      const r = await fetch(`${API}/api/timelogs/user`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      if (r.ok) setMyLogs(j.data || []);
      else toast.message(j.error || "Timelogs fetch failed");
    } catch {
      toast.message("Network error while fetching your timelogs");
    }
    setLoadingMyLogs(false);
  }, [API, token]);

  /* supervisor team data ---------------------------------------------------- */
  const [teamEmployees, setTeamEmployees] = useState([]);
  const [loadingSupervisor, setLoadingSupervisor] = useState(false);

  const fetchSupervisorData = useCallback(async () => {
    if (!token || !me?.departmentId) return;
    setLoadingSupervisor(true);
    try {
      const r = await fetch(`${API}/api/employee?departmentId=${me.departmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (r.ok) setTeamEmployees(j.data || []);
      else toast.message(j.error || "Team fetch failed");
    } catch {
      toast.message("Network error while fetching team");
    }
    setLoadingSupervisor(false);
  }, [API, token, me?.departmentId]);

  /* role buttons ------------------------------------------------------------ */
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

  /* fetch data on mode switch ---------------------------------------------- */
  useEffect(() => {
    if (mode === "super") fetchSuperData();
    if (mode === "admin") fetchAdminData();
    if (mode === "employee") fetchMyLogs();
    if (mode === "supervisor") fetchSupervisorData();
  }, [mode, fetchSuperData, fetchAdminData, fetchMyLogs, fetchSupervisorData]);

  /* refresh button ---------------------------------------------------------- */
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    if (mode === "super") await fetchSuperData();
    if (mode === "admin") await fetchAdminData();
    if (mode === "employee") await fetchMyLogs();
    if (mode === "supervisor") await fetchSupervisorData();
    setRefreshing(false);
  };

  /* analytics builders ------------------------------------------------------ */
  const analytics = useMemo(() => {
    if (!me || loadingProfile) return null;

    /* ───────── super-admin ───────── */
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

    /* ───────── admin (company) ───────── */
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
        .map(([month, hours]) => ({ month, hours: Number(hours.toFixed(2)) }));

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

    /* ───────── supervisor ───────── */
    if (mode === "supervisor") {
      if (loadingSupervisor) return null;
      return {
        cards: [{ icon: <UserCheck className="h-6 w-6 text-orange-500" />, label: "Team Size", value: teamEmployees.length }],
        charts: null,
      };
    }

    /* ───────── employee ───────── */
    if (loadingMyLogs) return null;

    const done = myLogs.filter((l) => l.timeIn && l.timeOut);
    const hoursTotal = done.reduce((t, l) => t + diffHours(l.timeIn, l.timeOut), 0).toFixed(2);

    const hoursByDate = {};
    done.forEach((l) => {
      const d = l.timeIn.slice(0, 10);
      hoursByDate[d] = (hoursByDate[d] || 0) + diffHours(l.timeIn, l.timeOut);
    });
    const hoursArr = Object.entries(hoursByDate)
      .sort()
      .map(([date, hours]) => ({ date, hours: Number(hours.toFixed(2)) }));

    const active = myLogs.filter((l) => l.status).length;
    const completed = myLogs.length - active;

    return {
      cards: [
        { icon: <User className="h-6 w-6 text-orange-500" />, label: "Username", value: me.username },
        { icon: <Briefcase className="h-6 w-6 text-orange-500" />, label: "Department", value: me.departmentName || "—" },
        { icon: <TimerReset className="h-6 w-6 text-orange-500" />, label: "Total Hours", value: hoursTotal },
      ],
      charts: (
        <div className="grid lg:grid-cols-3 gap-6">
          <ChartCard title="Daily Hours Worked">
            <BarSimple data={hoursArr} x="date" y="hours" />
          </ChartCard>
          <ChartCard title="Session Status">
            <PieSimple
              data={[
                { name: "Active", value: active },
                { name: "Completed", value: completed },
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
    loadingSuper,
    loadingAdmin,
    loadingSupervisor,
    loadingMyLogs,
    allCompanies,
    allEmployees,
    companyDepartments,
    companyEmployees,
    companyTimelogs,
    teamEmployees,
    myLogs,
  ]);

  /* skeleton builders ------------------------------------------------------- */
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
    if (mode === "super")
      return (
        <>
          {SkeletonCards(4)}
          {SkeletonCharts(3)}
        </>
      );
    if (mode === "admin")
      return (
        <>
          {SkeletonCards(4)}
          {SkeletonCharts(3)}
        </>
      );
    if (mode === "supervisor") return <>{SkeletonCards(1)}</>;
    return (
      <>
        {SkeletonCards(3)}
        {SkeletonCharts(2)}
      </>
    );
  };

  /* UI ---------------------------------------------------------------------- */
  return (
    <div className="max-w-7xl mx-auto p-6">
      <Toaster position="top-center" />

      {/* role buttons + refresh */}
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
          className="border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400 dark:hover:bg-orange-500/20"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* content */}
      {analytics ? (
        <>
          {/* cards */}
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
