"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CaseForm } from "@/components/cases/case-form";
import { LoadingState } from "@/components/shared/loading-state";

export default function EditCasePage() {
  const params = useParams();
  const caseId = params.id as string;
  const [defaultValues, setDefaultValues] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/cases/${caseId}`);
        const json = await res.json();
        if (json.success) {
          const c = json.data;
          setDefaultValues({
            caseNumber: c.caseNumber,
            applicationDate: new Date(c.applicationDate).toISOString().split("T")[0],
            expectedCompletionDate: c.expectedCompletionDate ? new Date(c.expectedCompletionDate).toISOString().split("T")[0] : "",
            approvalDate: c.approvalDate ? new Date(c.approvalDate).toISOString().split("T")[0] : "",
            completionDate: c.completionDate ? new Date(c.completionDate).toISOString().split("T")[0] : "",
            ownership: c.ownership || "",
            department: c.department,
            hospital: c.hospital || "QEH",
            applicantName: c.applicantName,
            contact: c.contact || "",
            rank: c.rank || "",
            category: c.category,
            purpose: c.purpose,
            specification: c.specification || "",
            projectTitle: c.projectTitle,
            description: c.description || "",
            modelType: c.modelType || "",
            requiredService: c.requiredService || "",
            serviceRequirements: c.serviceRequirements || "",
            requiresSterilization: c.requiresSterilization || "",
            quantity: c.quantity || 1,
            totalComponents: c.totalComponents || 1,
            priority: c.priority,
            currentStatus: c.currentStatus,
            technician: c.technician || "",
            printingParty: c.printingParty || "",
            modelImageUrl: c.modelImageUrl || "",
            photoFolderUrl: c.photoFolderUrl || "",
            remarks: c.remarks || "",
          });
        }
      } catch { /* keep null */ }
    }
    load();
  }, [caseId]);

  if (!defaultValues) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold text-slate-900">Edit Case</h2><p className="text-sm text-slate-500 mt-1">Edit case record</p></div>
      <CaseForm defaultValues={defaultValues} isEditing caseId={caseId} />
    </div>
  );
}
