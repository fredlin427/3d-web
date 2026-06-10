"use client";

import { CaseForm } from "@/components/cases/case-form";
import { generateCaseNumber } from "@/lib/utils";

export default function NewCasePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">New Case</h2>
        <p className="text-sm text-slate-500 mt-1">Create a new 3D printing case record</p>
      </div>
      <CaseForm
        defaultValues={{
          caseNumber: generateCaseNumber(),
          applicationDate: new Date().toISOString().split("T")[0],
          priority: "Routine",
          currentStatus: "Draft",
        }}
      />
    </div>
  );
}
