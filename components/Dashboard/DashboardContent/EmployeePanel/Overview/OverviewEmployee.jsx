// components/Dashboard/DashboardContent/Features/Overview/OverviewEmployee.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ChartCard, PieSimple, BarSimple } from "./Commons";
import { User, Briefcase, Clock } from "lucide-react";
import { toast } from "sonner";
import useAuthStore from "@/store/useAuthStore";

export default function OverviewEmployee() {
  const { token } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/analytics/employee`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json();

        if (!res.ok || !j.data) throw new Error(j.message || "Analytics fetch error");
        setData(j.data);
      } catch (err) {
        toast.error(err.message);
      }
      setLoading(false);
    })();
  }, [API, token]);

  const SkelCards = (n) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  );

  const SkelCharts = () => (
    <div className="grid lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-80 w-full rounded-xl" />
      ))}
    </div>
  );

  if (loading || !data)
    return (
      <>
        {SkelCards(5)}
        <SkelCharts />
      </>
    );

  const cards = [
    { icon: <User className="h-6 w-6 text-orange-500" />, label: "Username", value: data.profile.username },
    { icon: <Briefcase className="h-6 w-6 text-orange-500" />, label: "Department", value: data.profile.department },
    { icon: <Clock className="h-6 w-6 text-orange-500" />, label: "Total Hours", value: data.totals.totalHours },
    { icon: <Clock className="h-6 w-6 text-orange-500" />, label: "Overtime", value: data.totals.overtime },
    { icon: <Clock className="h-6 w-6 text-orange-500" />, label: "Absences", value: data.totals.absences },
  ];

  const completedSessions = Math.max(0, data.charts.dailyHours.length - data.totals.activeSessions);
  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {cards.map((c) => (
          <Card key={c.label} className="border-2 dark:border-white/10 overflow-hidden shadow-sm">
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
      <div className="grid lg:grid-cols-3 gap-4">
        <ChartCard title="Daily Hours">
          <BarSimple data={data.charts.dailyHours} x="date" y="hours" />
        </ChartCard>
        <ChartCard title="Session Status">
          <PieSimple
            data={[
              { name: "Active", value: data.totals.activeSessions },
              { name: "Completed", value: completedSessions },
            ]}
          />
        </ChartCard>
        <ChartCard title="Absence vs Late">
          <PieSimple
            data={[
              { name: "Absences", value: data.totals.absences },
              { name: "Late-Ins", value: data.totals.lateIns },
            ]}
          />
        </ChartCard>
      </div>
    </>
  );
}
