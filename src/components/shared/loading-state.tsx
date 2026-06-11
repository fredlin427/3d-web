"use client";

interface LoadingStateProps {
  text?: string;
}

export function LoadingState({ text = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative">
        <div className="h-10 w-10 rounded-full border-2 border-slate-200" />
        <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
      </div>
      <p className="mt-4 text-sm text-slate-400">{text}</p>
    </div>
  );
}
