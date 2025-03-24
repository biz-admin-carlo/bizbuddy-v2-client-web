"use client";

import { useState } from "react";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

export default function AccountSettings() {
  const { token, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/account/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to delete account.");
        toast.error(data.message || "Failed to delete account.");
        setLoading(false);
        return;
      }
      toast.success("Account deleted successfully.");
      // After deletion, log the user out.
      logout();
    } catch (err) {
      setError(err.message || "Failed to delete account.");
      toast.error(err.message || "Failed to delete account.");
    } finally {
      setLoading(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 min-h-screen ">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
        <Card className="border border-neutral-200 dark:border-neutral-700 shadow-lg bg-white dark:bg-neutral-800 rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-b border-neutral-200 dark:border-neutral-700 p-6">
            <CardTitle className="flex items-center text-xl text-orange-700 dark:text-orange-400 font-bold">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Account Deletion
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex items-start space-x-4 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-100 dark:border-red-900/50"
            >
              <AlertCircle className="h-6 w-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-red-700 dark:text-red-400">Warning: This action cannot be undone</h3>
                <p className="text-neutral-700 dark:text-neutral-300 text-sm">Deleting your account will permanently remove:</p>
                <ul className="list-disc pl-5 text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>Your company profile and all associated data</li>
                  <li>All user accounts connected to your company</li>
                  <li>All active subscriptions and payment information</li>
                  <li>All historical data, settings, and preferences</li>
                </ul>
              </div>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg overflow-hidden"
                >
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
          <CardFooter className="p-6 pt-0">
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="w-full">
              <Button
                onClick={() => setIsConfirmOpen(true)}
                variant="destructive"
                className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold py-2.5 flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            </motion.div>
          </CardFooter>
        </Card>
      </motion.div>

      <AnimatePresence>
        {isConfirmOpen && (
          <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="p-6"
              >
                <DialogHeader>
                  <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Confirm Account Deletion
                  </DialogTitle>
                  <DialogDescription>This action is permanent and cannot be reversed. All your data will be permanently deleted.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                    className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-100 dark:border-amber-900/50"
                  >
                    <p className="text-sm text-amber-800 dark:text-amber-400">
                      To confirm, please type <strong>delete my account</strong> in the field below.
                    </p>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.2 }}>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="delete my account"
                      className="border-red-200 dark:border-red-800 focus:ring-red-500"
                    />
                  </motion.div>
                </div>

                <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button type="button" variant="outline" onClick={() => setIsConfirmOpen(false)} className="mt-2 sm:mt-0">
                      Cancel
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={confirmText === "delete my account" && !loading ? { scale: 1.02 } : {}}
                    whileTap={confirmText === "delete my account" && !loading ? { scale: 0.98 } : {}}
                  >
                    <Button
                      type="button"
                      disabled={confirmText !== "delete my account" || loading}
                      onClick={handleDeleteAccount}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {loading ? "Deleting..." : "Permanently Delete Account"}
                    </Button>
                  </motion.div>
                </DialogFooter>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
