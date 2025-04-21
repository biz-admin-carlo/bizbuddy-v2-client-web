"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
// If you decode tokens, import an actual library (jwt-decode), e.g. import jwtDecode from "jwt-decode";
import Sidebar from "@/components/Dashboard/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { Menu as MenuIcon, X as CloseIcon } from "lucide-react";

export default function DashboardLayout({ children }) {
  const { token, login } = useAuthStore();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // NEW: mobile toggle for the sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      // decode token (if you have a real decode library):
      try {
        // e.g. const decoded = jwtDecode(token);
        const decoded = { /* mock decode */ sub: "123" };
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

  // Render
  return (
    <AnimatePresence>
      <motion.div className="min-h-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {/* 
          Top bar for small screens:
          - "md:hidden" => only show the toggle button on < md
        */}
        <div className="flex items-center justify-between p-4 border-b md:hidden">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-neutral-800 hover:text-neutral-600">
            {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
          <h1 className="font-bold">Dashboard</h1>
          <div />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[auto,1fr]">
          {/* Sidebar: 
              In mobile, we conditionally hide or show it with transform classes.
              On md and above, it’s always visible. 
          */}
          <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />

          {/* MAIN CONTENT */}
          <div className="bg-white dark:bg-black min-h-screen">{children}</div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      {/* 
        If you want a simpler skeleton: 
        (Your existing skeleton structure is fine.)
      */}
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
      </div>
    </div>
  );
}
