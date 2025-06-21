// app/dashboard/(admin)/manage-employees/page.jsx

import ManageEmployees from "@/components/Dashboard/DashboardContent/Settings/Admin/ManageEmployees";
import React from "react";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function ManageEmployeesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading leave requests…</div>}>
      <ManageEmployees />
    </Suspense>
  );
}
