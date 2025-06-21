// app/dashboard/(admin)/manage-company-settings/page.jsx

import CompanySettingsPage from "@/components/Dashboard/DashboardContent/Settings/Admin/ManageCompanySettings";
import React from "react";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function page() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading leave requests…</div>}>
      <CompanySettingsPage />;
    </Suspense>
  );
}
