"use client";

import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import { motion } from "framer-motion";
import { CreditCard, CheckCircle, ShieldCheck, AlertCircle } from "lucide-react";

// Load your Stripe publishable key from env
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function PaymentForm({ plan, onPaymentSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const { token } = useAuthStore();
  const [error, setError] = React.useState(null);
  const [processing, setProcessing] = React.useState(false);
  const [paymentSuccess, setPaymentSuccess] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    // Bypass Stripe if the plan is free (price is 0 or less)
    if (plan.price <= 0) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/upgrade`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planId: plan.id }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || data.message || "Failed to upgrade subscription.");
          setProcessing(false);
          return;
        }
        toast.success("Subscription upgraded successfully!");
        setPaymentSuccess(true);
        setTimeout(() => {
          onPaymentSuccess();
        }, 1500);
      } catch (err) {
        setError(err.message || "Payment failed");
        setProcessing(false);
      }
      return;
    }

    // Continue with Stripe payment flow for paid plans
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/create-upgrade-payment-intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        planId: plan.id,
        amount: plan.price,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      setError(data.error || data.message || "Error creating payment intent.");
      setProcessing(false);
      return;
    }
    const clientSecret = data.data.clientSecret;
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
      },
    });
    if (result.error) {
      setError(result.error.message);
      setProcessing(false);
    } else if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
      setPaymentSuccess(true);
      toast.success("Payment successful!");
      setTimeout(() => {
        onPaymentSuccess();
      }, 1500);
    }
  };

  if (paymentSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8 bg-white dark:bg-neutral-800 rounded-xl border border-green-200 dark:border-green-800 shadow-md p-6"
      >
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-10 w-10 text-green-500 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-green-700 dark:text-green-400">Payment Successful!</h3>
        <p className="text-neutral-600 dark:text-neutral-300 mb-4">Your subscription has been upgraded successfully.</p>
        <div className="w-full max-w-xs mx-auto h-1.5 bg-green-100 dark:bg-green-900/50 rounded-full overflow-hidden">
          <motion.div className="h-full bg-green-500" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1.5 }} />
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Card Information</label>
        <div className="relative">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#424770",
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  "::placeholder": {
                    color: "#aab7c4",
                  },
                  ":-webkit-autofill": {
                    color: "#424770",
                  },
                },
                invalid: {
                  color: "#e53e3e",
                  iconColor: "#e53e3e",
                },
              },
            }}
            className="p-4 border border-neutral-300 dark:border-neutral-600 rounded-xl focus:ring-2 focus:ring-orange-500/50 bg-white dark:bg-neutral-800 transition-all duration-200"
          />
          <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 dark:text-neutral-500 h-5 w-5" />
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center mt-1">
          <ShieldCheck className="h-3 w-3 mr-1 text-green-500" />
          Your payment information is secure
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="pt-4">
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all h-12 rounded-xl font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {processing ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              Confirm Payment (${plan.price})
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function UpgradePayment({ plan, onPaymentSuccess }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="border border-neutral-200 dark:border-neutral-700 shadow-lg overflow-hidden bg-white dark:bg-neutral-800 rounded-xl">
        <CardHeader className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-b border-neutral-200 dark:border-neutral-700">
          <CardTitle className="text-xl text-orange-700 dark:text-orange-400">Upgrade to {plan.name || "Selected"} Plan</CardTitle>
          <CardDescription>Complete your payment to upgrade your subscription</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-neutral-200 dark:border-neutral-700">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Plan Details</span>
              <span className="font-medium text-orange-600 dark:text-orange-400">{plan.name || "Selected Plan"}</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Monthly Price</span>
              <span className="font-medium">${plan.price}/month</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">User Capacity</span>
              <span className="font-medium">{plan.rangeOfUsers}</span>
            </div>
          </div>

          <Elements stripe={stripePromise}>
            <PaymentForm plan={plan} onPaymentSuccess={onPaymentSuccess} />
          </Elements>
        </CardContent>
      </Card>
    </motion.div>
  );
}
