// app/dashboard/(admin)/manage-departments/page.jsx

import ManageDepartments from "@/components/Dashboard/DashboardContent/Settings/Admin/ManageDepartments";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function ManageDepartmentsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ManageDepartments />
    </Suspense>
  );
}
