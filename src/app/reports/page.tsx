"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileText, Package, ArrowDownUp, Building2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const REPORT_TYPES = [
  { key: "cases", title: "Case Report", desc: "All case records with filters", icon: FileText },
  { key: "material-usage", title: "Material Usage", desc: "Usage records by case", icon: Package },
  { key: "stock-transactions", title: "Stock Transactions", desc: "Full transaction history", icon: ArrowDownUp },
  { key: "departments", title: "By Department", desc: "Case counts per department", icon: Building2 },
  { key: "categories", title: "By Category", desc: "Case counts per category", icon: Tag },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState("cases");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [materialCategory, setMaterialCategory] = useState("");
  const [status, setStatus] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [matCats, setMatCats] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((j) => {
      if (j.success) {
        const s = j.data as any[];
        setDepartments(s.filter((x: any) => x.type === "department" && x.isActive).map((x: any) => x.value));
        setCategoriesList(s.filter((x: any) => x.type === "case_category" && x.isActive).map((x: any) => x.value));
        setMatCats(s.filter((x: any) => x.type === "material_category" && x.isActive).map((x: any) => x.value));
      }
    }).catch(() => {});
  }, []);

  const handleExport = () => {
    const params = new URLSearchParams();
    params.set("type", reportType);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (department) params.set("department", department);
    if (category) params.set("category", category);
    if (materialCategory) params.set("materialCategory", materialCategory);
    if (status) params.set("status", status);
    window.open(`/api/reports?${params}`, "_blank");
    toast.success("Report downloaded");
  };

  const selected = REPORT_TYPES.find((r) => r.key === reportType);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h2>
        <p className="text-sm text-slate-500 mt-1">Generate and export reports as CSV</p>
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {REPORT_TYPES.map((r) => (
          <button
            key={r.key}
            onClick={() => setReportType(r.key)}
            className={cn(
              "text-left p-4 rounded-xl border-2 transition-all duration-150",
              reportType === r.key
                ? "border-indigo-500 bg-indigo-50 shadow-sm"
                : "border-transparent bg-white shadow-sm hover:border-slate-200 hover:shadow"
            )}
          >
            <r.icon className={cn("h-6 w-6 mb-2", reportType === r.key ? "text-indigo-600" : "text-slate-400")} />
            <p className="text-sm font-semibold text-slate-700">{r.title}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Filters + Export */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base">{selected?.title} — Export</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            <div className="space-y-1"><label className="text-xs font-medium text-slate-500">From</label><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full text-sm border rounded-lg px-2 py-1.5 bg-white" /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-slate-500">To</label><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full text-sm border rounded-lg px-2 py-1.5 bg-white" /></div>
            {(reportType === "cases" || reportType === "departments") && (
              <div className="space-y-1"><label className="text-xs font-medium text-slate-500">Dept</label><Select value={department} onValueChange={(v) => { if (v) setDepartment(v); }}><SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="">All</SelectItem>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
            )}
            {(reportType === "cases" || reportType === "categories") && (
              <div className="space-y-1"><label className="text-xs font-medium text-slate-500">Category</label><Select value={category} onValueChange={(v) => { if (v) setCategory(v); }}><SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="">All</SelectItem>{categoriesList.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            )}
            {reportType === "cases" && (
              <div className="space-y-1"><label className="text-xs font-medium text-slate-500">Status</label><Select value={status} onValueChange={(v) => { if (v) setStatus(v); }}><SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="">All</SelectItem>{["Draft","In progress","On hold","Completed","Cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            )}
            {reportType === "material-usage" && (
              <div className="space-y-1"><label className="text-xs font-medium text-slate-500">Material Cat.</label><Select value={materialCategory} onValueChange={(v) => { if (v) setMaterialCategory(v); }}><SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="">All</SelectItem>{matCats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            )}
          </div>
          <Button onClick={handleExport} className="bg-indigo-600 hover:bg-indigo-700"><Download className="mr-2 h-4 w-4" />Export {selected?.title} (CSV)</Button>
        </CardContent>
      </Card>
    </div>
  );
}
