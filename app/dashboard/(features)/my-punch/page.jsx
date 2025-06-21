// app/dashboard/(features)/my-punch/page.jsx

import MyPunch from "@/components/Dashboard/DashboardContent/Features/MyPunch";
import React from "react";
import { Suspense } from "react";
export const dynamic = "force-dynamic";

export default function MyPunchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <MyPunch />
    </Suspense>
  );
}
