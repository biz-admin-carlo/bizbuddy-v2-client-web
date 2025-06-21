// app/dashboard/(features)/my-leave-requests/page.jsx

import MyLeavesRequest from "@/components/Dashboard/DashboardContent/Features/MyLeavesRequest";
import React from "react";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function MyLeavesRequestPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <MyLeavesRequest />
    </Suspense>
  );
}
