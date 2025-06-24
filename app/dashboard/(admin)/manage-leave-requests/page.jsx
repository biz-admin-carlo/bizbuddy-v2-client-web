// app/dashboard/(admin)/manage-leave-requests/page.jsx

import ManageLeaveRequests from "@/components/Dashboard/DashboardContent/Settings/Admin/ManageLeaveRequests";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function ManageLeaveRequestsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ManageLeaveRequests />
    </Suspense>
  );
}
