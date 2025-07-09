// components/Partial/Navbar.jsx

"use client";

import { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, BellDot } from "lucide-react";
import { ThemeToggle } from "../Theme/ThemeToggle";
import useAuthStore from "@/store/useAuthStore";
import UserMenu from "./Navbar/UserMenu";
import MobileMenu from "./Navbar/MobileMenu";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact Us" },
];

function DesktopNavLinks({ pathname }) {
  return (
    <nav className="flex items-center space-x-1">
      {navLinks.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive
                ? "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950"
                : "text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950"
            }`}
          >
            {link.label}
            {isActive && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SignInButton() {
  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Link
        href="/sign-in"
        className="inline-flex items-center justify-center px-6 py-2.5 font-semibold text-white 
                   rounded-xl text-sm bg-gradient-to-r from-orange-500 to-orange-600 
                   hover:from-orange-600 hover:to-orange-700 transition-all duration-200 
                   shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
      >
        Sign in
      </Link>
    </motion.div>
  );
}

function NotificationButton() {
  const [hasNotifications] = useState(true); // This would come from your notification state

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative p-2 rounded-xl text-neutral-600 dark:text-neutral-400 
                 hover:text-orange-600 dark:hover:text-orange-400 
                 hover:bg-orange-50 dark:hover:bg-orange-950 
                 transition-all duration-200"
    >
      {hasNotifications ? <BellDot className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
      {hasNotifications && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-neutral-900"
        />
      )}
    </motion.button>
  );
}

export default function NavBar() {
  const { token } = useAuthStore();
  const pathname = usePathname();

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-neutral-900/80 
                 backdrop-blur-lg border-b border-neutral-200 dark:border-neutral-700"
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center justify-between h-16">
          <motion.div whileHover={{ scale: 1.05 }}>
            <Link href="/" className="flex items-center pl-16">
              <img src="/logo.png" alt="Bizbuddy title and logo" width={120} height={45} className="h-10 w-auto" />
            </Link>
          </motion.div>

          <div className="flex items-center space-x-6">
            <ThemeToggle />
            {!token ? (
              <>
                <DesktopNavLinks pathname={pathname} />
                <SignInButton />
              </>
            ) : (
              <>
                <NotificationButton />
                <UserMenu />
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="flex items-center justify-between h-14">
            <motion.div whileHover={{ scale: 1.05 }}>
              <Link href="/" className="flex items-center">
                <img src="/logo.png" alt="Bizbuddy title and logo" width={100} height={35} className="h-8 w-auto" />
              </Link>
            </motion.div>

            <div className="flex items-center space-x-2">
              <ThemeToggle />
              {!token ? (
                <>
                  <MobileMenu />
                  <SignInButton />
                </>
              ) : (
                <>
                  <NotificationButton />
                  <UserMenu />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
