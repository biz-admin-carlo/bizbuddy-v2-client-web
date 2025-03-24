"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "../ui/sidebar";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";

// ====================================================================
// 1. Data Structures: Original Features and Settings Items
// ====================================================================
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
      { id: "my-time-log", label: "My Time Logs" },
      { id: "my-shift-schedule", label: "My Shift Schedule" },
      { id: "my-punch", label: "Punch" },
    ],
  },
  {
    id: "my-payroll",
    label: "My Payroll",
    children: [{ id: "my-payroll", label: "My Payroll" }],
  },
  {
    id: "leaves",
    label: "Leaves",
    children: [
      { id: "my-leave-requests", label: "Request Leave" },
      { id: "my-leave-approvals", label: "My Approval Leaves" },
    ],
  },
];

const originalSettingsItems = [
  {
    id: "company",
    label: "Company",
    children: [
      { id: "manage-companies", label: "Companies" },
      { id: "manage-subscribers", label: "Subscribers" },
      { id: "manage-subscription-plans", label: "Subscription Plans" },
    ],
  },
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
      { id: "manage-shift-schedules", label: "Shifts Schedules" },
      { id: "manage-locations", label: "Locations" },
      { id: "manage-leave-requests", label: "Leave Requests" },
    ],
  },
  {
    id: "payroll",
    label: "Payroll",
    children: [{ id: "manage-payroll", label: "Payroll" }],
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

// ====================================================================
// 2. Utility Functions to Lock/Unlock Menu Items Based on Subscription
// ====================================================================
function getFeaturesWithLock(items, subscriptionPlan) {
  if (subscriptionPlan === "free") {
    const allowedIds = new Set(["time-logs", "punch", "shift-schedule"]);
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
    children: group.children.map((child) => ({ ...child, locked: false })),
  }));
}

function getSettingsWithLock(items, subscriptionPlan, role) {
  let updated = items;
  if (subscriptionPlan === "free") {
    updated = items.map((group) => ({
      ...group,
      children: group.children.map((child) => ({
        ...child,
        locked: !["mysubscription", "appearance"].includes(child.id),
        requiredPlan: ["mysubscription", "appearance"].includes(child.id) ? null : "Basic",
      })),
    }));
  } else if (subscriptionPlan === "basic") {
    updated = items.map((group) => ({
      ...group,
      children: group.children.map((child) => ({
        ...child,
        locked: child.id === "locations",
        requiredPlan: child.id === "locations" ? "Pro" : null,
      })),
    }));
  } else {
    updated = items.map((group) => ({
      ...group,
      children: group.children.map((child) => ({ ...child, locked: false })),
    }));
  }

  // ---------- FIX: Force unlock the "account" group regardless ----------
  updated = updated.map((group) => {
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
    return group;
  });
  // -----------------------------------------------------------------------

  switch (role?.toLowerCase()) {
    case "superadmin":
      return updated;
    case "admin":
      return updated.filter((group) => group.id !== "company");
    case "supervisor":
      return updated.filter((group) => ["departments", "preference"].includes(group.id));
    case "employee":
    case "employees":
      return updated.filter((group) => group.id === "preference");
    default:
      return updated;
  }
}

// ====================================================================
// 3. Collapsible Navigation Item Component
// ====================================================================
function CollapsibleNavItem({ item, pathname, onNavigate, expanded, onToggle }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => onToggle(item.id)}
        className="justify-between hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors duration-200 mb-1 p-2"
      >
        {item.label}
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </SidebarMenuButton>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ul className="ml-4 space-y-1">
              {item.children.map((child) => {
                const routePath = `/dashboard/${child.id}`;
                const isActive = pathname === routePath;
                return (
                  <li key={child.id}>
                    <Button
                      onClick={() => {
                        if (!child.locked) onNavigate(routePath);
                      }}
                      disabled={child.locked}
                      className={`flex justify-between items-center w-full text-left px-2 text-sm transition-all bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400 ${
                        isActive
                          ? "font-semibold bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-300"
                          : "hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      } ${child.locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {child.label}
                      {child.locked && (
                        <Badge variant="outline" className="ml-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                          {child.requiredPlan} <Lock className="w-3 h-3 ml-1" />
                        </Badge>
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </SidebarMenuItem>
  );
}

// ====================================================================
// 4. Main Navigation Component for Dashboard
// ====================================================================
function MainNavigation({ items, pathname, onNavigate, openDropdown, setOpenDropdown }) {
  return (
    <SidebarMenu>
      {items.map((item) =>
        item.children ? (
          <CollapsibleNavItem
            key={item.id}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
            expanded={openDropdown === item.id}
            onToggle={(id) => setOpenDropdown(openDropdown === id ? null : id)}
          />
        ) : (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              onClick={() => onNavigate(`/dashboard/${item.id}`)}
              className="block w-full text-left p-2 my-1 rounded-md transition-colors duration-200"
            >
              {item.label}
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      )}
    </SidebarMenu>
  );
}

// ====================================================================
// 5. Settings Navigation Component
// ====================================================================
function SettingsMenu({ items, pathname, onNavigate, openDropdown, setOpenDropdown }) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <CollapsibleNavItem
          key={item.id}
          item={item}
          pathname={pathname}
          onNavigate={onNavigate}
          expanded={openDropdown === item.id}
          onToggle={(id) => setOpenDropdown(openDropdown === id ? null : id)}
        />
      ))}
    </SidebarMenu>
  );
}

// ====================================================================
// 6. Sidebar User Info Component
// ====================================================================
function SidebarUserInfo({ profileData, subscriptionPlan }) {
  // Now extract the proper nested data
  const user = profileData.user;
  const userProfile = profileData.profile;
  const company = profileData.company;

  // Extract initials from userProfile (if available)
  const initials = `${userProfile?.firstName?.charAt(0) || ""}${userProfile?.lastName?.charAt(0) || ""}`.toUpperCase() || "?";
  // For display name, prefer firstName and lastName; fallback to username from the user object
  const displayName =
    userProfile?.firstName || userProfile?.lastName ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() : user.username;

  return (
    <div className="flex flex-col items-center space-y-2 p-3 border-b border-neutral-200 dark:border-neutral-700">
      <Avatar className="w-12 h-12">
        <AvatarImage src={userProfile?.avatarUrl} alt={displayName} />
        <AvatarFallback className="text-sm font-semibold border">{initials}</AvatarFallback>
      </Avatar>
      <div className="text-center capitalize">
        <p className="font-semibold text-sm">{displayName}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{user.role}</p>
      </div>
      <div className="flex w-full justify-between items-center">
        <p className="text-sm">{company?.name}</p>
        <Badge variant="secondary" className="capitalize px-2 py-0.5 text-xs">
          {subscriptionPlan}
        </Badge>
      </div>
      <div className="text-xs text-start text-neutral-500 dark:text-neutral-400">
        <p>Comp ID: {company?.id}</p>
        <p>User ID: {user?.id}</p>
      </div>
    </div>
  );
}

// ====================================================================
// 7. Complete Sidebar Component
// ====================================================================
export default function SideBar() {
  const { token } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [profileData, setProfileData] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);

  // Fetch user profile from the backend endpoint (/api/account/profile)
  useEffect(() => {
    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/account/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            console.log("SignedInUser Data: ", data.data);
            setProfileData(data.data);
          }
        })
        .catch((err) => console.error("Failed to fetch user profile:", err));
    }
  }, [token]);

  // Extract subscription from the profileData if available.
  useEffect(() => {
    if (profileData && profileData.subscription) {
      setSubscription(profileData.subscription);
    } else {
      setSubscription(null);
    }
  }, [profileData]);

  if (!profileData) return null;

  const subscriptionPlan = subscription?.plan?.name?.toLowerCase() || "free";
  const featuresItems = getFeaturesWithLock(originalFeaturesItems, subscriptionPlan);
  const settingsItems = getSettingsWithLock(originalSettingsItems, subscriptionPlan, profileData.user.role);

  const onNavigate = (path) => {
    router.push(path);
  };

  return (
    <SidebarProvider className="border-none">
      <Sidebar className="border-none bg-gradient-to-r from-neutral-100 dark:from-black to-white dark:to-neutral-900 lg:pt-14 h-[calc(100vh-4rem)] lg:h-screen fixed left-0 top-16 lg:top-0 z-40 w-64 overflow-y-auto">
        <SidebarHeader>
          <SidebarUserInfo profileData={profileData} subscriptionPlan={subscriptionPlan} />
        </SidebarHeader>
        <SidebarContent className="space-y-6 px-3 py-4">
          <div>
            <h2 className="mb-2 px-4 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Dashboard</h2>
            <MainNavigation
              items={featuresItems}
              pathname={pathname}
              onNavigate={onNavigate}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
            />
          </div>
          <div>
            <h2 className="mb-2 px-4 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Settings</h2>
            <SettingsMenu
              items={settingsItems}
              pathname={pathname}
              onNavigate={onNavigate}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
            />
          </div>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
