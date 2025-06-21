// app/dashboard/(features)/my-leave-approvals/page.jsx

import MyLeavesApproval from "@/components/Dashboard/DashboardContent/Features/MyLeavesApproval";
import React from "react";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function MyLeavesApprovalPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <MyLeavesApproval />
    </Suspense>
  );
}
