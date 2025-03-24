// File: biz-web-app/app/dashboard/layout.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import { jwtDecode } from "jwt-decode";
import Sidebar from "@/components/Dashboard/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";

export default function DashboardLayout({ children }) {
  const { token, login } = useAuthStore();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Check token on mount
  useEffect(() => {
    if (!token) {
      // fallback: check localStorage for saved token
      const stored = localStorage.getItem("auth-storage");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.state && parsed.state.token) {
            login(parsed.state.token);
            return;
          }
        } catch (error) {
          console.error("Error parsing auth storage:", error);
        }
      }
      // If no token found, push to sign-in
      router.push("/sign-in");
      setIsLoading(false);
    } else {
      // decode token
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to decode token:", err);
        router.push("/sign-in");
        setIsLoading(false);
      }
    }
  }, [token, login, router]);

  // Use effect to delay the ready state
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 500); // Adjust this delay as needed
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // If loading or not ready, show a skeleton
  if (isLoading || !isReady) {
    return <DashboardSkeleton />;
  }

  // If no token / no user, return null
  if (!token || !user) return null;

  // If token & user is valid, show the sidebar + child route
  return (
    <AnimatePresence>
      <motion.div
        className="min-h-screen grid grid-cols-1 md:grid-cols-[auto,1fr]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Sidebar />
        <div className="bg-white dark:bg-neutral-900 min-h-screen p-6">{children}</div>
      </motion.div>
    </AnimatePresence>
  );
}

// Improved loading skeleton with pulse animation
function DashboardSkeleton() {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[auto,1fr]">
      <div className="w-64 h-screen bg-neutral-100 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800">
        {/* Sidebar header skeleton */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-col items-center space-y-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
            <div className="flex w-full justify-between items-center">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>

        {/* Sidebar content skeleton */}
        <div className="p-4 space-y-6">
          <div>
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full rounded-md" />
              ))}
            </div>
          </div>

          <div>
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-full rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-neutral-900 min-h-screen">
        <Skeleton className="h-8 w-[200px] mb-6" />
        <Skeleton className="h-[200px] w-full mb-6 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[120px] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
