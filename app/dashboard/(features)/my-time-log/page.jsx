// app/dashboard/(features)/my-time-log/page.jsx

import MyTimeLog from "@/components/Dashboard/DashboardContent/Features/MyTimeLog";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function MyTimeLogPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MyTimeLog />
    </Suspense>
  );
}
