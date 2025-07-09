// app/dashboard/company/(Shifts&Schedules&Locations)/schedules/page.jsx

import Schedules from "@/components/Dashboard/DashboardContent/CompanyPanel/Shifts&Schedules&Locations/Schedules";
import DashboardSkeleton from "../../../DashboardSkeleton";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function SchedulesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Schedules />
    </Suspense>
  );
}
