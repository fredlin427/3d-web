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
            department: c.department,
            applicantName: c.applicantName,
            contact: c.contact || "",
            useType: c.useType,
            projectTitle: c.projectTitle,
            description: c.description || "",
            clinicalPurpose: c.clinicalPurpose || "",
            priority: c.priority,
            requiredDate: c.requiredDate ? new Date(c.requiredDate).toISOString().split("T")[0] : "",
            currentStatus: c.currentStatus,
            modelImageUrl: c.modelImageUrl || "",
            photoFolderUrl: c.photoFolderUrl || "",
            remarks: c.remarks || "",
          });
        }
      } catch {
        // keep defaultValues as null to show error state fallback
      }
    }
    load();
  }, [caseId]);

  if (!defaultValues) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Edit Case</h2>
        <p className="text-sm text-slate-500 mt-1">Edit case record</p>
      </div>
      <CaseForm defaultValues={defaultValues} isEditing caseId={caseId} />
    </div>
  );
}
