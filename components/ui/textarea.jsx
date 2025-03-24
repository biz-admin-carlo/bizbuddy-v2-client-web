// biz-web-app/components/ui/textarea.jsx

import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      className={cn(
        // Base styles
        "w-full min-h-[60px] px-3 py-2 text-base bg-transparent placeholder:text-muted-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        // Your requested classes
        "rounded-xl border-none focus:outline-none focus:ring-0 focus:border-none",
        // Merge any additional classes passed in
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };
