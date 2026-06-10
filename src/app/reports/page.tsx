"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileText, Package, ArrowDownUp, Building2, Tag } from "lucide-react";

const REPORT_TYPES = [
  { key: "cases", title: "Case Report", description: "Export all cases with filters", icon: FileText },
  { key: "material-usage", title: "Material Usage Report", description: "Export material usage records", icon: Package },
  { key: "stock-transactions", title: "Stock Transaction Report", description: "Export stock transaction history", icon: ArrowDownUp },
  { key: "departments", title: "Department Statistics", description: "Export case counts by department", icon: Building2 },
  { key: "use-types", title: "Use Type Statistics", description: "Export case counts by use type", icon: Tag },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState("cases");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [department, setDepartment] = useState("");
  const [useType, setUseType] = useState("");
  const [materialCategory, setMaterialCategory] = useState("");
  const [status, setStatus] = useState("");

  const [departments, setDepartments] = useState<string[]>([]);
  const [useTypes, setUseTypes] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success) {
        const s = json.data as Array<{ type: string; value: string; isActive: boolean }>;
        setDepartments(s.filter((x) => x.type === "department" && x.isActive).map((x) => x.value));
        setUseTypes(s.filter((x) => x.type === "use_type" && x.isActive).map((x) => x.value));
        setCategories(s.filter((x) => x.type === "material_category" && x.isActive).map((x) => x.value));
      }
    }
    load();
  }, []);

  const handleExport = () => {
    const params = new URLSearchParams();
    params.set("type", reportType);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (department) params.set("department", department);
    if (useType) params.set("useType", useType);
    if (materialCategory) params.set("materialCategory", materialCategory);
    if (status) params.set("status", status);

    window.open(`/api/reports?${params}`, "_blank");
    toast.success("Report downloaded");
  };

  const selectedReport = REPORT_TYPES.find((r) => r.key === reportType);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Reports</h2>
        <p className="text-sm text-slate-500 mt-1">Generate and export reports as CSV</p>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {REPORT_TYPES.map((r) => (
          <Card
            key={r.key}
            className={`cursor-pointer transition-colors hover:border-teal-300 ${
              reportType === r.key ? "border-teal-500 bg-teal-50/50" : ""
            }`}
            onClick={() => setReportType(r.key)}
          >
            <CardContent className="p-4 text-center">
              <r.icon className={`h-5 w-5 mx-auto mb-2 ${reportType === r.key ? "text-teal-600" : "text-slate-400"}`} />
              <p className="text-sm font-medium text-slate-700">{r.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {selectedReport?.title || "Report"} Export
          </CardTitle>
          <p className="text-xs text-slate-500">{selectedReport?.description}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full text-sm border rounded-md px-2 py-1.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full text-sm border rounded-md px-2 py-1.5"
              />
            </div>
            {(reportType === "cases" || reportType === "departments") && (
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Department</label>
                <Select value={department} onValueChange={(v) => { if (v) setDepartment(v); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(reportType === "cases" || reportType === "use-types") && (
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Use Type</label>
                <Select value={useType} onValueChange={(v) => { if (v) setUseType(v); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {useTypes.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(reportType === "cases") && (
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Status</label>
                <Select value={status} onValueChange={(v) => { if (v) setStatus(v); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="In progress">In Progress</SelectItem>
                    <SelectItem value="On hold">On Hold</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {(reportType === "material-usage") && (
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Material Category</label>
                <Select value={materialCategory} onValueChange={(v) => { if (v) setMaterialCategory(v); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button onClick={handleExport} className="bg-teal-600 hover:bg-teal-700">
            <Download className="mr-2 h-4 w-4" /> Export {selectedReport?.title || "Report"} (CSV)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
