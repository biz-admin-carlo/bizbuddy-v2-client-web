// app/dashboard/(admin)/manage-timelogs/page.jsx

import ManageTimelogs from "@/components/Dashboard/DashboardContent/Settings/Admin/ManageTimeLogs";
import React from "react";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function page() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <ManageTimelogs />
    </Suspense>
  );
}
