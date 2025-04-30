/* --------------------------------------------------------------------------
 *  PrivacyPolicy.tsx
 *  Collapsible Privacy Policy page (Framer-motion + shadcn/ui Accordion)
 * ------------------------------------------------------------------------*/

"use client";

import React from "react";
import { motion } from "framer-motion";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

/* --------------------------------------------------------------------------
 *  Accordion sections
 * ------------------------------------------------------------------------*/
const policyItems = [
  {
    value: "intro",
    title: "Privacy Policy Overview",
    content: `
This Privacy Policy explains how [Your Company Name] (“we”, “our”, or “us”) collects, uses, stores, and protects your data when you use our cloud-based timekeeping and payroll website and mobile application (collectively, the “Services”).`,
  },
  {
    value: "information",
    title: "1. Information We Collect",
    content: `
a. User Information  
   • Name, email address, phone number  
   • Login credentials and authentication data  
   • Company name and employee role  

b. Timekeeping and Payroll Data  
   • Clock-in and clock-out times  
   • Work hours, schedules, time-off requests  
   • Payroll details (wage rates, tax deductions, pay stubs)  

c. Device and Usage Information  
   • IP address and geolocation (if enabled)  
   • Browser type, device type, OS version  
   • Usage logs and in-app interaction data  

d. Optional Biometric Data (if enabled)  
   • Fingerprint or facial recognition for clock-ins (used only for authentication and not stored on our servers without explicit consent)`,
  },
  {
    value: "usage",
    title: "2. How We Use Your Information",
    content: `
• Provide timekeeping and payroll processing services  
• Ensure secure access and account verification  
• Generate payroll reports and timecard summaries  
• Improve platform functionality and user experience  
• Comply with labor, tax, and regulatory requirements`,
  },
  {
    value: "sharing",
    title: "3. Data Sharing and Disclosure",
    content: `
We do not sell your personal information. We may share it with:  
• Your employer (if you are an employee user)  
• Payroll processors, banks, or payment platforms  
• Regulatory or legal authorities when required by law  
• Third-party service providers under strict confidentiality agreements`,
  },
  {
    value: "security",
    title: "4. Data Storage and Security",
    content: `
Data is encrypted and stored on secure cloud infrastructure:  
• SSL/TLS encryption during transmission  
• AES-256 encryption at rest  
• Role-based access control  
• Regular audits and vulnerability scans  

We retain data while your account is active or as required by law.`,
  },
  {
    value: "rights",
    title: "5. Your Rights and Choices",
    content: `
You may:  
• Access or correct your personal data  
• Request data deletion (where legally permitted)  
• Withdraw consent for optional data (e.g., biometrics)  
• Object to certain processing activities  

Submit requests via email: [Insert Email Address].`,
  },
  {
    value: "cookies",
    title: "6. Cookies and Tracking Technologies",
    content: `
We use cookies and similar technologies to:  
• Maintain session data  
• Analyze app usage trends  
• Improve performance and personalization  

Manage cookies through your browser settings.`,
  },
  {
    value: "children",
    title: "7. Children's Privacy",
    content: `
Our Services are not intended for individuals under 16. We do not knowingly collect data from children without parental consent.`,
  },
  {
    value: "changes",
    title: "8. Changes to This Privacy Policy",
    content: `
We may update this policy periodically. Changes will appear here with a new effective date. Review this page regularly.`,
  },
  {
    value: "contact",
    title: "9. Contact Us",
    content: `
[Your Company Name]  
[Your Business Address]  
Email: [Insert Email Address]  
Phone: [Insert Phone Number]`,
  },
];

/* --------------------------- Framer-motion variants -----------------------*/
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

/* ------------------------------ Component ---------------------------------*/
export default function PrivacyPolicy() {
  return (
    <motion.section className="py-10 md:py-10 px-4 mx-auto w-full max-w-7xl" initial="hidden" animate="visible" variants={containerVariants}>
      <motion.h2 className="text-orange-500 font-bold text-center pb-2 text-xl sm:text-2xl md:text-4xl lg:text-5xl" variants={itemVariants}>
        Privacy&nbsp;Policy
      </motion.h2>

      <motion.div className="flex flex-col items-center mt-10 max-w-3xl mx-auto" variants={containerVariants}>
        <Accordion type="single" collapsible className="w-full">
          {policyItems.map((item, i) => (
            <motion.div key={`policy-${item.value}-${i}`} variants={itemVariants}>
              <AccordionItem value={item.value} className="border-b last:border-b-0">
                <AccordionTrigger className="py-4 px-2 text-left">{item.title}</AccordionTrigger>
                <AccordionContent className="px-2 pb-4 whitespace-pre-line">{item.content}</AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </motion.div>
    </motion.section>
  );
}
