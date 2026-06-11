"use client";

import { useState, useEffect } from "react";
import { CaseForm } from "@/components/cases/case-form";
import { LoadingState } from "@/components/shared/loading-state";

export default function NewCasePage() {
  const [defaults, setDefaults] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    async function fetchNext() {
      let caseNumber = "";
      try {
        const res = await fetch("/api/cases/next-number");
        const json = await res.json();
        if (json.success) caseNumber = json.data.caseNumber;
      } catch { /* fallback - empty string, will be generated on server */ }

      setDefaults({
        caseNumber,
        applicationDate: new Date().toISOString().split("T")[0],
        hospital: "QEH",
        priority: "Routine",
        currentStatus: "Draft",
        quantity: 1,
        totalComponents: 1,
      });
    }
    fetchNext();
  }, []);

  if (!defaults) return <LoadingState text="Loading..." />;

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold text-slate-900">New Case</h2><p className="text-sm text-slate-500 mt-1">Create a new 3D printing case record</p></div>
      <CaseForm defaultValues={defaults} />
    </div>
  );
}
