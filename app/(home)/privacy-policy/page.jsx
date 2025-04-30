// File: biz-web-app/app/(home)/privacy-policy/page.jsx

"use client";
import FAQ from "@/components/Home/Accordion";
import PrivacyPolicy from "@/components/Home/PrivacyPolicy";
import Footer from "@/components/Partial/Footer";
import React from "react";

function page() {
  return (
    <div className="flex flex-col justify-between items-center">
      <PrivacyPolicy />
      <Footer />
    </div>
  );
}

export default page;
