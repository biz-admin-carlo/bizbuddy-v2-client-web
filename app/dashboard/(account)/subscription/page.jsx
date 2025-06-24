// app/dashboard/(account)/subscription/page.jsx

import AccountSubscription from "@/components/Dashboard/DashboardContent/Settings/Account/account-subscription";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AccountSubscription />
    </Suspense>
  );
}
