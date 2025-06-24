// app/dashboard/(features)/overview/page.jsx

"use client";
import Overview from "@/components/Dashboard/DashboardContent/Features/Overview/Overview";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function OverviewPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Overview />
    </Suspense>
  );
}
