"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronLeft, ChevronRight, Sparkles, Star } from "lucide-react";

const featureLabels = {
  timekeeping: "Timekeeping",
  leaves: "Leaves",
  payroll: "Payroll",
  "timekeeping-punch-offline": "Timekeeping Offline",
  "timekeeping-punch-location": "Timekeeping Location",
};

export default function UpgradePricing({ currentPlan, plans, onPlanSelect }) {
  // === FIX: Parse `features` if it's a JSON string ===
  // This ensures that "Pro plan (2-9 users)" or any other plan
  // that has `features` stored as a string will be an actual object
  // so we can correctly show check icons where features are true.
  plans.forEach((plan) => {
    if (typeof plan.features === "string") {
      try {
        plan.features = JSON.parse(plan.features);
      } catch {
        // if parsing fails, fall back to empty object
        plan.features = {};
      }
    }

    if (Array.isArray(plan.options)) {
      plan.options.forEach((option) => {
        if (typeof option.features === "string") {
          try {
            option.features = JSON.parse(option.features);
          } catch {
            option.features = {};
          }
        }
      });
    }
  });
  // === END FIX ===

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const [selectedOptionIndices, setSelectedOptionIndices] = useState({});

  const handlePrevOption = (planName) => {
    setSelectedOptionIndices((prev) => ({
      ...prev,
      [planName]: Math.max(0, (prev[planName] || 0) - 1),
    }));
  };

  const handleNextOption = (planName, maxIndex) => {
    setSelectedOptionIndices((prev) => ({
      ...prev,
      [planName]: Math.min(maxIndex, (prev[planName] || 0) + 1),
    }));
  };

  const hasOptions = plans.length > 0 && plans[0].options;

  const isCurrentOption = (option, planName) => {
    if (!currentPlan) return false;
    return currentPlan.name === planName && currentPlan.rangeOfUsers === option.rangeOfUsers && currentPlan.price === option.price;
  };

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2 text-orange-700 dark:text-orange-400">Choose Your Plan</h3>
        <p className="text-neutral-600 dark:text-neutral-400">Select the plan that best fits your business needs</p>
      </div>

      {currentPlan && (
        <motion.div variants={item} className="mb-8">
          <Card className="border-2 border-orange-500 bg-gradient-to-r from-orange-500/5 to-orange-600/5 shadow-md overflow-hidden rounded-xl">
            <CardHeader className="pb-4 border-b border-orange-200 dark:border-orange-800/30">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold flex items-center text-orange-700 dark:text-orange-400">
                  <Star className="h-5 w-5 mr-2 text-orange-500" />
                  Your Current Plan
                </h3>
                <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 rounded-full">Active</Badge>
              </div>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold">${currentPlan.price}</span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400 ml-2">/ month</span>
              </div>
              <p className="text-sm mt-1 text-neutral-600 dark:text-neutral-400">{currentPlan.rangeOfUsers} users</p>
            </CardHeader>
            <CardContent className="pb-6 pt-4">
              <p className="text-sm mb-4 text-neutral-700 dark:text-neutral-300">{currentPlan.description}</p>
              <div className="space-y-2">
                <p className="text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Features:</p>
                {Object.entries(featureLabels).map(([featureKey, label]) => (
                  <div
                    key={featureKey}
                    className="flex items-center p-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700"
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center mr-3 ${
                        currentPlan.features && currentPlan.features[featureKey]
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {currentPlan.features && currentPlan.features[featureKey] ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </div>
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          if (!plan) return null;
          const optionIndex = selectedOptionIndices[plan.name] || 0;
          const selectedOption =
            hasOptions && plan.options && plan.options.length > 0 ? plan.options[optionIndex] : { ...plan, features: plan.features || {} };

          const isCurrentlySelected = isCurrentOption(selectedOption, plan.name);

          return (
            <motion.div key={plan.name} variants={item}>
              <Card className="h-full transition-all duration-300 hover:shadow-lg border border-neutral-200 dark:border-neutral-700 shadow-md bg-white dark:bg-neutral-800 rounded-xl overflow-hidden">
                <CardHeader
                  className={`pb-4 border-b border-neutral-200 dark:border-neutral-700 ${
                    plan.name === "Pro" ? "bg-gradient-to-r from-orange-500/10 to-orange-600/10" : ""
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold text-orange-700 dark:text-orange-400">{plan.name}</h3>
                    {plan.name === "Pro" && (
                      <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 rounded-full">
                        <Sparkles className="h-3 w-3 mr-1" /> Popular
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold">${selectedOption.price}</span>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400 ml-2">/ month</span>
                  </div>
                  {hasOptions && plan.options && plan.options.length > 1 && (
                    <div className="flex items-center justify-between mt-3 p-1 bg-neutral-100 dark:bg-neutral-700 rounded-lg">
                      <button
                        onClick={() => handlePrevOption(plan.name)}
                        disabled={optionIndex === 0}
                        className="p-1.5 rounded-md bg-gradient-to-r from-orange-500 to-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 hover:from-orange-600 hover:to-orange-700"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium">{selectedOption.rangeOfUsers} users</span>
                      <button
                        onClick={() => handleNextOption(plan.name, plan.options.length - 1)}
                        disabled={optionIndex === plan.options.length - 1}
                        className="p-1.5 rounded-md bg-gradient-to-r from-orange-500 to-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 hover:from-orange-600 hover:to-orange-700"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {!hasOptions && <p className="text-sm mt-1 text-neutral-600 dark:text-neutral-400">{selectedOption.rangeOfUsers} users</p>}
                </CardHeader>
                <CardContent className="pb-6 pt-4">
                  <p className="text-sm mb-4 text-neutral-700 dark:text-neutral-300">{selectedOption.description || plan.description}</p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Features:</p>
                    {Object.entries(featureLabels).map(([featureKey, label]) => (
                      <div
                        key={featureKey}
                        className="flex items-center p-2 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-100 dark:border-neutral-700"
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center mr-3 ${
                            selectedOption.features && selectedOption.features[featureKey]
                              ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                              : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {selectedOption.features && selectedOption.features[featureKey] ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        </div>
                        <span className="text-sm">{label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-2 pb-4">
                  <Button
                    onClick={() => onPlanSelect(selectedOption)}
                    className={`w-full rounded-xl font-semibold h-auto py-2.5 ${
                      plan.name === "Pro" || plan.name === "Free" || plan.name === "Basic"
                        ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
                        : "border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                    }`}
                    disabled={isCurrentOption(selectedOption, plan.name)}
                  >
                    {isCurrentOption(selectedOption, plan.name)
                      ? "Current Plan"
                      : currentPlan && currentPlan.name === plan.name
                      ? "Change User Range"
                      : `Upgrade to ${plan.name}`}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
