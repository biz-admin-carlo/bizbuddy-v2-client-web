// app/dashboard/(admin)/manage-payroll/page.jsx

import TemporaryPage from "@/components/Dashboard/temporary-page";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function ManagePayrollPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TemporaryPage />
    </Suspense>
  );
}
