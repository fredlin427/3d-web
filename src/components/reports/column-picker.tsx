"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColumnPickerProps {
  columns: string[];
  selected: string[];
  onChange: (cols: string[]) => void;
}

export function ColumnPicker({ columns, selected, onChange }: ColumnPickerProps) {
  const [open, setOpen] = useState(false);

  const toggle = (col: string) => {
    if (selected.includes(col)) {
      onChange(selected.filter((c) => c !== col));
    } else {
      onChange([...selected, col]);
    }
  };

  const selectAll = () => onChange([...columns]);
  const deselectAll = () => onChange([]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
        <Columns3 className="h-4 w-4 text-slate-500" />
        Columns ({selected.length}/{columns.length})
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-500">Select columns</span>
          <div className="flex gap-1">
            <button onClick={selectAll} className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium px-1">All</button>
            <button onClick={deselectAll} className="text-[10px] text-slate-400 hover:text-slate-600 font-medium px-1">None</button>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-2 space-y-0.5">
          {columns.map((col) => (
            <label
              key={col}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm",
                selected.includes(col) ? "bg-indigo-50 text-slate-800" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Checkbox
                checked={selected.includes(col)}
                onCheckedChange={() => toggle(col)}
                className="h-3.5 w-3.5"
              />
              {col}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
