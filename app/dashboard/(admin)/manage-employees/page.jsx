// app/dashboard/(admin)/manage-employees/page.jsx

import ManageEmployees from "@/components/Dashboard/DashboardContent/Settings/Admin/ManageEmployees";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function ManageEmployeesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ManageEmployees />
    </Suspense>
  );
}
