// ============================================================================
// PAYSLIP PAGE - Under Construction
// File: app/dashboard/employee/payslip/page.jsx
// ============================================================================

"use client";

import { motion } from "framer-motion";
import { Construction, FileText, Calendar, DollarSign, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PayslipPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-orange-500/10">
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">
                My Payslip
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                View and download your payslip history
              </p>
            </div>
          </div>
        </motion.div>

        {/* Under Construction Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2 border-orange-200 dark:border-orange-800 shadow-xl overflow-hidden">
            <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500" />
            
            <CardContent className="p-12">
              <div className="text-center space-y-6">
                {/* Icon Animation */}
                <motion.div
                  animate={{ 
                    rotate: [0, -5, 5, -5, 0],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                  className="inline-block"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full" />
                    <Construction className="h-24 w-24 text-orange-600 relative" />
                  </div>
                </motion.div>

                {/* Status Badge */}
                <div className="flex justify-center">
                  <Badge className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-sm">
                    🚧 Under Construction
                  </Badge>
                </div>

                {/* Main Message */}
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
                    Payslip Feature Coming Soon!
                  </h2>
                  <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
                    We're working hard to bring you a comprehensive payslip management system. 
                    Soon you'll be able to view, download, and manage all your payslips in one place.
                  </p>
                </div>

                {/* Features Coming */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                  >
                    <Calendar className="h-6 w-6 text-orange-600 mb-2 mx-auto" />
                    <h3 className="font-semibold text-sm text-neutral-800 dark:text-neutral-200 mb-1">
                      Monthly Payslips
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      Access all your monthly payslips
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                  >
                    <DollarSign className="h-6 w-6 text-orange-600 mb-2 mx-auto" />
                    <h3 className="font-semibold text-sm text-neutral-800 dark:text-neutral-200 mb-1">
                      Detailed Breakdown
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      See salary, deductions, and taxes
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                  >
                    <FileText className="h-6 w-6 text-orange-600 mb-2 mx-auto" />
                    <h3 className="font-semibold text-sm text-neutral-800 dark:text-neutral-200 mb-1">
                      PDF Download
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      Download payslips as PDF
                    </p>
                  </motion.div>
                </div>

                {/* Footer Note */}
                <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4" />
                    Expected launch: Coming soon
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                    Need your payslip now?
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Please contact your HR department or supervisor to request your payslip. 
                    Once this feature is ready, you'll be able to access all your payslips instantly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}