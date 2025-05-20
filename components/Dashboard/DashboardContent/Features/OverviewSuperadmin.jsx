/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "sonner";
import { Building, Users, BarChart3, Activity, DollarSign, Server } from "lucide-react";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard, PieSimple, BarSimple, LineSimple, AreaSimple } from "./OverviewCommons";

/* -------------------------------------------------------------
   SUPER-ADMIN DASHBOARD
--------------------------------------------------------------*/
export default function OverviewSuperadmin() {
  const { token } = useAuthStore();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [data, set] = useState(null);
  const [loading, setLoading] = useState(true);

  /* fetch once */
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
        toast.message(e.message);
      }
      setLoading(false);
    })();
  }, [API, token]);

  /* ------------------- SKELETONS ------------------- */
  const SkelCards = (n) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  );
  const SkelCharts = (n) => (
    <div className="grid lg:grid-cols-3 gap-4">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-80 w-full rounded-xl" />
      ))}
    </div>
  );

  if (loading || !data)
    return (
      <>
        {SkelCards(6)}
        {SkelCharts(6)}
      </>
    );

  /* ------------------- KPI CARDS ------------------- */
  const cards = [
    { icon: <Building className="h-6 w-6 text-orange-500" />, label: "Companies", value: data.totals.companies },
    { icon: <Users className="h-6 w-6 text-orange-500" />, label: "Employees", value: data.totals.employees },
    { icon: <BarChart3 className="h-6 w-6 text-orange-500" />, label: "Plans", value: data.totals.plans },
    { icon: <Activity className="h-6 w-6 text-orange-500" />, label: "Active Users (30 d)", value: data.totalActiveUsers },
    { icon: <DollarSign className="h-6 w-6 text-orange-500" />, label: "MRR ($)", value: data.mrr },
    { icon: <Server className="h-6 w-6 text-orange-500" />, label: "Uptime", value: `${data.serverUptime}%` },
  ];

  const KPICards = () => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {cards.map((c, i) => (
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

  /* ------------------- CHARTS ------------------- */
  return (
    <>
      <KPICards />

      <div className="grid lg:grid-cols-3 gap-4">
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
            <div className="h-full flex flex-col items-center justify-center opacity-60">
              <p>No ticket data</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ---- Top 5 Active Clients table ---- */}
      <div className="mt-6">
        <Card className="border-2 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 to-orange-400" />
          <CardHeader className="py-4 bg-neutral-50 dark:bg-neutral-900/40">
            <CardTitle>Top 5 Active Clients (30 days)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-100 dark:bg-neutral-800/50">
                    <th className="py-3 px-4 text-left font-medium">Company</th>
                    <th className="py-3 px-4 text-left font-medium">Active Users</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topClients.map((c, i) => (
                    <tr
                      key={c.company}
                      className={`border-b last:border-0 dark:border-white/10 ${i % 2 === 1 ? "bg-neutral-50 dark:bg-neutral-800/20" : ""}`}
                    >
                      <td className="py-3 px-4">{c.company}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-12 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mr-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full"
                              style={{ width: `${(c.activeUsers / Math.max(...data.topClients.map((tc) => tc.activeUsers))) * 100}%` }}
                            ></div>
                          </div>
                          {c.activeUsers}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
