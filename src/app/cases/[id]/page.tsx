"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/loading-state";
import { ProgressTimeline } from "@/components/cases/progress-timeline";
import { MaterialUsageTable } from "@/components/cases/material-usage-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "sonner";
import { Pencil, Copy, Trash2, ImageIcon, ExternalLink, Calendar, User, Building2, Tag } from "lucide-react";
import { formatDate, formatDateTime, getStatusBadgeVariant } from "@/lib/utils";
import { DEPARTMENT_LABELS } from "@/lib/constants";
import { CaseDetailFields } from "@/components/cases/case-detail-fields";

interface CaseDetail {
  id: string; caseNumber: string; applicationDate: string;
  expectedCompletionDate: string | null; approvalDate: string | null; completionDate: string | null;
  ownership: string | null; department: string; hospital: string;
  applicantName: string; contact: string | null; rank: string | null;
  category: string; purpose: string; specification: string | null;
  projectTitle: string; description: string | null;
  modelType: string | null; requiredService: string | null; serviceRequirements: string | null;
  requiresSterilization: string | null; quantity: number; totalComponents: number;
  priority: string; currentStatus: string; currentProgressStep: string | null;
  technician: string | null; printingParty: string | null;
  modelImageUrl: string | null; photoFolderUrl: string | null; remarks: string | null;
  telephone: string | null; email: string | null;
  signature: string | null; signatureDate: string | null;
  modelMaterial: string | null; colourRequirement: string | null;
  copyrightRisk: boolean | null; copyrightDetails: string | null;
  isReprint: boolean | null; fundingSource: string | null;
  createdAt: string; updatedAt: string;
  progressSteps: any[]; materialUsage: any[]; auditLogs?: any[];
}

export default function CaseDetailPage() {
  const params = useParams(); const router = useRouter();
  const caseId = params.id as string;
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const fetchCase = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      const json = await res.json();
      if (json.success) setCaseData(json.data);
      else toast.error("Case not found");
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  }, [caseId]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/duplicate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staffName: "System" }) });
      if (res.ok) { const j = await res.json(); toast.success("Duplicated"); router.push(`/cases/${j.data.id}`); }
    } catch { toast.error("Failed"); }
  };
  const handleDelete = async () => {
    try { await fetch(`/api/cases/${caseId}`, { method: "DELETE" }); toast.success("Deleted"); router.push("/cases"); }
    catch { toast.error("Failed"); }
  };

  if (loading) return <LoadingState />;
  if (!caseData) return <p className="text-center py-20 text-slate-500">Case not found.</p>;

  return (
    <div className="space-y-6">
      {/* HERO IMAGE */}
      <Card className="border-0 shadow-sm overflow-hidden">
        {caseData.modelImageUrl && !imgError ? (
          <div className="relative">
            <img src={caseData.modelImageUrl} alt="3D Model" className="w-full h-56 object-cover bg-slate-100" onError={() => setImgError(true)} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            {caseData.photoFolderUrl && (
              <a href={caseData.photoFolderUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white shadow-sm">
                <ExternalLink className="h-3.5 w-3.5" />Photo Folder
              </a>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="text-center">
              <ImageIcon className="h-10 w-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No 3D model image</p>
              {caseData.photoFolderUrl && (
                <a href={caseData.photoFolderUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-primary font-medium"><ExternalLink className="h-3 w-3" />Photo Folder</a>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* TITLE BAR */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{caseData.caseNumber}</h1>
            <Badge variant={getStatusBadgeVariant(caseData.currentStatus)}>{caseData.currentStatus}</Badge>
            <Badge variant={getStatusBadgeVariant(caseData.priority)}>{caseData.priority}</Badge>
            <Badge variant="secondary">{caseData.category}</Badge>
          </div>
          <h2 className="text-lg font-medium text-slate-700">{caseData.projectTitle}</h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{caseData.department}{DEPARTMENT_LABELS[caseData.department] ? ` (${DEPARTMENT_LABELS[caseData.department]})` : ""}</span>
            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{caseData.applicantName}</span>
            <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />{caseData.purpose}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(caseData.applicationDate)}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => router.push(`/cases/${caseId}/edit`)}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate}><Copy className="mr-1.5 h-4 w-4" />Duplicate</Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button>
        </div>
      </div>

      {/* === PROGRESS — MOST IMPORTANT, FRONT AND CENTER === */}
      <Card className="border-0 shadow-sm ring-1 ring-blue-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            </div>
            Progress Timeline
            {caseData.currentProgressStep && (
              <Badge variant="outline" className="ml-2 text-xs font-normal">{caseData.currentProgressStep}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <ProgressTimeline caseId={caseId} steps={caseData.progressSteps} onRefresh={fetchCase} />
        </CardContent>
      </Card>

      {/* DETAIL CARDS + MATERIAL USAGE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Key details + description */}
        <div className="lg:col-span-1 space-y-4">
          <CaseDetailFields caseData={caseData} />
        </div>

        {/* Material Usage */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Material Usage</CardTitle></CardHeader>
            <CardContent><MaterialUsageTable caseId={caseId} usageRecords={caseData.materialUsage} onRefresh={fetchCase} /></CardContent>
          </Card>
        </div>
      </div>

      {/* AUDIT + META */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Audit Log</CardTitle></CardHeader>
          <CardContent>
            {caseData.auditLogs && caseData.auditLogs.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {caseData.auditLogs.map((log: any) => (
                  <div key={log.id} className="flex gap-3 text-sm py-2 border-b border-slate-50 last:border-0">
                    <span className="text-xs text-slate-400 whitespace-nowrap w-32">{formatDateTime(log.createdAt)}</span>
                    <p className="font-medium text-slate-700 capitalize flex-1">{log.action.replace(/_/g, " ")}{log.details ? <span className="text-xs text-slate-400 ml-2 font-normal">{log.details}</span> : null}</p>
                    <span className="text-xs text-slate-400">{log.staffName}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400 py-8 text-center">No audit log entries</p>}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><p className="text-xs text-slate-400">Created</p><p className="font-medium">{formatDateTime(caseData.createdAt)}</p></div>
            <div><p className="text-xs text-slate-400">Last Updated</p><p className="font-medium">{formatDateTime(caseData.updatedAt)}</p></div>
            {caseData.contact && <div><p className="text-xs text-slate-400">Contact</p><p className="font-medium">{caseData.contact}</p></div>}
            {caseData.telephone && <div><p className="text-xs text-slate-400">Telephone</p><p className="font-medium">{caseData.telephone}</p></div>}
            {caseData.email && <div><p className="text-xs text-slate-400">Email</p><p className="font-medium">{caseData.email}</p></div>}
            {caseData.signature && <div><p className="text-xs text-slate-400">Applicant Signature</p><p className="font-medium">{caseData.signature}{caseData.signatureDate ? ` (${formatDate(caseData.signatureDate)})` : ""}</p></div>}
            <div><p className="text-xs text-slate-400">Expected</p><p className="font-medium">{formatDate(caseData.expectedCompletionDate)}</p></div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Case" description={`Delete "${caseData.caseNumber}"? This cannot be undone.`} confirmLabel="Delete" variant="destructive" onConfirm={handleDelete} />
    </div>
  );
}
