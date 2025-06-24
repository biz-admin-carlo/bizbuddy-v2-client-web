// app/dashboard/(features)/my-payroll/page.jsx

import TemporaryPage from "@/components/Dashboard/temporary-page";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function MyPayrollPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TemporaryPage />
    </Suspense>
  );
}
