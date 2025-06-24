// app/dashboard/(admin)/manage-company-settings/page.jsx

import CompanySettingsPage from "@/components/Dashboard/DashboardContent/Settings/Admin/ManageCompanySettings";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <CompanySettingsPage />;
    </Suspense>
  );
}
