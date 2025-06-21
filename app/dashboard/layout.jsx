// File: biz-web-app/app/dashboard/layout.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { MenuIcon, DoorClosedIcon as CloseIcon, Bell, Search } from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import Sidebar from "@/components/Dashboard/sidebar";

export default function DashboardLayout({ children }) {
  const { token, login } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      const stored = localStorage.getItem("auth-storage");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.state && parsed.state.token) {
            login(parsed.state.token);
            return;
          }
        } catch (err) {
          console.error("Error parsing auth storage:", err);
        }
      }
      router.push("/sign-in");
      setIsLoading(false);
    } else {
      try {
        const decoded = { sub: "123" };
        setUser(decoded);
        setIsLoading(false);
      } catch (err) {
        console.error("Token decode failed:", err);
        router.push("/sign-in");
        setIsLoading(false);
      }
    }
  }, [token, login, router]);

  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => setIsReady(true), 50);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isLoading || !isReady) return <DashboardSkeleton />;
  if (!token || !user) return null;

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-900">
        {/* Mobile Header */}
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="md:hidden sticky top-0 z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-lg border-b border-neutral-200 dark:border-neutral-700"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <motion.div animate={{ rotate: isSidebarOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  {isSidebarOpen ? <CloseIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
                </motion.div>
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* Desktop Sidebar Toggle */}
        <AnimatePresence>
          {!isSidebarOpen && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSidebarOpen(true)}
              className="hidden md:flex fixed top-3 left-6 z-50 p-3
                         bg-gradient-to-r from-orange-500 to-orange-600 text-white
                         rounded-2xl shadow-lg hover:shadow-xl
                         transition-all duration-200"
            >
              <MenuIcon className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />

        {/* Main Content */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={`transition-all duration-300 ease-in-out min-h-screen
                     ${isSidebarOpen ? "md:ml-80" : "md:ml-0"}
                     ${isSidebarOpen ? "md:pl-6" : "md:pl-20"}`}
        >
          <div className="p-4 md:p-6 lg:p-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm rounded-2xl shadow-sm border border-neutral-200/50 dark:border-neutral-700/50 min-h-[calc(100vh-8rem)] md:min-h-[calc(100vh-6rem)]"
            >
              {children}
            </motion.div>
          </div>
        </motion.main>
      </div>
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-900">
      {/* Mobile Header Skeleton */}
      <div className="md:hidden border-b border-neutral-200 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div>
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>

      {/* Desktop Toggle Skeleton */}
      <div className="hidden md:block">
        <Skeleton className="fixed top-6 left-6 h-12 w-12 rounded-2xl" />
      </div>

      {/* Main Content Skeleton */}
      <div className="p-4 md:p-6 lg:p-8 md:ml-20">
        <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-700/50">
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
