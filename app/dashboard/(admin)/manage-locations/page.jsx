// app/dashboard/(admin)/manage-locations/page.jsx

import ManageLocations from "@/components/Dashboard/DashboardContent/Settings/Admin/ManageLocations";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function ManageLocationsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ManageLocations />
    </Suspense>
  );
}
