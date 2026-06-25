"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, Column } from "@/components/shared/data-table";
import { Plus, MoreHorizontal, Eye, Pencil, Copy, Trash2, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate, getStatusBadgeVariant, cn } from "@/lib/utils";
import { DEPARTMENTS, DEPARTMENT_LABELS, CATEGORIES } from "@/lib/constants";

interface CaseItem {
  id: string;
  caseNumber: string;
  applicationDate: string;
  department: string;
  applicantName: string;
  category: string;
  purpose: string;
  projectTitle: string;
  currentStatus: string;
  currentProgressStep: string | null;
  priority: string;
  technician: string | null;
  printingParty: string | null;
  updatedAt: string;
  _count: { progressSteps: number; materialUsage: number };
}

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteCaseNumber, setDeleteCaseNumber] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (deptFilter !== "all") params.set("department", deptFilter);
      if (catFilter !== "all") params.set("category", catFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/cases?${params}`);
      const json = await res.json();
      if (json.success) setCases(json.data);
    } catch (e) { console.error(e); toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, [search, deptFilter, catFilter, statusFilter]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/cases/${id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffName: "System" }),
      });
      if (res.ok) { toast.success("Case duplicated"); fetchCases(); }
      else toast.error("Failed to duplicate case");
    } catch { toast.error("Failed to duplicate case"); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/cases/${deleteId}`, { method: "DELETE" });
      if (res.ok) { toast.success("Case deleted"); setDeleteId(null); fetchCases(); }
      else toast.error("Failed to delete case");
    } catch { toast.error("Failed to delete case"); }
  };

  const columns: Column<CaseItem>[] = [
    {
      key: "actions", header: "", className: "w-10",
      render: (c) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg p-1.5 hover:bg-slate-100">
            <MoreHorizontal className="h-4 w-4 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => router.push(`/cases/${c.id}`)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/cases/${c.id}/edit`)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDuplicate(c.id)}><Copy className="mr-2 h-4 w-4" />Duplicate</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => { setDeleteId(c.id); setDeleteCaseNumber(c.caseNumber); }}>
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
    { key: "caseNumber", header: "Case #", sortable: true, render: (c) => <Link href={`/cases/${c.id}`} className="text-primary hover:text-primary/80 font-medium text-sm hover:underline">{c.caseNumber}</Link> },
    { key: "applicationDate", header: "Date", sortable: true, render: (c) => <span className="text-sm whitespace-nowrap">{formatDate(c.applicationDate)}</span> },
    { key: "department", header: "Dept", sortable: true, render: (c) => <span className="text-xs" title={DEPARTMENT_LABELS[c.department]}>{c.department}</span> },
    { key: "category", header: "Category", sortable: true, render: (c) => <Badge variant="secondary" className="text-xs">{c.category}</Badge> },
    { key: "purpose", header: "Purpose", className: "max-w-[130px] truncate", render: (c) => <span className="text-xs">{c.purpose}</span> },
    { key: "applicantName", header: "Applicant", sortable: true, className: "max-w-[100px] truncate" },
    { key: "projectTitle", header: "Project", className: "max-w-[140px] truncate", render: (c) => <span className="text-xs">{c.projectTitle}</span> },
    { key: "currentProgressStep", header: "Progress", render: (c) => {
      if (!c.currentProgressStep) return <span className="text-xs text-slate-300">—</span>;
      const stepColors: Record<string, string> = {
        "Application Received": "bg-amber-100 text-amber-700",
        "Approval": "bg-orange-100 text-orange-700",
        "Segmentation / Design": "bg-purple-100 text-purple-700",
        "Verify Segmentation / Design": "bg-blue-100 text-blue-700",
        "Printing": "bg-cyan-100 text-cyan-700",
        "Post-processing": "bg-teal-100 text-teal-700",
        "Final Product": "bg-emerald-100 text-emerald-700",
        "Completion": "bg-green-100 text-green-700",
      };
      const color = stepColors[c.currentProgressStep] || "bg-slate-100 text-slate-600";
      return <Badge className={`text-[11px] font-medium ${color} border-0`}>{c.currentProgressStep}</Badge>;
    }},
    { key: "currentStatus", header: "Status", sortable: true, render: (c) => <Badge variant={getStatusBadgeVariant(c.currentStatus)}>{c.currentStatus}</Badge> },
    { key: "technician", header: "Tech", render: (c) => <span className="text-xs">{c.technician || "—"}</span> },
    { key: "priority", header: "Priority", sortable: true, render: (c) => <Badge variant={getStatusBadgeVariant(c.priority)} className="text-xs">{c.priority}</Badge> },
    { key: "updatedAt", header: "Updated", render: (c) => <span className="text-xs whitespace-nowrap">{formatDate(c.updatedAt)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Cases</h2>
          <p className="text-sm text-slate-500 mt-1">Manage 3D printing case records</p>
        </div>
        <div className="flex gap-2">
          {/* Import old master list */}
          <label className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors", importing ? "bg-slate-100 text-slate-400" : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600")}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? "Importing..." : "Import"}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={importing}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImporting(true); setImportResult(null);
                const fd = new FormData();
                fd.append("file", file);
                try {
                  const res = await fetch("/api/cases/import", { method: "POST", body: fd });
                  const json = await res.json();
                  if (json.success) { setImportResult(json.data); toast.success(`${json.data.imported} cases imported`); fetchCases(); }
                  else toast.error(json.error || "Import failed");
                } catch { toast.error("Failed to import"); }
                finally { setImporting(false); }
              }}
            />
          </label>
          <Link href="/cases/new"><Button className="bg-teal-600 hover:bg-teal-700"><Plus className="mr-2 h-4 w-4" />New Case</Button></Link>
        </div>
      </div>

      {/* Import result banner */}
      {importResult && (
        <div className={cn("rounded-xl p-4 flex items-center gap-4", importResult.errorCount > 0 ? "bg-amber-50 border border-amber-200" : "bg-emerald-50 border border-emerald-200")}>
          <CheckCircle2 className={cn("h-5 w-5", importResult.errorCount > 0 ? "text-amber-500" : "text-emerald-500")} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-700">{importResult.imported} of {importResult.totalRows} cases imported{importResult.skipped > 0 ? ` (${importResult.skipped} skipped)` : ""}</p>
            {importResult.errorCount > 0 && <p className="text-xs text-amber-600">{importResult.errorCount} errors</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setImportResult(null)}>Dismiss</Button>
        </div>
      )}

      <DataTable
        data={cases} columns={columns} keyField="id"
        searchValue={search} onSearchChange={setSearch}
        searchPlaceholder="Search by case #, project, applicant..."
        isLoading={loading}
        emptyTitle="No cases found"
        emptyDescription="Create a new case record to get started."
        toolbar={
          <div className="flex gap-2">
            <Select value={deptFilter} onValueChange={(v) => v && setDeptFilter(v)}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Dept" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={catFilter} onValueChange={(v) => v && setCatFilter(v)}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {["Draft","In progress","On hold","Completed","Cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <ConfirmDialog
        open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="Delete Case" description={`Delete "${deleteCaseNumber}"?`}
        confirmLabel="Delete" variant="destructive" onConfirm={handleDelete}
      />
    </div>
  );
}
