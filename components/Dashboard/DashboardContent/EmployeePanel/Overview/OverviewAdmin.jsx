// components/Dashboard/DashboardContent/Features/Overview/OverviewAdmin.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, Briefcase, BarChart3, Activity, Clock, CalendarCheck2, TrendingUp, TrendingDown, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ChartCard, PieSimple, BarSimple, LineSimple, GroupedBarSimple, StackedBarSimple, AreaSimple } from "./Commons";

const diffHours = (isoA, isoB) => (isoA && isoB ? (new Date(isoB) - new Date(isoA)) / 36e5 : 0);
const monthKey = (iso) => iso.slice(0, 7);
const dayKey = (iso) => iso.slice(0, 10);

const leaveByTypeToRow = (obj) => {
  const row = { name: "Leave" };
  for (const [k, v] of Object.entries(obj)) row[k] = v;
  return row;
};

export default function OverviewAdmin() {
  const { token } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [timelogs, setTimelogs] = useState([]);
  const [userShifts, setUserShifts] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Mock trend calculation - replace with actual logic
  const calculateTrend = (value) => {
    const trend = Math.random() > 0.5 ? 1 : -1;
    const percentage = (Math.random() * 15).toFixed(1);
    return { trend, percentage };
  };

  const analytics = useMemo(() => {
    if (loading) return null;

    const activeByMonth = {};
    timelogs.forEach((l) => {
      const m = monthKey(l.timeIn);
      (activeByMonth[m] ??= new Set()).add(l.userId);
    });
    const activeArr = Object.entries(activeByMonth)
      .sort()
      .map(([month, ids]) => ({ month, count: ids.size }));

    const schedHours = {};
    userShifts.forEach((row) => {
      const key = `${row.userId}_${monthKey(row.assignedDate)}`;
      const h = diffHours(row.shift.startTime, row.shift.endTime);
      schedHours[key] = (schedHours[key] || 0) + h;
    });
    const actualHours = {};
    timelogs.forEach((l) => {
      if (!l.timeOut) return;
      const key = `${l.userId}_${monthKey(l.timeIn)}`;
      const h = diffHours(l.timeIn, l.timeOut);
      actualHours[key] = (actualHours[key] || 0) + h;
    });

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

    let late = 0;
    let early = 0;
    const shiftIndex = {};
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

    const totalScheduledShifts = userShifts.length || 1;
    const lateRate = ((late / totalScheduledShifts) * 100).toFixed(1);
    const earlyRate = ((early / totalScheduledShifts) * 100).toFixed(1);
    const attendedOnTime = totalScheduledShifts - late - early > 0 ? totalScheduledShifts - late - early : 0;
    const reliability = ((attendedOnTime / totalScheduledShifts) * 100).toFixed(1);

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
        cost: Number((ot * 1.5).toFixed(2)),
      }));

    const covered = userShifts.filter((us) => timelogs.some((l) => l.userId === us.userId && dayKey(l.timeIn) === dayKey(us.assignedDate))).length;
    const coverageRate = ((covered / totalScheduledShifts) * 100).toFixed(1);

    const cards = [
      {
        icon: <Briefcase className="h-5 w-5 text-gray-500" />,
        label: "Departments",
        value: departments.length,
        trend: calculateTrend(departments.length),
      },
      {
        icon: <Users className="h-5 w-5 text-gray-500" />,
        label: "Employees",
        value: employees.length,
        trend: calculateTrend(employees.length),
      },
      {
        icon: <BarChart3 className="h-5 w-5 text-gray-500" />,
        label: "Active Plan",
        value: employees[0]?.company?.Subscription?.find((s) => s.active)?.plan?.name || "Free",
        isText: true,
      },
      {
        icon: <Activity className="h-5 w-5 text-gray-500" />,
        label: "Active Staff",
        value: activeArr.at(-1)?.count || 0,
        trend: calculateTrend(activeArr.at(-1)?.count || 0),
      },
      {
        icon: <Percent className="h-5 w-5 text-gray-500" />,
        label: "Late Rate",
        value: `${lateRate}%`,
        trend: { trend: -1, percentage: Math.abs(parseFloat(lateRate)).toFixed(1) },
        trendInverted: true,
      },
      {
        icon: <Percent className="h-5 w-5 text-gray-500" />,
        label: "Early Leave Rate",
        value: `${earlyRate}%`,
        trend: { trend: -1, percentage: Math.abs(parseFloat(earlyRate)).toFixed(1) },
        trendInverted: true,
      },
      {
        icon: <CalendarCheck2 className="h-5 w-5 text-gray-500" />,
        label: "Reliability",
        value: `${reliability}%`,
        trend: { trend: 1, percentage: parseFloat(reliability).toFixed(1) },
      },
      {
        icon: <Clock className="h-5 w-5 text-gray-500" />,
        label: "Coverage Rate",
        value: `${coverageRate}%`,
        trend: { trend: 1, percentage: parseFloat(coverageRate).toFixed(1) },
      },
      {
        icon: <Clock className="h-5 w-5 text-gray-500" />,
        label: "Leave Approval",
        value: `${approvalRate}%`,
        trend: { trend: 1, percentage: parseFloat(approvalRate).toFixed(1) },
      },
    ];

    const charts = (
      <div className="grid gap-3">
        <div className="grid lg:grid-cols-2 gap-3">
          <ChartCard title="Active Staff / Month">
            <BarSimple data={activeArr} x="month" y="count" />
          </ChartCard>
          <ChartCard title="Scheduled vs Actual Hours">
            <GroupedBarSimple data={hoursCompareArr} x="month" y1="scheduled" y2="actual" label1="Scheduled" label2="Actual" />
          </ChartCard>
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
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

        <div className="grid lg:grid-cols-2 gap-3">
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

        <div className="grid lg:grid-cols-2 gap-3">
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

  const SkeletonCards = (n) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-lg" />
      ))}
    </div>
  );

  const SkeletonCharts = (rows) => (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-72 w-full rounded-lg" />
      ))}
    </div>
  );

  const KPICards = ({ data }) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
      {data.map((c) => (
        <Card 
          key={c.label} 
          className="border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors overflow-hidden shadow-none"
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {c.label}
            </CardTitle>
            <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-md flex-shrink-0">
              {c.icon}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className={`${c.isText ? 'text-lg' : 'text-2xl'} font-semibold truncate ${c.isText ? 'max-w-[140px]' : ''}`} title={String(c.value)}>
                {c.value}
              </p>
              {c.trend && (
                <div className={`flex items-center text-xs font-medium flex-shrink-0 ${
                  c.trendInverted 
                    ? (c.trend.trend > 0 ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500')
                    : (c.trend.trend > 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500')
                }`}>
                  {c.trend.trend > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                  )}
                  {c.trend.percentage}%
                </div>
              )}
            </div>
            {c.trend && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                vs previous period
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (!analytics)
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Last 28 days
          </h2>
        </div>
        {SkeletonCards(9)}
        {SkeletonCharts(4)}
      </>
    );

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Last 28 days
        </h2>
      </div>
      <KPICards data={analytics.cards} />
      {analytics.charts}
    </div>
  );
}