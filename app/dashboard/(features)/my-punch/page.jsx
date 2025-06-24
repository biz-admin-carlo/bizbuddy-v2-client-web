// app/dashboard/(features)/my-punch/page.jsx

import MyPunch from "@/components/Dashboard/DashboardContent/Features/MyPunch";
import React from "react";
import { Suspense } from "react";
import DashboardSkeleton from "../../DashboardSkeleton";
export const dynamic = "force-dynamic";

export default function MyPunchPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MyPunch />
    </Suspense>
  );
}
