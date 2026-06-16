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
import { Plus, MoreHorizontal, Eye, Pencil, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate, getStatusBadgeVariant } from "@/lib/utils";
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
    } catch (e) { console.error(e); }
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
    { key: "caseNumber", header: "Case #", sortable: true, render: (c) => <Link href={`/cases/${c.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium text-sm hover:underline">{c.caseNumber}</Link> },
    { key: "applicationDate", header: "Date", sortable: true, render: (c) => <span className="text-sm whitespace-nowrap">{formatDate(c.applicationDate)}</span> },
    { key: "department", header: "Dept", sortable: true, render: (c) => <span className="text-xs" title={DEPARTMENT_LABELS[c.department]}>{c.department}</span> },
    { key: "category", header: "Category", sortable: true, render: (c) => <Badge variant="secondary" className="text-xs">{c.category}</Badge> },
    { key: "purpose", header: "Purpose", className: "max-w-[130px] truncate", render: (c) => <span className="text-xs">{c.purpose}</span> },
    { key: "applicantName", header: "Applicant", sortable: true, className: "max-w-[100px] truncate" },
    { key: "projectTitle", header: "Project", className: "max-w-[140px] truncate", render: (c) => <span className="text-xs">{c.projectTitle}</span> },
    { key: "currentProgressStep", header: "Progress", render: (c) => <span className="text-xs">{c.currentProgressStep || "—"}</span> },
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
        <Link href="/cases/new"><Button className="bg-teal-600 hover:bg-teal-700"><Plus className="mr-2 h-4 w-4" />New Case</Button></Link>
      </div>

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
