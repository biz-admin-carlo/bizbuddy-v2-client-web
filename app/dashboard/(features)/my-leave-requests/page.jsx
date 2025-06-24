// app/dashboard/(features)/my-leave-requests/page.jsx

import MyLeavesRequest from "@/components/Dashboard/DashboardContent/Features/MyLeavesRequest";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function MyLeavesRequestPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MyLeavesRequest />
    </Suspense>
  );
}
