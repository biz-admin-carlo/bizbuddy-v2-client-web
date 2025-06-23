// app/dashboard/(account)/settings/page.jsx

import AccountSettings from "@/components/Dashboard/DashboardContent/Settings/Account/account-settings";
import React from "react";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function page() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading leave requests…</div>}>
      <AccountSettings />
    </Suspense>
  );
}
