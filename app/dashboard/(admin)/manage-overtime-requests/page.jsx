// app/dashboard/(admin)/manage-overtime-requests/page.jsx

import ManageOvertime from "@/components/Dashboard/DashboardContent/Settings/Admin/ManageOvertime";
import React from "react";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function ManagePayrollPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading leave requests…</div>}>
      <ManageOvertime />
    </Suspense>
  );
}
