// app/dashboard/(account)/subscription/page.jsx

import AccountSubscription from "@/components/Dashboard/DashboardContent/Settings/Account/account-subscription";
import React from "react";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function page() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading leave requests…</div>}>
      <AccountSubscription />
    </Suspense>
  );
}
