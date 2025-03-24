"use client";

import { useState, useEffect } from "react";
import PriceCard from "@/components/Pricing/PlanCard";
import Footer from "@/components/Partial/Footer";

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${baseUrl}/api/subscription-plans`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to fetch plans");
        }

        const data = await res.json();
        if (!data.data) {
          throw new Error("Server response is missing `data` array.");
        }
        // data.data should be an array of plan objects
        setPlans(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl">Loading subscription plans...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  // Group plans by name so that multiple options for the same plan appear together.
  const groupedPlans = plans.reduce((acc, plan) => {
    if (!acc[plan.name]) {
      acc[plan.name] = {
        name: plan.name,
        options: [],
        features: plan.features,
      };
    }
    acc[plan.name].options.push(plan);
    return acc;
  }, {});

  const groupedPlansArray = Object.values(groupedPlans);

  return (
    <div className="flex flex-col justify-between items-center">
      <h1 className="mt-12 px-4 mb-10 text-center font-bold text-orange-500 lg:text-5xl md:text-4xl text-2xl">Our Subscription Plans</h1>

      <div className="grid gap-8 md:grid-cols-3 px-4 w-full">
        {groupedPlansArray.map((plan) => (
          <PriceCard key={plan.name} plan={plan} />
        ))}
      </div>

      <Footer />
    </div>
  );
}
