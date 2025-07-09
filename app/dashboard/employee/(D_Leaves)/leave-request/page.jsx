// app/dashboard/employee/(D_Leaves)/leave-request/page.jsx

import LeaveRequest from "@/components/Dashboard/DashboardContent/EmployeePanel/Leaves/LeaveRequest";
import DashboardSkeleton from "@/app/dashboard/DashboardSkeleton";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function LeaveRequestsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LeaveRequest />
    </Suspense>
  );
}
