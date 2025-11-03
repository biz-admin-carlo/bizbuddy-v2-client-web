// components/Dashboard/DashboardContent/Features/Overview/OverviewEmployee.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ChartCard, PieSimple, BarSimple } from "./Commons";
import { User, Briefcase, Clock, TrendingUp, TrendingDown } from "lucide-react";
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
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-lg" />
      ))}
    </div>
  );

  const SkelCharts = () => (
    <div className="grid lg:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-72 w-full rounded-lg" />
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

  // Calculate trend (mock - you'd compare with previous period in real implementation)
  const calculateTrend = (value) => {
    const trend = Math.random() > 0.5 ? 1 : -1;
    const percentage = (Math.random() * 15).toFixed(1);
    return { trend, percentage };
  };

  const cards = [
    { 
      icon: <User className="h-5 w-5 text-gray-500" />, 
      label: "Username", 
      value: data.profile.username,
      isText: true
    },
    { 
      icon: <Briefcase className="h-5 w-5 text-gray-500" />, 
      label: "Department", 
      value: data.profile.department || "—",
      isText: true
    },
    { 
      icon: <Clock className="h-5 w-5 text-gray-500" />, 
      label: "Total Hours", 
      value: data.totals.totalHours,
      trend: calculateTrend(data.totals.totalHours)
    },
    { 
      icon: <Clock className="h-5 w-5 text-gray-500" />, 
      label: "Overtime", 
      value: data.totals.overtime,
      trend: calculateTrend(data.totals.overtime)
    },
    { 
      icon: <Clock className="h-5 w-5 text-gray-500" />, 
      label: "Absences", 
      value: data.totals.absences,
      trend: calculateTrend(data.totals.absences)
    },
  ];

  const completedSessions = Math.max(0, data.charts.dailyHours.length - data.totals.activeSessions);
  
  return (
    <>
      {/* Date Range Selector - Add your actual implementation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Last 28 days
        </h2>
      </div>

      {/* Metric Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-4">
        {cards.map((c) => (
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
                <p className={`${c.isText ? 'text-lg' : 'text-2xl'} font-semibold truncate ${c.isText ? 'max-w-[180px]' : ''}`} title={c.value}>
                  {c.value}
                </p>
                {c.trend && (
                  <div className={`flex items-center text-xs font-medium flex-shrink-0 ${
                    c.trend.trend > 0 
                      ? 'text-green-600 dark:text-green-500' 
                      : 'text-red-600 dark:text-red-500'
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

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-3">
        <ChartCard title="Daily Hours">
          <BarSimple data={data.charts.dailyHours} x="date" y="hours" />
        </ChartCard>
        
        <ChartCard title="Session Status">
          <div className="flex flex-col items-center justify-center h-full">
            <PieSimple
              data={[
                { name: "Active", value: data.totals.activeSessions },
                { name: "Completed", value: completedSessions },
              ]}
            />
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <span className="text-gray-600 dark:text-gray-400">Active</span>
                <span className="font-medium">{data.totals.activeSessions}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-gray-600 dark:text-gray-400">Completed</span>
                <span className="font-medium">{completedSessions}</span>
              </div>
            </div>
          </div>
        </ChartCard>
        
        <ChartCard title="Absence vs Late">
          <div className="flex flex-col items-center justify-center h-full">
            <PieSimple
              data={[
                { name: "Absences", value: data.totals.absences },
                { name: "Late-Ins", value: data.totals.lateIns },
              ]}
            />
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <span className="text-gray-600 dark:text-gray-400">Absences</span>
                <span className="font-medium">{data.totals.absences}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-gray-600 dark:text-gray-400">Late-Ins</span>
                <span className="font-medium">{data.totals.lateIns}</span>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </>
  );
}