// File: biz-web-app/app/dashboard/page.jsx

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardHome() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/overview");
  }, [router]);

  return null;
}
