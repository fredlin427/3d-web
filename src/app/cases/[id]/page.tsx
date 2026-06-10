"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/shared/loading-state";
import { ProgressTimeline } from "@/components/cases/progress-timeline";
import { MaterialUsageTable } from "@/components/cases/material-usage-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "sonner";
import {
  Pencil,
  Copy,
  Trash2,
  ImageIcon,
  ExternalLink,
  Calendar,
  User,
  Briefcase,
  Clock,
  FileText,
} from "lucide-react";
import { formatDate, formatDateTime, getStatusBadgeVariant } from "@/lib/utils";

interface CaseDetail {
  id: string;
  caseNumber: string;
  applicationDate: string;
  department: string;
  applicantName: string;
  contact: string | null;
  useType: string;
  projectTitle: string;
  description: string | null;
  clinicalPurpose: string | null;
  priority: string;
  requiredDate: string | null;
  currentStatus: string;
  currentProgressStep: string | null;
  modelImageUrl: string | null;
  photoFolderUrl: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  progressSteps: Array<{
    id: string;
    caseId: string;
    stepName: string;
    stepOrder: number;
    status: string;
    completedDate: string | null;
    staffName: string | null;
    notes: string | null;
  }>;
  materialUsage: Array<{
    id: string;
    caseId: string;
    materialId: string;
    usageDate: string;
    quantityUsed: number;
    unit: string;
    staffName: string | null;
    printerOrTank: string | null;
    notes: string | null;
    material: {
      id: string;
      materialName: string;
      category: string;
      batchNumber: string;
      currentQuantity: number;
      unit: string;
    };
  }>;
  auditLogs?: Array<{
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    details: string | null;
    staffName: string;
    createdAt: string;
  }>;
}

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchCase = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      const json = await res.json();
      if (json.success) {
        setCaseData(json.data);
      } else {
        toast.error("Case not found");
      }
    } catch {
      toast.error("Failed to load case");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffName: "System" }),
      });
      if (res.ok) {
        const json = await res.json();
        toast.success("Case duplicated");
        router.push(`/cases/${json.data.id}`);
      } else {
        toast.error("Failed to duplicate case");
      }
    } catch {
      toast.error("Failed to duplicate case");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Case deleted");
        router.push("/cases");
      } else {
        toast.error("Failed to delete case");
      }
    } catch {
      toast.error("Failed to delete case");
    }
  };

  if (loading) return <LoadingState />;
  if (!caseData) return <p className="text-center py-8 text-slate-500">Case not found.</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">{caseData.caseNumber}</h2>
            <Badge variant={getStatusBadgeVariant(caseData.currentStatus)}>{caseData.currentStatus}</Badge>
            <Badge variant={getStatusBadgeVariant(caseData.priority)}>{caseData.priority}</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">{caseData.projectTitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/cases/${caseId}/edit`)}>
            <Pencil className="mr-1.5 h-4 w-4" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy className="mr-1.5 h-4 w-4" /> Duplicate
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case Info */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Case Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Department</p>
                  <p className="font-medium">{caseData.department}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Use Type</p>
                  <p className="font-medium">{caseData.useType}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Application Date</p>
                  <p className="font-medium"><Calendar className="inline h-3 w-3 mr-1" />{formatDate(caseData.applicationDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Applicant</p>
                  <p className="font-medium"><User className="inline h-3 w-3 mr-1" />{caseData.applicantName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Contact</p>
                  <p className="font-medium">{caseData.contact || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Required Date</p>
                  <p className="font-medium">{formatDate(caseData.requiredDate)}</p>
                </div>
                {caseData.description && (
                  <div className="col-span-full">
                    <p className="text-xs text-slate-400">Description</p>
                    <p>{caseData.description}</p>
                  </div>
                )}
                {caseData.clinicalPurpose && (
                  <div className="col-span-full">
                    <p className="text-xs text-slate-400">Clinical Purpose</p>
                    <p>{caseData.clinicalPurpose}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress Timeline */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Progress</CardTitle></CardHeader>
            <CardContent>
              <ProgressTimeline
                caseId={caseId}
                steps={caseData.progressSteps}
                onRefresh={fetchCase}
              />
            </CardContent>
          </Card>

          {/* Material Usage */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Material Usage</CardTitle></CardHeader>
            <CardContent>
              <MaterialUsageTable
                caseId={caseId}
                usageRecords={caseData.materialUsage}
                onRefresh={fetchCase}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* 3D Model Image */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">3D Model Preview</CardTitle></CardHeader>
            <CardContent>
              {caseData.modelImageUrl ? (
                <div className="space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={caseData.modelImageUrl}
                    alt="3D Model"
                    className="w-full rounded-lg border object-cover aspect-video bg-slate-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                  <div className="hidden flex-col items-center justify-center aspect-video bg-slate-50 rounded-lg border text-slate-400">
                    <ImageIcon className="h-8 w-8 mb-2" />
                    <span className="text-xs">Image not available</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center aspect-video bg-slate-50 rounded-lg border text-slate-400">
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <span className="text-xs">No image uploaded</span>
                </div>
              )}

              {caseData.photoFolderUrl && (
                <a
                  href={caseData.photoFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-1 text-xs text-teal-600 hover:text-teal-700"
                >
                  <ExternalLink className="h-3 w-3" /> Open Photo Folder
                </a>
              )}
            </CardContent>
          </Card>

          {/* Audit Log */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Audit Log</CardTitle></CardHeader>
            <CardContent>
              {caseData.auditLogs && caseData.auditLogs.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {caseData.auditLogs.map((log) => (
                    <div key={log.id} className="flex gap-2 text-xs">
                      <Clock className="h-3 w-3 mt-0.5 shrink-0 text-slate-300" />
                      <div>
                        <p className="text-slate-500">{formatDateTime(log.createdAt)}</p>
                        <p className="font-medium text-slate-700">{log.action.replace(/_/g, " ")}</p>
                        {log.details && <p className="text-slate-400">{log.details}</p>}
                        <p className="text-slate-400">by {log.staffName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No audit log entries</p>
              )}
            </CardContent>
          </Card>

          {/* Meta */}
          <Card>
            <CardContent className="py-3 text-xs text-slate-400 space-y-1">
              <p>Created: {formatDateTime(caseData.createdAt)}</p>
              <p>Updated: {formatDateTime(caseData.updatedAt)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Case"
        description={`Delete case "${caseData.caseNumber}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
