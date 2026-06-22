"use client";

import { Undo2, Redo2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormLayoutToolbarProps {
  fieldCount: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  className?: string;
}

/** Always-visible sticky toolbar — Google Forms / E-Form style */
export function FormLayoutToolbar({
  fieldCount,
  canUndo, canRedo,
  onUndo, onRedo, onReset,
  className,
}: FormLayoutToolbarProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100",
        "flex items-center justify-between px-4 py-2 -mx-4",
        className
      )}
    >
      <span className="text-xs text-slate-400 font-medium">
        {fieldCount} field{fieldCount !== 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-0.5">
        {/* Undo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        {/* Redo */}
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </button>
        <span className="w-px h-4 bg-slate-200 mx-1" />
        {/* Reset */}
        <button
          type="button"
          onClick={onReset}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Reset to default"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
