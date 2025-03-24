// File: biz-web-app/components/Partial/Footer.jsx
"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FaLinkedin,
  FaFacebook,
  FaTwitter,
  FaTiktok,
  FaInstagram,
  FaYoutube,
} from "react-icons/fa";
import { FiArrowRight } from "react-icons/fi";
import { motion } from "framer-motion";

const Footer = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
  };
  return (
    <motion.footer
      className="w-full px-2 mt-28"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-2 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 items-center justify-center">
          <div className="space-y-6">
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="BizBuddy Logo"
                width={200}
                height={60}
                className="w-48 sm:w-52 lg:w-56"
              />
            </div>
            <p className="text-sm sm:text-base leading-relaxed">
              BizBuddy makes time management seamless and hassle-free. With a
              simple and intuitive experience, it keeps you organized and in
              control every step of the way.
            </p>
            <p className="font-medium">Stay productive, stay efficient!</p>
            <div className="flex items-center gap-4">
              {[
                { icon: FaLinkedin, href: "#", label: "LinkedIn" },
                { icon: FaFacebook, href: "#", label: "Facebook" },
                { icon: FaTwitter, href: "#", label: "Twitter" },
                { icon: FaTiktok, href: "#", label: "TikTok" },
                { icon: FaInstagram, href: "#", label: "Instagram" },
                { icon: FaYoutube, href: "#", label: "YouTube" },
              ].map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="hover:text-orange-500 transform hover:scale-110 transition-all duration-200"
                >
                  <social.icon size={22} />
                </Link>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="font-semibold text-lg">Help</h3>
            <ul className="space-y-4">
              {[
                { title: "Privacy Policy", href: "/privacy-policy" },
                { title: "Terms of Service", href: "/terms" },
                { title: "FAQ", href: "/faq" },
              ].map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    className="hover:text-orange-500 transition-colors duration-200 flex items-center group"
                  >
                    <span className="transform translate-x-0 group-hover:translate-x-1 transition-transform duration-200">
                      {link.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-6 shadow-xl rounded-xl p-2 h-full dark:bg-neutral-900 bg-orange-50">
            <div className="p-6 rounded-xl">
              <h3 className="font-bold text-2xl mb-4 text-neutral-800 dark:text-neutral-200">
                Subscribe to Our Newsletter
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <input
                    type="text"
                    id="name"
                    className="w-full dark:bg-neutral-800 bg-white p-2 text-sm pl-3 rounded-xl border-none focus:outline-none focus:ring-0 focus:border-none"
                    required
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <input
                    type="email"
                    id="email"
                    className="w-full dark:bg-neutral-800 bg-white p-2 text-sm pl-3 rounded-xl border-none focus:outline-none focus:ring-0 focus:border-none"
                    required
                    placeholder="Your email"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white p-2.5 text-sm font-bold w-full"
                >
                  <span className="flex items-center justify-center">
                    <span className="mr-2">Subscribe</span>
                    <FiArrowRight className="w-5 h-5" />
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-orange-400 dark:border-orange-600">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center text-sm">
            Powered By:{" "}
            <span className="font-semibold ml-1">Bizsolutions LLC</span>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};
export default Footer;
