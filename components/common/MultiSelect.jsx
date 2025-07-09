// components/common/MultiSelect.jsx
"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";

export default function MultiSelect({ options, selected, onChange, allLabel = "All", width = 200, icon: Icon }) {
  const allChecked = selected.includes("all") || selected.length === options.length;
  const triggerId = useId();

  const Row = ({ label, checked, onClick }) => (
    <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={onClick}>
      <Checkbox checked={checked} className="h-4 w-4" />
      <span className="truncate">{label}</span>
    </div>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button id={triggerId} variant="outline" className={`min-w-[${width}px] justify-between`}>
          <span className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            {allChecked ? allLabel : `${selected.length} selected`}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 space-y-1" align="start">
        <Row label={allLabel} checked={allChecked} onClick={() => onChange("all")} />
        <div className="max-h-64 overflow-y-auto pr-1">
          {options.map((o) => (
            <Row
              key={o.value}
              label={o.label}
              checked={allChecked || selected.includes(o.value)}
              onClick={() => onChange(o.value)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
