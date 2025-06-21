// app/dashboard/(admin)/manage-departments/page.jsx

import ManageDepartments from "@/components/Dashboard/DashboardContent/Settings/Admin/ManageDepartments";
import React from "react";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function ManageDepartmentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading leave requests…</div>}>
      <ManageDepartments />
    </Suspense>
  );
}
