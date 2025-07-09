// app/dashboard/company/(Shifts&Schedules&Locations)/shifts/page.jsx

import Shifts from "@/components/Dashboard/DashboardContent/CompanyPanel/Shifts&Schedules&Locations/Shifts";
import DashboardSkeleton from "../../../DashboardSkeleton";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function ShiftsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Shifts />
    </Suspense>
  );
}
