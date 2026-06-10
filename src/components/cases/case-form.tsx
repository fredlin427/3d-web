"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const caseSchema = z.object({
  caseNumber: z.string().min(1, "Case number is required"),
  applicationDate: z.string().min(1, "Application date is required"),
  department: z.string().min(1, "Department is required"),
  applicantName: z.string().min(1, "Applicant name is required"),
  contact: z.string().optional(),
  useType: z.string().min(1, "Use type is required"),
  projectTitle: z.string().min(1, "Project title is required"),
  description: z.string().optional(),
  clinicalPurpose: z.string().optional(),
  priority: z.string().min(1),
  requiredDate: z.string().optional(),
  currentStatus: z.string().min(1),
  modelImageUrl: z.string().optional(),
  photoFolderUrl: z.string().optional(),
  remarks: z.string().optional(),
  staffName: z.string().optional(),
});

type CaseFormData = z.infer<typeof caseSchema>;

interface CaseFormProps {
  defaultValues?: Partial<CaseFormData>;
  isEditing?: boolean;
  caseId?: string;
}

export function CaseForm({ defaultValues, isEditing, caseId }: CaseFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [useTypes, setUseTypes] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: defaultValues || {
      applicationDate: new Date().toISOString().split("T")[0],
      priority: "Routine",
      currentStatus: "Draft",
    },
  });

  useEffect(() => {
    async function loadOptions() {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success) {
        const data = json.data as Array<{ type: string; value: string; isActive: boolean }>;
        setDepartments(data.filter((s) => s.type === "department" && s.isActive).map((s) => s.value));
        setUseTypes(data.filter((s) => s.type === "use_type" && s.isActive).map((s) => s.value));
        setPriorities(data.filter((s) => s.type === "priority" && s.isActive).map((s) => s.value));
        setStatuses(data.filter((s) => s.type === "case_status" && s.isActive).map((s) => s.value));
      }
    }
    loadOptions();
  }, []);

  const onSubmit = async (data: CaseFormData) => {
    setSaving(true);
    try {
      const url = isEditing ? `/api/cases/${caseId}` : "/api/cases";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const json = await res.json();
        toast.success(isEditing ? "Case updated" : "Case created");
        if (isEditing) {
          router.push(`/cases/${caseId}`);
        } else {
          router.push(`/cases/${json.data.id}`);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save case");
      }
    } catch {
      toast.error("Failed to save case");
    } finally {
      setSaving(false);
    }
  };

  const list = (items: string[]) => items.length > 0 ? items : ["Surgery", "Orthopaedics", "Neurosurgery", "ENT", "Dental", "Radiology", "Oncology", "Cardiology", "Other"];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="caseNumber">Case Number *</Label>
            <Input id="caseNumber" {...register("caseNumber")} placeholder="e.g., 3DP-2026-0001" />
            {errors.caseNumber && <p className="text-xs text-red-500">{errors.caseNumber.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="applicationDate">Application Date *</Label>
            <Input id="applicationDate" type="date" {...register("applicationDate")} />
            {errors.applicationDate && <p className="text-xs text-red-500">{errors.applicationDate.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="requiredDate">Required Date</Label>
            <Input id="requiredDate" type="date" {...register("requiredDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Select onValueChange={(v) => { if (v) setValue("department", v); }} value={watch("department")}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {list(departments).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.department && <p className="text-xs text-red-500">{errors.department.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="useType">Use Type *</Label>
            <Select onValueChange={(v) => { if (v) setValue("useType", v); }} value={watch("useType")}>
              <SelectTrigger><SelectValue placeholder="Select use type" /></SelectTrigger>
              <SelectContent>
                {list(useTypes).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.useType && <p className="text-xs text-red-500">{errors.useType.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority *</Label>
            <Select onValueChange={(v) => { if (v) setValue("priority", v); }} value={watch("priority")}>
              <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
              <SelectContent>
                {list(priorities).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentStatus">Status *</Label>
            <Select onValueChange={(v) => { if (v) setValue("currentStatus", v); }} value={watch("currentStatus")}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {list(statuses).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Personnel & Project */}
      <Card>
        <CardHeader><CardTitle className="text-base">Personnel & Project</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="applicantName">Applicant / Requesting Staff *</Label>
            <Input id="applicantName" {...register("applicantName")} placeholder="Staff name" />
            {errors.applicantName && <p className="text-xs text-red-500">{errors.applicantName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact">Contact</Label>
            <Input id="contact" {...register("contact")} placeholder="Email or extension" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectTitle">Project Title *</Label>
            <Input id="projectTitle" {...register("projectTitle")} placeholder="Project title" />
            {errors.projectTitle && <p className="text-xs text-red-500">{errors.projectTitle.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="staffName">Staff Name (for audit)</Label>
            <Input id="staffName" {...register("staffName")} placeholder="Your name" />
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Case Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="description">Case Description</Label>
            <Textarea id="description" {...register("description")} rows={3} placeholder="Brief case description" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clinicalPurpose">Clinical Purpose / Intended Use</Label>
            <Textarea id="clinicalPurpose" {...register("clinicalPurpose")} rows={2} placeholder="Clinical purpose" />
          </div>
        </CardContent>
      </Card>

      {/* Media */}
      <Card>
        <CardHeader><CardTitle className="text-base">Media & References</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="modelImageUrl">3D Model Image URL</Label>
            <Input id="modelImageUrl" {...register("modelImageUrl")} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photoFolderUrl">Photo Folder URL</Label>
            <Input id="photoFolderUrl" {...register("photoFolderUrl")} placeholder="https://..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" {...register("remarks")} rows={2} placeholder="Additional notes" />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Case" : "Create Case"}
        </Button>
      </div>
    </form>
  );
}
