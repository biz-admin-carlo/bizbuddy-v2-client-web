// components/Partial/Navbar.jsx

"use client";

import { useState, useRef, useEffect } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  BellDot, 
  X, 
  Check, 
  Info, 
  AlertCircle, 
  CheckCircle, 
  Clock 
} from "lucide-react";
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

const getInitialNotifications = () => {
  const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION || '2.3.1';
  
  const getRelativeTime = (dateString) => {
    const targetDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    
    const daysAgo = Math.floor((today - targetDate) / (1000 * 60 * 60 * 24));
    
    if (daysAgo === 0) return "Today";
    if (daysAgo === 1) return "Yesterday";
    if (daysAgo < 7) return `${daysAgo} days ago`;
    if (daysAgo < 30) {
      const weeks = Math.floor(daysAgo / 7);
      return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
    }
    if (daysAgo < 365) {
      const months = Math.floor(daysAgo / 30);
      return months === 1 ? "1 month ago" : `${months} months ago`;
    }
    const years = Math.floor(daysAgo / 365);
    return years === 1 ? "1 year ago" : `${years} years ago`;
  };
  
  return [
    {
      id: 1,
      type: "success",
      title: "🎉 New Feature: Request Punch Logs",
      message: `Employees can now request retroactive punch log entries if they forgot to clock in/out! Simply go to your Punch Logs page and click "Request Punch Logs" to submit a request. Supervisors and admins will be notified and can approve/reject requests directly from the Employee Punch Logs page. All requests are tracked with reasons and require approval before creating time log entries.`,
      timestamp: getRelativeTime('2025-11-24'),
      read: false,
    },
    {
      id: 2,
      type: "info",
      title: "BizBuddy Application Updated",
      message: `We've made improvements to the time tracking system and added new approval workflows. If you notice any differences or issues with features, please let us know through our contact page.`,
      timestamp: getRelativeTime('2025-11-04'),
      read: false,
    },
  ];
};

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
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full"
              />
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

function NotificationItem({ notification, onMarkAsRead, onRemove }) {
  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "info":
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`p-4 border-b border-neutral-200 dark:border-neutral-700 last:border-b-0 
                  hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors duration-200
                  ${!notification.read ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''}`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className={`text-sm font-medium ${
              !notification.read 
                ? 'text-neutral-900 dark:text-neutral-100' 
                : 'text-neutral-700 dark:text-neutral-300'
            }`}>
              {notification.title}
            </h4>
            {!notification.read && (
              <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
            )}
          </div>
          <p className={`text-sm ${
            !notification.read 
              ? 'text-neutral-600 dark:text-neutral-400' 
              : 'text-neutral-500 dark:text-neutral-500'
          }`}>
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {notification.timestamp}
            </span>
            <div className="flex items-center space-x-1">
              {!notification.read && (
                <button
                  onClick={() => onMarkAsRead(notification.id)}
                  className="p-1 rounded text-orange-600 hover:text-orange-700 
                           hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"
                  title="Mark as read"
                >
                  <Check className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => onRemove(notification.id)}
                className="p-1 rounded text-neutral-400 hover:text-red-500 
                         hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                title="Remove notification"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NotificationPanel({ notifications, onMarkAsRead, onRemove, onMarkAllAsRead, onClose }) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute right-0 mt-2 w-96 max-w-sm bg-white dark:bg-neutral-900 
                 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 
                 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {unreadCount} new notification{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs px-3 py-1 bg-orange-100 dark:bg-orange-900 
                       text-orange-700 dark:text-orange-300 rounded-full
                       hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 
                     hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence>
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onRemove={onRemove}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 text-center"
            >
              <Bell className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">
                No notifications yet
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {/* {notifications.length > 0 && (
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
          <Link
            href="/notifications"
            onClick={onClose}
            className="block w-full text-center text-sm text-orange-600 dark:text-orange-400 
                     hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
          >
            View all notifications
          </Link>
        </div>
      )} */}
    </motion.div>
  );
}

function NotificationButton() {
  const [notifications, setNotifications] = useState(getInitialNotifications());
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const hasNotifications = unreadCount > 0;

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        panelRef.current && 
        !panelRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close panel when pressing Escape
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const handleRemove = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        ref={buttonRef}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        className={`relative p-2 rounded-xl transition-all duration-200 ${
          isOpen
            ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950'
        }`}
      >
        {hasNotifications ? <BellDot className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        {hasNotifications && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 
                     rounded-full border-2 border-white dark:border-neutral-900
                     flex items-center justify-center"
          >
            <span className="text-xs font-medium text-white leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </motion.div>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div ref={panelRef}>
            <NotificationPanel
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onRemove={handleRemove}
              onMarkAllAsRead={handleMarkAllAsRead}
              onClose={handleClose}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
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