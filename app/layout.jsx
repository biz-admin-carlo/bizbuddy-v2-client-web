// File: biz-web-app/app/layout.jsx

import "./globals.css";
import { ThemeProvider } from "@/components/Theme/ThemeProvider";
import NavBar from "@/components/Partial/Navbar";
import BizChat from "@/components/Home/BizChat";

export const metadata = {
  title: "BizBuddy",
  description: "BizBuddy web application for time-keeping, payroll and leaves.",
};

const version = "2.0.0";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="bg-orange-50/30 dark:bg-black text-neutral-700 dark:text-neutral-400">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <NavBar />
          <main className="pt-16">{children}</main>
          {/* <BizChat /> */}
        </ThemeProvider>
      </body>
    </html>
  );
}
