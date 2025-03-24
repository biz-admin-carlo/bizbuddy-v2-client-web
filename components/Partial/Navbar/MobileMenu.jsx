// File: biz-web-app/components/Partial/Navbar/MobileMenu.jsx
"use client";
import { useState } from "react";
import { Transition } from "@headlessui/react";
import { MdOutlineMenu } from "react-icons/md";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full transition-colors ${
          isOpen ? "text-orange-500" : ""
        }`}
      >
        <MdOutlineMenu size={20} />
      </button>
      <Transition
        show={isOpen}
        enter="transition ease-out duration-100 transform"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-75 transform"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <div className="absolute right-0 mt-2 w-40 origin-top-right bg-white dark:bg-black border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg z-10">
          <div className="py-2">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-2 text-sm transition-colors ${
                pathname === "/"
                  ? "text-orange-500 font-semibold"
                  : "text-neutral-700 dark:text-neutral-200"
              } hover:bg-neutral-100 dark:hover:bg-neutral-700`}
            >
              Home
            </Link>
            <Link
              href="/pricing"
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-2 text-sm transition-colors ${
                pathname === "/pricing"
                  ? "text-orange-500 font-semibold"
                  : "text-neutral-700 dark:text-neutral-200"
              } hover:bg-neutral-100 dark:hover:bg-neutral-700`}
            >
              Pricing
            </Link>
            <Link
              href="/faq"
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-2 text-sm transition-colors ${
                pathname === "/faq"
                  ? "text-orange-500 font-semibold"
                  : "text-neutral-700 dark:text-neutral-200"
              } hover:bg-neutral-100 dark:hover:bg-neutral-700`}
            >
              FAQ
            </Link>
            <Link
              href="/contact"
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-2 text-sm transition-colors ${
                pathname === "/contact"
                  ? "text-orange-500 font-semibold"
                  : "text-neutral-700 dark:text-neutral-200"
              } hover:bg-neutral-100 dark:hover:bg-neutral-700`}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </Transition>
    </div>
  );
}
