// components/Dashboard/DashboardContent/Features/Overview/OverviewSuperadmin.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "sonner";
import { Building, Users, BarChart3, Activity, DollarSign, Server, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard, PieSimple, BarSimple, LineSimple, AreaSimple } from "./Commons";

export default function OverviewSuperadmin() {
  const { token } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [data, set] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API}/api/analytics/super`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || "Analytics fetch failed");
        set(j.data);
      } catch (e) {
        toast.error(e.message);
      }
      setLoading(false);
    })();
  }, [API, token]);

  // Mock trend calculation - replace with actual logic
  const calculateTrend = (value) => {
    const trend = Math.random() > 0.5 ? 1 : -1;
    const percentage = (Math.random() * 15).toFixed(1);
    return { trend, percentage };
  };

  const SkelCards = (n) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-lg" />
      ))}
    </div>
  );

  const SkelCharts = (n) => (
    <div className="grid lg:grid-cols-3 gap-3">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-72 w-full rounded-lg" />
      ))}
    </div>
  );

  if (loading || !data)
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Platform Overview
          </h2>
        </div>
        {SkelCards(6)}
        {SkelCharts(6)}
      </>
    );

  const cards = [
    { 
      icon: <Building className="h-5 w-5 text-gray-500" />, 
      label: "Companies", 
      value: data.totals.companies,
      trend: calculateTrend(data.totals.companies)
    },
    { 
      icon: <Users className="h-5 w-5 text-gray-500" />, 
      label: "Employees", 
      value: data.totals.employees,
      trend: calculateTrend(data.totals.employees)
    },
    { 
      icon: <BarChart3 className="h-5 w-5 text-gray-500" />, 
      label: "Plans", 
      value: data.totals.plans,
      trend: calculateTrend(data.totals.plans)
    },
    { 
      icon: <Activity className="h-5 w-5 text-gray-500" />, 
      label: "Active Users (30d)", 
      value: data.totalActiveUsers,
      trend: calculateTrend(data.totalActiveUsers)
    },
    { 
      icon: <DollarSign className="h-5 w-5 text-gray-500" />, 
      label: "MRR", 
      value: `$${data.mrr.toLocaleString()}`,
      trend: calculateTrend(data.mrr)
    },
    { 
      icon: <Server className="h-5 w-5 text-gray-500" />, 
      label: "Uptime", 
      value: `${data.serverUptime}%`,
      trend: { trend: 1, percentage: data.serverUptime }
    },
  ];

  const KPICards = () => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
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
              <p className="text-2xl font-semibold truncate" title={String(c.value)}>
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
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Platform Overview
        </h2>
      </div>

      <KPICards />

      <div className="grid lg:grid-cols-3 gap-3 mb-3">
        <ChartCard title="Subscription Mix">
          <PieSimple data={data.planMix} />
        </ChartCard>

        <ChartCard title="New Companies / Month">
          <BarSimple data={data.newCompanies} x="month" y="count" />
        </ChartCard>

        <ChartCard title="New Employees / Month">
          <AreaSimple data={data.newEmployees} x="month" y="count" />
        </ChartCard>

        <ChartCard title="Sessions by Country">
          <BarSimple data={data.sessionsCountry} x="country" y="count" />
        </ChartCard>

        <ChartCard title="Device Usage">
          <PieSimple data={data.deviceUsage} />
        </ChartCard>

        <ChartCard title="Support Tickets / Month">
          {data.ticketsPerMonth.length ? (
            <LineSimple data={data.ticketsPerMonth} x="month" y="count" />
          ) : (
            <div className="h-full flex flex-col items-center justify-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No ticket data</p>
            </div>
          )}
        </ChartCard>
      </div>

      <Card className="border border-gray-200 dark:border-gray-800 shadow-none overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-orange-400" />
        <CardHeader className="py-3 px-4 bg-gray-50/50 dark:bg-gray-900/20">
          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Top 5 Active Clients (30 days)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-800">
                  <th className="py-3 px-4 text-left font-medium text-gray-700 dark:text-gray-300">Company</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-700 dark:text-gray-300">Active Users</th>
                </tr>
              </thead>
              <tbody>
                {data.topClients.map((c, i) => (
                  <tr
                    key={c.company}
                    className={`border-b last:border-0 border-gray-200 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors ${
                      i % 2 === 1 ? "bg-gray-50/30 dark:bg-gray-900/10" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-medium">{c.company}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[120px] bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-orange-500 h-1.5 rounded-full transition-all"
                            style={{ 
                              width: `${(c.activeUsers / Math.max(...data.topClients.map((tc) => tc.activeUsers))) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold min-w-[40px] text-right">{c.activeUsers}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}