// app/dashboard/(admin)/manage-shifts/page.jsx

import ManageShifts from "@/components/Dashboard/DashboardContent/Settings/Admin/ManageShifts";
import React from "react";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function page() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <ManageShifts />
    </Suspense>
  );
}
