// app/dashboard/(admin)/manage-locations/page.jsx

import ManageLocations from "@/components/Dashboard/DashboardContent/Settings/Admin/ManageLocations";
import React from "react";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function ManageLocationsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading leave requests…</div>}>
      <ManageLocations />
    </Suspense>
  );
}
