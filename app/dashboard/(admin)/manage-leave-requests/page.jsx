// app/dashboard/(admin)/manage-leave-requests/page.jsx

import ManageLeaveRequests from "@/components/Dashboard/DashboardContent/Settings/Admin/ManageLeaveRequests";
import React from "react";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function ManageLeaveRequestsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading leave requests…</div>}>
      <ManageLeaveRequests />
    </Suspense>
  );
}
