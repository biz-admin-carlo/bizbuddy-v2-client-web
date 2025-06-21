// components/ui/input.jsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-neutral-700",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
