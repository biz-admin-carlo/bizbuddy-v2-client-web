// File: biz-web-app/components/Dashboard/DashboardContent/sidebar.jsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DoorClosedIcon as CloseIcon, Lock, ChevronDown, Building2, User } from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

const originalFeaturesItems = [
  { id: "overview", label: "Overview", children: [{ id: "overview", label: "Overview" }] },
  {
    id: "time-keeping",
    label: "Time Keeping",
    children: [
      { id: "my-punch", label: "Punch" },
      { id: "my-time-log", label: "My Timelogs" },
      { id: "my-shift-schedule", label: "My Schedule" },
    ],
  },
  {
    id: "leaves",
    label: "Leaves",
    children: [
      { id: "my-leave-requests", label: "Request" },
      { id: "my-leave-approvals", label: "Approval" },
    ],
  },
  { id: "my-payroll", label: "My Payroll", children: [{ id: "my-payroll", label: "My Payroll" }] },
];

const originalSettingsItems = [
  {
    id: "departments",
    label: "Departments",
    children: [{ id: "manage-departments", label: "Departments" }],
  },
  {
    id: "employees",
    label: "Employees",
    children: [
      { id: "manage-employees", label: "Employees" },
      { id: "manage-timelogs", label: "Timelogs" },
      { id: "manage-overtime-requests", label: "Overtime Requests" },
      { id: "manage-leave-requests", label: "Leave Requests" },
    ],
  },
  {
    id: "shifts",
    label: "Shifts & Locations",
    children: [
      { id: "manage-shifts", label: "Shifts" },
      { id: "manage-shift-schedules", label: "Shift Schedules" },
      { id: "manage-locations", label: "Locations" },
    ],
  },
  {
    id: "account",
    label: "Account",
    children: [
      { id: "subscription", label: "Subscription" },
      { id: "manage-company-settings", label: "Settings" },
      { id: "settings", label: "Deletion" },
    ],
  },
];

function getFeaturesWithLock(items, plan) {
  if (plan === "free") {
    const allow = new Set(["my-time-log", "my-punch"]);
    return items.map((g) => ({
      ...g,
      children: g.children.map((c) => ({
        ...c,
        locked: !allow.has(c.id),
        requiredPlan: allow.has(c.id) ? null : "Basic",
      })),
    }));
  }
  return items.map((g) => ({
    ...g,
    children: g.children.map((c) => ({ ...c, locked: false, requiredPlan: null })),
  }));
}

function getSettingsWithLock(items, plan, role) {
  let out;
  if (plan === "free") {
    out = items.map((g) =>
      g.id === "account"
        ? {
            ...g,
            children: g.children.map((c) => ({ ...c, locked: false, requiredPlan: null })),
          }
        : {
            ...g,
            children: g.children.map((c) => ({
              ...c,
              locked: true,
              requiredPlan: "Basic",
            })),
          }
    );
  } else {
    out = items.map((g) => ({
      ...g,
      children: g.children.map((c) => ({ ...c, locked: false, requiredPlan: null })),
    }));
  }

  const r = role?.toLowerCase();
  if (r === "superadmin") {
    out = [
      ...out,
      {
        id: "companies",
        label: "Companies",
        children: [{ id: "manage-companies", label: "Manage Companies", locked: false, requiredPlan: null }],
      },
    ];
  } else if (r === "employee") {
    out = out.filter((g) => g.id === "account");
  }
  return out;
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="flex flex-col items-center p-6 border-b border-neutral-200 dark:border-neutral-700">
        <Skeleton className="w-16 h-16 rounded-full mb-3" />
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-20 mb-3" />
        <div className="flex w-full justify-between items-center">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
      <div className="px-4 py-4 space-y-8 flex-1 overflow-y-auto">
        {[...Array(2)].map((_, g) => (
          <div key={g}>
            <Skeleton className="h-4 w-24 mb-4" />
            {[...Array(3)].map((__, i) => (
              <div key={i} className="mb-3">
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CollapsibleNavItem({ item, currentPath, onNavigate, expanded, onToggle }) {
  return (
    <li className="mb-2">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex justify-between items-center w-full px-4 py-3 rounded-xl
                   bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700
                   hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-50 
                   dark:hover:from-orange-900 dark:hover:to-orange-900
                   hover:border-orange-200 dark:hover:border-orange-700
                   transition-all duration-200 text-sm font-medium
                   shadow-sm hover:shadow-md"
        onClick={() => onToggle(item.id)}
      >
        <span className="text-neutral-700 dark:text-neutral-200">{item.label}</span>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-neutral-500" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.ul
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="mt-2 ml-2 space-y-1 overflow-hidden"
          >
            {item.children.map((c, index) => {
              const route = `/dashboard/${c.id}`;
              const active = currentPath === route;
              return (
                <motion.li key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                  <button
                    onClick={() => !c.locked && onNavigate(route)}
                    disabled={c.locked}
                    className={`flex items-center justify-between w-full text-left rounded-lg
                                px-4 py-2.5 text-sm transition-all duration-200
                                border-l-2 ml-2
                                ${
                                  active
                                    ? "bg-gradient-to-r from-orange-100 to-orange-100 dark:from-orange-900 dark:to-orange-900 border-l-orange-500 font-semibold text-orange-700 dark:text-orange-300 shadow-sm"
                                    : "hover:bg-neutral-50 dark:hover:bg-neutral-800 border-l-transparent hover:border-l-neutral-300 dark:hover:border-l-neutral-600"
                                }
                                ${c.locked ? "cursor-not-allowed opacity-60" : "hover:shadow-sm"}`}
                  >
                    <span className={active ? "text-orange-700 dark:text-orange-300" : "text-neutral-600 dark:text-neutral-300"}>{c.label}</span>
                    {c.locked && c.requiredPlan && (
                      <Badge
                        variant="outline"
                        className="ml-2 flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                      >
                        {c.requiredPlan}
                        <Lock className="w-3 h-3" />
                      </Badge>
                    )}
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

function SidebarUserInfo({ profileData, plan }) {
  const usr = profileData?.user || {};
  const prof = profileData?.profile || {};
  const comp = profileData?.company || {};

  const initials = (prof.firstName?.[0] || "") + (prof.lastName?.[0] || "");
  const name = prof.firstName || prof.lastName ? `${prof.firstName} ${prof.lastName}`.trim() : usr.username || "Unknown User";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 border-b border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-800"
    >
      <div className="flex flex-col items-center text-center">
        <motion.div whileHover={{ scale: 1.05 }} className="relative mb-3">
          <Avatar className="w-16 h-16 border-2 border-white dark:border-neutral-700 shadow-lg">
            <AvatarImage src={prof.avatarUrl || "/placeholder.svg"} alt={name} />
            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold text-lg">
              {initials.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-neutral-900 rounded-full"></div>
        </motion.div>

        <div className="mb-3">
          <h3 className="font-semibold text-base text-neutral-800 dark:text-neutral-100 ">{name}</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 capitalize flex items-center justify-center gap-1">
            <User className="w-3 h-3" />
            {usr.role}
          </p>
        </div>

        <div className="w-full flex justify-between items-center">
          <div className="flex items-center justify-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <Building2 className="w-4 h-4" />
            <span className="">{comp.name || "No Company"}</span>
          </div>
          <Badge className={`capitalize cursor-pointer`}>{plan} Plan</Badge>
        </div>
      </div>
    </motion.div>
  );
}

export default function Sidebar({ isSidebarOpen, closeSidebar }) {
  const { token } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const [profileData, setProfileData] = useState(null);
  const [plan, setPlan] = useState("free");
  const [openDropdown, setOpenDropdown] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/account/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setProfileData(d.data);
          const p = d.data.subscription?.plan?.name?.toLowerCase() || "free";
          setPlan(p);
        }
      })
      .catch((e) => console.error("Profile fetch error:", e))
      .finally(() => setLoading(false));
  }, [token]);

  const role = profileData?.user?.role || "employee";
  const features = getFeaturesWithLock(originalFeaturesItems, plan);
  const settings = getSettingsWithLock(originalSettingsItems, plan, role);

  const navigate = (route) => {
    closeSidebar && closeSidebar();
    router.push(route);
  };

  const toggle = (id) => setOpenDropdown(openDropdown === id ? null : id);

  if (!token) return null;

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: -320 }}
        animate={{ x: isSidebarOpen ? 0 : -320 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed top-0 left-0 z-50 h-screen w-80 max-w-[85vw]
                   bg-gradient-to-b from-white via-neutral-50 to-white 
                   dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900
                   border-r border-neutral-200 dark:border-neutral-700
                   shadow-2xl"
      >
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={closeSidebar}
          className="absolute top-4 right-4 z-10 p-2
                     bg-white dark:bg-neutral-800
                     border border-neutral-200 dark:border-neutral-600
                     rounded-full shadow-lg hover:shadow-xl
                     transition-all duration-200"
        >
          <CloseIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
        </motion.button>

        <div className="flex flex-col h-full overflow-hidden">
          {loading || !profileData ? (
            <SidebarSkeleton />
          ) : (
            <>
              <SidebarUserInfo profileData={profileData} plan={plan} />

              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <h2 className="mb-4 px-2 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    Employee Panel
                  </h2>
                  <ul className="space-y-2">
                    {features.map((g, index) => (
                      <motion.div key={g.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + index * 0.05 }}>
                        <CollapsibleNavItem item={g} currentPath={pathname} onNavigate={navigate} expanded={openDropdown === g.id} onToggle={toggle} />
                      </motion.div>
                    ))}
                  </ul>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <h2 className="mb-4 px-2 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    Management Panel
                  </h2>
                  <ul className="space-y-2">
                    {settings.map((g, index) => (
                      <motion.div key={g.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + index * 0.05 }}>
                        <CollapsibleNavItem item={g} currentPath={pathname} onNavigate={navigate} expanded={openDropdown === g.id} onToggle={toggle} />
                      </motion.div>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}
