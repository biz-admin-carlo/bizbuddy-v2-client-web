// app/dashboard/(admin)/manage-overtime-requests/page.jsx

import ManageOvertime from "@/components/Dashboard/DashboardContent/Settings/Admin/ManageOvertime";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function ManagePayrollPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ManageOvertime />
    </Suspense>
  );
}
