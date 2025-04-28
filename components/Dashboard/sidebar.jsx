"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import useAuthStore from "@/store/useAuthStore";

import { Menu as MenuIcon, X as CloseIcon, Lock, ChevronDown, ChevronUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/* ------------------------------------------------------------------ */
/* 1) Static menu definitions (base lists — role/plan logic below)     */
/* ------------------------------------------------------------------ */
const originalFeaturesItems = [
  {
    id: "overview",
    label: "Overview",
    children: [{ id: "overview", label: "Overview" }],
  },
  {
    id: "time-keeping",
    label: "Time Keeping",
    children: [
      { id: "my-punch", label: "Punch" },
      { id: "my-time-log", label: "Timecard" },
      { id: "my-shift-schedule", label: "Schedule" },
    ],
  },
  {
    id: "leaves",
    label: "Leaves",
    children: [
      { id: "my-leave-requests", label: "Request Leaves" },
      { id: "my-leave-approvals", label: "Approved Leaves" },
    ],
  },
  {
    id: "my-payroll",
    label: "My Payroll",
    children: [{ id: "my-payroll", label: "My Payroll" }],
  },
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
      { id: "settings", label: "Settings" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* 2) Lock / unlock helpers                                            */
/* ------------------------------------------------------------------ */
function getFeaturesWithLock(items, subscriptionPlan) {
  if (subscriptionPlan === "free") {
    const allowedIds = new Set(["my-time-log", "my-punch"]);
    return items.map((group) => ({
      ...group,
      children: group.children.map((child) => ({
        ...child,
        locked: !allowedIds.has(child.id),
        requiredPlan: allowedIds.has(child.id) ? null : "Basic",
      })),
    }));
  }
  return items.map((group) => ({
    ...group,
    children: group.children.map((child) => ({
      ...child,
      locked: false,
      requiredPlan: null,
    })),
  }));
}

function getSettingsWithLock(items, subscriptionPlan, role) {
  let updated;

  /* ---------- plan-based locking ---------- */
  if (subscriptionPlan === "free") {
    updated = items.map((group) => {
      if (group.id === "account") {
        return {
          ...group,
          children: group.children.map((child) => ({
            ...child,
            locked: false,
            requiredPlan: null,
          })),
        };
      }
      return {
        ...group,
        children: group.children.map((child) => ({
          ...child,
          locked: true,
          requiredPlan: "Basic",
        })),
      };
    });
  } else {
    updated = items.map((group) => ({
      ...group,
      children: group.children.map((child) => ({
        ...child,
        locked: false,
        requiredPlan: null,
      })),
    }));
  }

  /* ---------- role-based filtering ---------- */
  const lowerRole = role?.toLowerCase();

  if (lowerRole === "superadmin") {
    updated = [
      ...updated,
      {
        id: "companies",
        label: "Companies",
        children: [
          {
            id: "manage-companies",
            label: "Manage Companies",
            locked: false,
            requiredPlan: null,
          },
        ],
      },
    ];
  } else if (lowerRole === "admin") {
    updated = updated.filter((g) => g.id !== "some-other-group");
  } else if (lowerRole === "employee") {
    updated = updated.filter((g) => g.id === "account");
  }

  return updated;
}

/* ------------------------------------------------------------------ */
/* 3) Collapsible nav item                                             */
/* ------------------------------------------------------------------ */
function CollapsibleNavItem({ item, currentPath, onNavigate, expanded, onToggle }) {
  return (
    <li className="mb-1">
      <button
        className="flex justify-between items-center w-full px-3 py-2 rounded-md mb-2
                   hover:bg-neutral-100 dark:hover:bg-neutral-900 transition text-base"
        onClick={() => onToggle(item.id)}
      >
        <span>{item.label}</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-4 border-l border-neutral-200 dark:border-neutral-700"
          >
            {item.children.map((child) => {
              const route = `/dashboard/${child.id}`;
              const isActive = currentPath === route;
              return (
                <li key={child.id}>
                  <button
                    onClick={() => {
                      if (!child.locked) onNavigate(route);
                    }}
                    disabled={child.locked}
                    className={`flex items-center justify-between w-full text-left rounded-md mb-1
                                px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 
                                ${isActive ? "font-semibold bg-neutral-100 dark:bg-neutral-900" : ""} 
                                ${child.locked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                  >
                    {child.label}
                    {child.locked && child.requiredPlan && (
                      <Badge variant="outline" className="ml-2 flex items-center gap-1">
                        {child.requiredPlan}
                        <Lock className="w-3 h-3" />
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* 4) Sidebar header (user info)                                       */
/* ------------------------------------------------------------------ */
function SidebarUserInfo({ profileData, subscriptionPlan }) {
  const userObj = profileData?.user || {};
  const userProfile = profileData?.profile || {};
  const company = profileData?.company || {};

  const initials = (userProfile.firstName?.[0] || "") + (userProfile.lastName?.[0] || "");
  const displayName =
    userProfile.firstName || userProfile.lastName ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : userObj.username || "Unknown User";

  return (
    <div className="flex flex-col items-center p-4 border-b border-neutral-200 dark:border-neutral-700">
      <Avatar className="w-12 h-12 mb-2">
        <AvatarImage src={userProfile.avatarUrl} alt={displayName} />
        <AvatarFallback>{initials.toUpperCase() || "?"}</AvatarFallback>
      </Avatar>
      <div className="text-center capitalize">
        <p className="font-semibold text-sm">{displayName}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{userObj.role}</p>
      </div>
      <div className="flex w-full justify-between items-center mt-2">
        <span className="text-sm">{company.name || "No Company"}</span>
        <Badge className="capitalize">{subscriptionPlan}</Badge>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5) Main responsive sidebar                                          */
/* ------------------------------------------------------------------ */
export default function ResponsiveSidebar({ isSidebarOpen, closeSidebar }) {
  const { token } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const [profileData, setProfileData] = useState(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState("free");
  const [openDropdown, setOpenDropdown] = useState(null);

  /* ---------- fetch profile ---------- */
  useEffect(() => {
    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/account/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setProfileData(data.data);
            const plan = data.data.subscription?.plan?.name?.toLowerCase() || "free";
            setSubscriptionPlan(plan);
          }
        })
        .catch((err) => console.error("Error fetching profile:", err));
    }
  }, [token]);

  /* ---------- build menus ---------- */
  const role = profileData?.user?.role || "employee";
  const featuresItems = getFeaturesWithLock(originalFeaturesItems, subscriptionPlan);
  const settingsItems = getSettingsWithLock(originalSettingsItems, subscriptionPlan, role);

  /* ---------- navigation helpers ---------- */
  const onNavigate = (route) => {
    if (closeSidebar) closeSidebar();
    router.push(route);
  };

  const toggleGroup = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  if (!token || !profileData) return null;

  return (
    <div
      className={`
        fixed top-0 left-0 z-50 w-64 h-screen 
        bg-gradient-to-r from-white dark:from-black to-white dark:to-black
        border-r border-neutral-200 dark:border-neutral-700
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static md:h-auto
      `}
    >
      {/* backdrop for mobile */}
      {isSidebarOpen && <div className="absolute inset-0 bg-black/30 block md:hidden" onClick={closeSidebar} />}

      {/* sidebar content */}
      <div className="relative z-10 flex flex-col h-full overflow-y-auto">
        {/* close button (mobile) */}
        {isSidebarOpen && (
          <button
            onClick={closeSidebar}
            className="absolute top-3 right-3 md:hidden p-2 text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded-full hover:bg-neutral-200"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}

        {/* user header */}
        <SidebarUserInfo profileData={profileData} subscriptionPlan={subscriptionPlan} />

        {/* dashboard section */}
        <div className="px-3 py-3">
          <h2 className="mb-2 px-2 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Dashboard</h2>
          <ul className="space-y-1">
            {featuresItems.map((group) => (
              <CollapsibleNavItem
                key={group.id}
                item={group}
                currentPath={pathname}
                onNavigate={onNavigate}
                expanded={openDropdown === group.id}
                onToggle={toggleGroup}
              />
            ))}
          </ul>
        </div>

        {/* settings section */}
        <div className="px-3 py-3">
          <h2 className="mb-2 px-2 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Settings</h2>
          <ul className="space-y-1">
            {settingsItems.map((group) => (
              <CollapsibleNavItem
                key={group.id}
                item={group}
                currentPath={pathname}
                onNavigate={onNavigate}
                expanded={openDropdown === group.id}
                onToggle={toggleGroup}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
