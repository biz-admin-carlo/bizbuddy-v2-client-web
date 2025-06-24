// app/dashboard/(account)/settings/page.jsx

import AccountSettings from "@/components/Dashboard/DashboardContent/Settings/Account/account-settings";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";

export const dynamic = "force-dynamic";

export default function page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AccountSettings />
    </Suspense>
  );
}
