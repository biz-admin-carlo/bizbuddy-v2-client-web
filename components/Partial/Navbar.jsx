// File: biz-web-app/components/Partial/Navbar.jsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    <>
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`px-1 py-1 transition-colors hover:text-orange-500 ${
            pathname === link.href ? "text-orange-500" : ""
          }`}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}

function SignInLink() {
  return (
    <Link
      href="/sign-in"
      className="py-2.5 px-4 font-semibold text-white rounded-xl text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:bg-orange-600 transition-colors ease-in-out"
    >
      Sign in
    </Link>
  );
}

function NotificationIcon() {
  return (
    <button className="relative p-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 hover:text-orange-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a2 2 0 10-4 0v1.083A6 6 0 004 11v3.159c0 .538-.214 1.055-.595 1.436L2 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <span className="absolute top-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white bg-red-500"></span>
    </button>
  );
}

export default function NavBar() {
  const { token } = useAuthStore();
  const pathname = usePathname();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-t from-neutral-100 dark:from-neutral-900 to-white dark:to-black px-4 md:px-6 py-1 shadow-md dark:shadow-neutral-800">
      <div className="mx-auto max-w-7xl md:px-4 px-2">
        <div className="hidden md:flex items-center justify-between h-14">
          <Link href="/">
            <img
              src="/logo.png"
              alt="Bizbuddy title and logo"
              width={110}
              height={40}
            />
          </Link>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {!token ? (
              <DesktopNavLinks pathname={pathname} />
            ) : (
              <NotificationIcon />
            )}
            {!token ? <SignInLink /> : <UserMenu />}
          </div>
        </div>
        <div className="md:hidden">
          <div className="flex items-center justify-between h-14">
            <Link href="/">
              <img
                src="/logo.png"
                alt="Bizbuddy title and logo"
                width={100}
                height={25}
              />
            </Link>
            <div className="flex items-center">
              <ThemeToggle />
              {!token ? <MobileMenu /> : <NotificationIcon />}
              {!token ? (
                <Link
                  href="/sign-in"
                  className="py-2 px-4 font-semibold text-white rounded-xl text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:bg-orange-600 transition-colors ease-in-out"
                >
                  Sign in
                </Link>
              ) : (
                <UserMenu />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
