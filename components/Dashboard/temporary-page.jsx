"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Construction, ArrowLeft, Clock, Rocket, Home, RefreshCw } from "lucide-react";

export default function TemporaryPage() {
  const [dots, setDots] = useState(".");
  const [progress, setProgress] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // Animated dots for loading indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Fake progress animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 5;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full -mt-20  flex flex-col items-center justify-center ">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      <div className="w-full max-w-3xl">
        <div className="flex flex-col items-center text-center space-y-8 mb-8">
          <div className="relative">
            <Construction className="h-24 w-24 text-primary animate-bounce" />
            <div className="absolute -top-2 -right-2">
              <div className="h-6 w-6 bg-yellow-400 rounded-full animate-pulse" />
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Under Construction</h1>

          <p className="text-xl text-muted-foreground max-w-md">We're working hard to bring you something amazing. Please check back soon{dots}</p>
        </div>

        <Card className="p-6 shadow-lg border-2 border-primary/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 z-0"></div>

          <div className="relative z-10">
            <div className="flex items-center mb-4">
              <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Coming Soon</h2>
            </div>

            <div className="space-y-4">
              <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
              </div>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Development in progress</span>
                <span>{Math.round(progress)}%</span>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  className="group relative overflow-hidden"
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                  asChild
                ></Button>

                <Button variant="outline" className="group" onClick={() => window.location.reload()}>
                  <RefreshCw className="mr-2 h-4 w-4 group-hover:animate-spin" />
                  Refresh Page
                </Button>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-10 -right-10 h-40 w-40 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute -top-20 -left-20 h-40 w-40 bg-primary/10 rounded-full blur-3xl"></div>
        </Card>

        <div className="mt-12 flex flex-col items-center">
          <div className="flex items-center justify-center mb-4">
            <Rocket className="h-6 w-6 text-primary mr-2 animate-pulse" />
            <h2 className="text-xl font-semibold">Features Coming Soon</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
            {["Timekeeping", "Payroll", "Leaves"].map((feature, index) => (
              <div
                key={feature}
                className="bg-card border rounded-lg p-4 text-center hover:scale-105 transition-transform duration-300 hover:shadow-md"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
