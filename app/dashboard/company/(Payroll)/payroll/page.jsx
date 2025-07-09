// app/dashboard/company/(Payroll)/payroll/page.jsx

import TemporaryPage from "@/components/Dashboard/DashboardContent/Others/TemporaryPage";
import DashboardSkeleton from "@/app/dashboard/DashboardSkeleton";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function PayrollPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TemporaryPage />
    </Suspense>
  );
}
