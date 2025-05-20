/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, Briefcase, BarChart3, Activity, Clock, CalendarCheck2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ChartCard, PieSimple, BarSimple, LineSimple, GroupedBarSimple, StackedBarSimple, AreaSimple } from "./OverviewCommons";

/* ------------------------------------------------------------------ */
/*  ── helpers ──                                                     */
/* ------------------------------------------------------------------ */
const diffHours = (isoA, isoB) => (isoA && isoB ? (new Date(isoB) - new Date(isoA)) / 36e5 : 0);

const monthKey = (iso) => iso.slice(0, 7);
const dayKey = (iso) => iso.slice(0, 10);

const leaveByTypeToRow = (obj) => {
  const row = { name: "Leave" };
  for (const [k, v] of Object.entries(obj)) row[k] = v;
  return row;
};

/* ------------------------------------------------------------------ */
/*  ── component ──                                                   */
/* ------------------------------------------------------------------ */
export default function OverviewAdmin() {
  const { token } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;

  /* ─────────────── raw state ─────────────── */
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [timelogs, setTimelogs] = useState([]);
  const [userShifts, setUserShifts] = useState([]); // ← scheduled (assigned) shifts
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ─────────────── fetch all admin-scope data ─────────────── */
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      const [dR, eR, tR, usR, lR] = await Promise.all([
        fetch(`${API}/api/departments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/employee`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/timelogs`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/usershifts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/api/leaves`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [dJ, eJ, tJ, usJ, lJ] = await Promise.all([dR.json(), eR.json(), tR.json(), usR.json(), lR.json()]);

      if (!dR.ok) throw new Error(dJ.error || "Department fetch failed");
      if (!eR.ok) throw new Error(eJ.error || "Employee fetch failed");
      if (!tR.ok) throw new Error(tJ.error || "Timelogs fetch failed");
      if (!usR.ok) throw new Error(usJ.error || "UserShifts fetch failed");
      if (!lR.ok) throw new Error(lJ.error || "Leaves fetch failed");

      setDepartments(dJ.data || []);
      setEmployees(eJ.data || []);
      setTimelogs(tJ.data || []);
      setUserShifts(usJ.data || []);
      setLeaves(lJ.data || []);
    } catch (err) {
      toast.error(err.message);
    }

    setLoading(false);
  }, [API, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─────────────── analytics ─────────────── */
  const analytics = useMemo(() => {
    if (loading) return null;

    /* 1️⃣  ACTIVE STAFF (unique punch-ins per month) */
    const activeByMonth = {};
    timelogs.forEach((l) => {
      const m = monthKey(l.timeIn);
      (activeByMonth[m] ??= new Set()).add(l.userId);
    });
    const activeArr = Object.entries(activeByMonth)
      .sort()
      .map(([month, ids]) => ({ month, count: ids.size }));

    /* 2️⃣  SCHEDULED vs ACTUAL HOURS */
    /* ---- scheduled ---- */
    const schedHours = {}; // key = "userId_month" → hours
    userShifts.forEach((row) => {
      const key = `${row.userId}_${monthKey(row.assignedDate)}`;
      const h = diffHours(row.shift.startTime, row.shift.endTime);
      schedHours[key] = (schedHours[key] || 0) + h;
    });
    /* ---- actual ---- */
    const actualHours = {};
    timelogs.forEach((l) => {
      if (!l.timeOut) return;
      const key = `${l.userId}_${monthKey(l.timeIn)}`;
      const h = diffHours(l.timeIn, l.timeOut);
      actualHours[key] = (actualHours[key] || 0) + h;
    });

    /* aggregate monthly */
    const months = new Set([...Object.keys(schedHours).map((k) => k.split("_")[1]), ...Object.keys(actualHours).map((k) => k.split("_")[1])]);
    const hoursCompareArr = [...months].sort().map((m) => ({
      month: m,
      scheduled: Number(
        Object.entries(schedHours)
          .filter(([k]) => k.endsWith(`_${m}`))
          .reduce((s, [, v]) => s + v, 0)
          .toFixed(2)
      ),
      actual: Number(
        Object.entries(actualHours)
          .filter(([k]) => k.endsWith(`_${m}`))
          .reduce((s, [, v]) => s + v, 0)
          .toFixed(2)
      ),
    }));

    /* 3️⃣  LATE-IN & EARLY-OUT */
    let late = 0;
    let early = 0;
    const shiftIndex = {}; // userId_date → {start,end}
    userShifts.forEach((us) => {
      shiftIndex[`${us.userId}_${dayKey(us.assignedDate)}`] = {
        start: us.shift.startTime,
        end: us.shift.endTime,
      };
    });

    timelogs.forEach((log) => {
      const idxKey = `${log.userId}_${dayKey(log.timeIn)}`;
      const sched = shiftIndex[idxKey];
      if (!sched) return;

      if (new Date(log.timeIn) > new Date(sched.start)) late++;
      if (log.timeOut && new Date(log.timeOut) < new Date(sched.end)) early++;
    });

    const totalScheduledShifts = userShifts.length || 1; // avoid /0
    const lateRate = ((late / totalScheduledShifts) * 100).toFixed(1);
    const earlyRate = ((early / totalScheduledShifts) * 100).toFixed(1);

    /* 4️⃣  ATTENDANCE RELIABILITY */
    const attendedOnTime = totalScheduledShifts - late - early > 0 ? totalScheduledShifts - late - early : 0;
    const reliability = ((attendedOnTime / totalScheduledShifts) * 100).toFixed(1);

    /* 5️⃣  LEAVE USAGE BY TYPE + APPROVALS */
    const leaveByType = {};
    leaves
      .filter((lv) => lv.status === "approved")
      .forEach((lv) => {
        const days = diffHours(lv.startDate, lv.endDate) / 8;
        leaveByType[lv.leaveType] = (leaveByType[lv.leaveType] || 0) + (days || 1);
      });
    const leaveStackRow = leaveByTypeToRow(leaveByType);

    const totalReq = leaves.length || 1;
    const totalApproved = leaves.filter((l) => l.status === "approved").length;
    const approvalRate = ((totalApproved / totalReq) * 100).toFixed(1);
    const leaveDonut = [
      { name: "Approved", value: totalApproved },
      { name: "Pending / Rejected", value: totalReq - totalApproved },
    ];

    /* 6️⃣  OVERTIME (hours by department & cost trend) */
    const deptName = (uid) => employees.find((e) => e.id === uid)?.department?.name || "Unassigned";

    const overtimeByDept = {};
    const overtimeByMonth = {};

    Object.keys(schedHours).forEach((key) => {
      const [uid, m] = key.split("_");
      const scheduled = schedHours[key] || 0;
      const actual = actualHours[key] || 0;
      const ot = Math.max(0, actual - scheduled);
      if (ot === 0) return;

      overtimeByDept[deptName(uid)] = (overtimeByDept[deptName(uid)] || 0) + ot;
      overtimeByMonth[m] = (overtimeByMonth[m] || 0) + ot;
    });

    const overtimeDeptArr = Object.entries(overtimeByDept).map(([dept, hours]) => ({ dept, hours: Number(hours.toFixed(2)) }));
    const overtimeCostArr = Object.entries(overtimeByMonth)
      .sort()
      .map(([month, ot]) => ({
        month,
        cost: Number((ot * 1.5).toFixed(2)), // dummy rate multiplier
      }));

    /* 7️⃣  SHIFT COVERAGE */
    const covered = userShifts.filter((us) => timelogs.some((l) => l.userId === us.userId && dayKey(l.timeIn) === dayKey(us.assignedDate))).length;
    const coverageRate = ((covered / totalScheduledShifts) * 100).toFixed(1);

    /* ── KPI CARDS ── */
    const cards = [
      {
        icon: <Briefcase className="h-6 w-6 text-orange-500" />,
        label: "Departments",
        value: departments.length,
      },
      {
        icon: <Users className="h-6 w-6 text-orange-500" />,
        label: "Employees",
        value: employees.length,
      },
      {
        icon: <BarChart3 className="h-6 w-6 text-orange-500" />,
        label: "Active Plan",
        value: employees[0]?.company?.Subscription?.find((s) => s.active)?.plan?.name || "Free",
      },
      {
        icon: <Activity className="h-6 w-6 text-orange-500" />,
        label: "Active Staff (latest)",
        value: activeArr.at(-1)?.count || 0,
      },
      {
        icon: <Clock className="h-6 w-6 text-orange-500" />,
        label: "Late / Early %",
        value: `${lateRate}% / ${earlyRate}%`,
      },
      {
        icon: <CalendarCheck2 className="h-6 w-6 text-orange-500" />,
        label: "Attendance Reliability",
        value: `${reliability}%`,
      },
      {
        icon: <Clock className="h-6 w-6 text-orange-500" />,
        label: "Coverage Rate",
        value: `${coverageRate}%`,
      },
      {
        icon: <Clock className="h-6 w-6 text-orange-500" />,
        label: "Leave Approval Rate",
        value: `${approvalRate}%`,
      },
    ];

    /* ── CHARTS ── */
    const charts = (
      <div className="grid gap-4">
        {/* row 1 */}
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard title="Active Staff / Month">
            <BarSimple data={activeArr} x="month" y="count" />
          </ChartCard>
          <ChartCard title="Scheduled vs Actual Hours">
            <GroupedBarSimple data={hoursCompareArr} x="month" y1="scheduled" y2="actual" label1="Scheduled" label2="Actual" />
          </ChartCard>
        </div>

        {/* row 2 */}
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard title="Late-In vs Early-Out %">
            <LineSimple
              data={[
                { label: "Late-In", rate: Number(lateRate) },
                { label: "Early-Out", rate: Number(earlyRate) },
              ]}
              x="label"
              y="rate"
            />
          </ChartCard>
          <ChartCard title="Attendance Reliability">
            <AreaSimple data={[{ label: "Current", rate: Number(reliability) }]} x="label" y="rate" />
          </ChartCard>
        </div>

        {/* row 3 */}
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard title="Leave Usage by Type">
            <StackedBarSimple
              data={[leaveStackRow]}
              x="name"
              series={Object.keys(leaveByType).map((k) => ({
                key: k,
                label: k,
              }))}
            />
          </ChartCard>
          <ChartCard title="Leave Requests vs Approvals">
            <PieSimple data={leaveDonut} />
          </ChartCard>
        </div>

        {/* row 4 */}
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard title="Overtime Hours (by Dept)">
            <BarSimple data={overtimeDeptArr} x="dept" y="hours" />
          </ChartCard>
          <ChartCard title="Overtime Cost Trend">
            <AreaSimple data={overtimeCostArr} x="month" y="cost" />
          </ChartCard>
        </div>
      </div>
    );

    return { cards, charts };
  }, [loading, departments, employees, timelogs, userShifts, leaves]);

  /* ─────────────── skeletons / KPI card util ─────────────── */
  const SkeletonCards = (n) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 mb-6">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  );
  const SkeletonCharts = (rows) => (
    <div className="grid gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-80 w-full rounded-xl" />
      ))}
    </div>
  );
  const KPICards = ({ data }) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 mb-6">
      {data.map((c, i) => (
        <Card key={c.label} className="border-2 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-all">
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 to-orange-400" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">{c.label}</CardTitle>
            <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-full">{c.icon}</div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  /* ─────────────── render ─────────────── */
  if (!analytics)
    return (
      <>
        {SkeletonCards(8)}
        {SkeletonCharts(4)}
      </>
    );

  return (
    <div className="animate-in fade-in duration-300">
      <KPICards data={analytics.cards} />
      {analytics.charts}
    </div>
  );
}
