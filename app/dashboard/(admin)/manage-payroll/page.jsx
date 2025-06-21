// app/dashboard/(admin)/manage-payroll/page.jsx

import TemporaryPage from "@/components/Dashboard/temporary-page";
import React from "react";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function ManagePayrollPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <TemporaryPage />
    </Suspense>
  );
}
