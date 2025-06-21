// app/dashboard/(features)/my-time-log/page.jsx

import MyTimeLog from "@/components/Dashboard/DashboardContent/Features/MyTimeLog";
import React from "react";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function MyTimeLogPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <MyTimeLog />
    </Suspense>
  );
}
