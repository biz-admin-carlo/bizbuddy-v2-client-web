// app/dashboard/(admin)/manage-shift-schedules/page.jsx

import ManageShiftSchedules from "@/components/Dashboard/DashboardContent/Settings/Admin/ManageShiftSchedules";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function ManageShiftSchedulesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ManageShiftSchedules />
    </Suspense>
  );
}
