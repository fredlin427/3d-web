"use client";

import { cn } from "@/lib/utils";
import { Check, Circle, Loader2 } from "lucide-react";

interface Step {
  stepName: string;
  stepOrder: number;
  status: string; // "Not started" | "In progress" | "Completed" | "Skipped"
  completedDate?: string | null;
}

/** Horizontal progress stepper — shows all steps as connected dots */
export function ProgressStepper({ steps }: { steps: Step[] }) {
  const DEFAULT_STEPS = [
    "Application Received", "Approval", "Segmentation / Design",
    "Verify Segmentation / Design", "Printing", "Post-processing",
    "Final Product", "Completion",
  ];

  // Merge default step names with actual progress data
  const merged = DEFAULT_STEPS.map((name, i) => {
    const found = steps?.find((s) => s.stepName === name);
    return found || { stepName: name, stepOrder: i, status: "Not started" };
  });

  const completedCount = merged.filter((s) => s.status === "Completed").length;
  const totalCount = merged.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Percentage badge */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm font-bold text-slate-700 tabular-nums whitespace-nowrap">
          {completedCount}/{totalCount} <span className="text-xs text-slate-400 font-normal">steps</span>
        </span>
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-between">
        {merged.map((step, i) => {
          const isCompleted = step.status === "Completed";
          const isActive = step.status === "In progress";
          const isSkipped = step.status === "Skipped";
          const isLast = i === merged.length - 1;

          return (
            <div key={step.stepName} className="flex items-center flex-1 last:flex-none">
              {/* Dot + label */}
              <div className="flex flex-col items-center gap-1 relative">
                {/* Connector line (not for last) */}
                {!isLast && (
                  <div
                    className={cn(
                      "absolute top-3 left-full h-0.5 -z-10 transition-colors duration-300",
                      isCompleted ? "bg-emerald-400" : "bg-slate-200"
                    )}
                    style={{ width: `calc(100% + 0px)` }}
                  />
                )}

                <div
                  className={cn(
                    "relative flex items-center justify-center w-6 h-6 rounded-full shrink-0 transition-all duration-300",
                    isCompleted && "bg-emerald-500 text-white",
                    isActive && "bg-blue-500 text-white ring-4 ring-blue-100",
                    isSkipped && "bg-slate-300 text-white",
                    !isCompleted && !isActive && !isSkipped && "bg-white ring-2 ring-slate-200"
                  )}
                >
                  {isCompleted && <Check className="h-3.5 w-3.5" />}
                  {isActive && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {!isCompleted && !isActive && !isSkipped && (
                    <Circle className="h-2.5 w-2.5 fill-slate-300 text-slate-300" />
                  )}
                  {isSkipped && <span className="text-[10px] font-bold">!</span>}
                </div>

                {/* Step label */}
                <span
                  className={cn(
                    "text-[10px] font-medium text-center max-w-[72px] leading-tight mt-1 hidden sm:block",
                    isCompleted && "text-emerald-600",
                    isActive && "text-blue-600 font-semibold",
                    isSkipped && "text-slate-400 line-through",
                    !isCompleted && !isActive && !isSkipped && "text-slate-400"
                  )}
                >
                  {step.stepName}
                </span>
              </div>

              {/* Spacer between dots (except last pair) */}
              {!isLast && <div className="flex-1 min-w-[8px]" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
