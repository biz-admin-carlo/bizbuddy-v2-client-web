// app/dashboard/(superadmin)/manage-companies/page.jsx

import ManageCompanies from "@/components/Dashboard/DashboardContent/Settings/Superadmin/ManageCompanies";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function ManageCompaniesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ManageCompanies />
    </Suspense>
  );
}
