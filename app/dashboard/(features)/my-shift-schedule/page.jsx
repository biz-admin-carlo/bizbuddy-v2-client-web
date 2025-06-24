// app/dashboard/(features)/my-shift-schedule/page.jsx

import MyShiftSchedule from "@/components/Dashboard/DashboardContent/Features/MyShiftSchedule";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function MyShiftSchedulePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MyShiftSchedule />
    </Suspense>
  );
}
