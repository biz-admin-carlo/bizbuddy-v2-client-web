"use client";

import { useEffect, useState, useRef } from "react";
import useAuthStore from "@/store/useAuthStore";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Building, Calendar, CreditCard, ChevronRight, ShieldCheck, AlertCircle, ArrowUp, ChevronLeft } from "lucide-react";
import UpgradePricing from "./UpgradeSubscription/upgrade-subscription-pricing";
import UpgradePayment from "./UpgradeSubscription/upgrade-subscription-payment";

export default function AccountSubscription() {
  const { token } = useAuthStore();
  const [company, setCompany] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [groupedPlans, setGroupedPlans] = useState({});

  // Ref for the upgrade section to scroll to
  const upgradeContentRef = useRef(null);
  const pricingRef = useRef(null);

  // Fetch user profile (includes company and subscription)
  useEffect(() => {
    if (!token) return;
    async function fetchProfile() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/account/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data && data.data) {
          const { user, company, subscription } = data.data;
          // Only allow company owner to manage subscriptions.
          if (company.userId !== user.id) {
            setError("Access denied. Only the company owner can manage subscriptions.");
            toast.error("Access denied. Only the company owner can manage subscriptions.");
            setLoading(false);
            return;
          }
          setCompany(company);
          setSubscription(subscription);
        } else {
          setError("Failed to retrieve profile data.");
          toast.error("Failed to retrieve profile data.");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to fetch profile.");
        toast.error("Failed to fetch profile.");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [token]);

  // Fetch available subscription plans
  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscription-plans`, {
          method: "GET",
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && data.data) {
          setPlans(data.data);

          // Group plans by name (Free, Basic, Pro)
          const grouped = {};
          data.data.forEach((plan) => {
            if (!grouped[plan.name]) {
              grouped[plan.name] = {
                ...plan,
                options: [],
              };
            }

            grouped[plan.name].options.push({
              id: plan.id,
              price: plan.price,
              rangeOfUsers: plan.rangeOfUsers,
              description: plan.description,
            });
          });

          // Convert to array of plan objects with options
          setGroupedPlans(Object.values(grouped));
        } else {
          toast.error(data.message || "Failed to fetch subscription plans.");
        }
      } catch (err) {
        console.error("Error fetching subscription plans:", err);
        toast.error("Failed to fetch subscription plans.");
      }
    }
    fetchPlans();
  }, []);

  // Effect to scroll to the upgrade content when it appears
  useEffect(() => {
    if (showUpgrade && pricingRef.current) {
      // Small delay to ensure content is rendered
      const timer = setTimeout(() => {
        pricingRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [showUpgrade]);

  const handleUpgradeClick = () => {
    setShowUpgrade(true);
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);

    // Scroll to payment form after selecting a plan
    setTimeout(() => {
      if (upgradeContentRef.current) {
        upgradeContentRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 300);
  };

  const handleBackToPlans = () => {
    setSelectedPlan(null);

    // Scroll back to pricing options
    setTimeout(() => {
      if (pricingRef.current) {
        pricingRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 300);
  };

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // After a successful payment, call the upgrade subscription endpoint
  // then refetch the profile to update the subscription info.
  const handlePaymentSuccess = async () => {
    if (selectedPlan) {
      // Call the upgrade endpoint (the endpoint extracts the token itself).
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/upgrade`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          // We pass the token in the Authorization header.
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: selectedPlan.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to upgrade subscription.");
        return;
      }
    }
    toast.success("Subscription upgraded successfully!");
    setShowUpgrade(false);
    setSelectedPlan(null);
    // Refetch profile to update subscription info
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/account/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data && data.data) {
        setSubscription(data.data.subscription);
      }
    } catch (error) {
      console.error("Error refetching profile after upgrade:", error);
    }

    // Scroll back to top after successful upgrade
    scrollToTop();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8 bg-gradient-to-b from-orange-50/50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <h1 className="text-3xl font-bold text-orange-600 dark:text-orange-500">Manage My Subscription</h1>
        <Card className="border border-neutral-200 dark:border-neutral-700 shadow-md bg-white dark:bg-neutral-800 rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-b border-neutral-200 dark:border-neutral-700">
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-2/3" />
          </CardContent>
        </Card>
        <Card className="border border-neutral-200 dark:border-neutral-700 shadow-md bg-white dark:bg-neutral-800 rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-b border-neutral-200 dark:border-neutral-700">
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6 bg-gradient-to-b from-orange-50/50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <Card className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 shadow-md rounded-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center text-red-700 dark:text-red-400">
              <AlertCircle className="mr-2 h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 min-h-screen">
      <Toaster position="top-center" richColors />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <Card className="overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-md bg-white dark:bg-neutral-800 rounded-xl">
          <CardHeader className="pb-3 bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-b border-neutral-200 dark:border-neutral-700">
            <CardTitle className="flex items-center text-xl text-orange-700 dark:text-orange-400">
              <Building className="mr-2 h-5 w-5 text-orange-500" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Company ID</p>
                <p className="font-medium text-neutral-800 dark:text-neutral-200">{company.id}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Company Name</p>
                <p className="font-medium text-neutral-800 dark:text-neutral-200">{company.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <Card className="overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-md bg-white dark:bg-neutral-800 rounded-xl">
          <CardHeader className="pb-3 bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-b border-neutral-200 dark:border-neutral-700">
            <CardTitle className="flex items-center text-xl text-orange-700 dark:text-orange-400">
              <CreditCard className="mr-2 h-5 w-5 text-orange-500" />
              Subscription Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {subscription ? (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center mb-4 md:mb-0">
                  <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white mr-2 px-3 py-1 rounded-full font-medium">
                    {subscription.plan.name} Plan
                  </Badge>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">{subscription.plan.rangeOfUsers} users</span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center p-2 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-200 dark:border-neutral-700">
                    <Calendar className="mr-2 h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Start Date</p>
                      <p className="text-sm font-medium">{new Date(subscription.startDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {subscription.endDate && (
                    <div className="flex items-center p-2 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-200 dark:border-neutral-700">
                      <Calendar className="mr-2 h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">End Date</p>
                        <p className="text-sm font-medium">{new Date(subscription.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-neutral-50 dark:bg-neutral-700/30 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
                </div>
                <p className="text-neutral-600 dark:text-neutral-400">No active subscription found for your company.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} id="upgrade-section">
        <Card className="overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-md bg-white dark:bg-neutral-800 rounded-xl">
          <CardHeader className="pb-3 bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-b border-neutral-200 dark:border-neutral-700">
            <CardTitle className="text-xl text-orange-700 dark:text-orange-400">Upgrade Subscription</CardTitle>
            <CardDescription>Upgrade your plan to access more features and increase user limits</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <AnimatePresence mode="wait">
              {!showUpgrade ? (
                <motion.div key="upgrade-button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Button
                    onClick={handleUpgradeClick}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all rounded-xl font-semibold px-5 py-2.5 h-auto"
                  >
                    Upgrade Subscription
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="upgrade-content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4"
                  ref={pricingRef}
                >
                  {!selectedPlan ? (
                    <UpgradePricing
                      currentPlan={subscription?.plan}
                      plans={groupedPlans.length > 0 ? groupedPlans : plans}
                      onPlanSelect={handlePlanSelect}
                    />
                  ) : (
                    <div className="space-y-4" ref={upgradeContentRef}>
                      <div className="flex items-center">
                        <Button
                          variant="outline"
                          onClick={handleBackToPlans}
                          className="mb-4 flex items-center gap-1 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Back to plans
                        </Button>
                      </div>
                      <UpgradePayment plan={selectedPlan} onPaymentSuccess={handlePaymentSuccess} />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Back to top button (fixed position) */}
      {showUpgrade && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-6 right-6">
          <Button
            onClick={scrollToTop}
            size="icon"
            className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl w-12 h-12"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
