"use client";

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  text?: string;
}

export function LoadingState({ text = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      <p className="mt-3 text-sm text-slate-500">{text}</p>
    </div>
  );
}
