"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/shared/loading-state";
import { downloadCSV } from "@/lib/csv";
import { toast } from "sonner";
import {
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  TrendingDown,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const CHART_COLORS = ["#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316", "#ec4899"];

interface DashboardData {
  stats: {
    totalCases: number;
    casesThisMonth: number;
    casesInProgress: number;
    completedCases: number;
    lowStockItems: number;
    expiringMaterials: number;
    materialsOpened: number;
  };
  caseVolumeByMonth: { month: string; count: number }[];
  caseByDepartment: { department: string; count: number }[];
  caseByUseType: { useType: string; count: number }[];
  materialUsageTrend: { month: string; usageCount: number }[];
  materialUsageByCategory: { category: string; totalUsed: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [useTypeFilter, setUseTypeFilter] = useState("all");

  const [departments, setDepartments] = useState<string[]>([]);
  const [useTypes, setUseTypes] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (deptFilter !== "all") params.set("department", deptFilter);
      if (useTypeFilter !== "all") params.set("useType", useTypeFilter);

      const res = await fetch(`/api/dashboard?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, deptFilter, useTypeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success) {
        const s = json.data as Array<{ type: string; value: string; isActive: boolean }>;
        setDepartments(s.filter((x) => x.type === "department" && x.isActive).map((x) => x.value));
        setUseTypes(s.filter((x) => x.type === "use_type" && x.isActive).map((x) => x.value));
      }
    }
    load();
  }, []);

  const handleExportStats = () => {
    if (!data) return;
    const csvData = [
      { Metric: "Total Cases", Value: data.stats.totalCases },
      { Metric: "Cases This Month", Value: data.stats.casesThisMonth },
      { Metric: "Cases In Progress", Value: data.stats.casesInProgress },
      { Metric: "Completed Cases", Value: data.stats.completedCases },
      { Metric: "Low Stock Items", Value: data.stats.lowStockItems },
      { Metric: "Expiring Materials", Value: data.stats.expiringMaterials },
      { Metric: "Materials Opened", Value: data.stats.materialsOpened },
    ];
    const csv = "Metric,Value\n" + csvData.map((r) => `"${r.Metric}",${r.Value}`).join("\n");
    downloadCSV(csv, "dashboard-stats.csv");
    toast.success("Dashboard stats exported");
  };

  if (!data && loading) return <LoadingState />;

  const stats = data?.stats;

  const statCards = [
    { title: "Total Cases", value: stats?.totalCases || 0, icon: FolderOpen, color: "text-sky-600", bg: "bg-sky-50" },
    { title: "Cases This Month", value: stats?.casesThisMonth || 0, icon: Clock, color: "text-teal-600", bg: "bg-teal-50" },
    { title: "In Progress", value: stats?.casesInProgress || 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { title: "Completed", value: stats?.completedCases || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Low Stock", value: stats?.lowStockItems || 0, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
    { title: "Expiring", value: stats?.expiringMaterials || 0, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
    { title: "Opened", value: stats?.materialsOpened || 0, icon: Package, color: "text-violet-600", bg: "bg-violet-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Overview of 3D printing office activity</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportStats}>
          <Download className="mr-2 h-4 w-4" /> Export Stats
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">From:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm border rounded-md px-2 py-1.5"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">To:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-sm border rounded-md px-2 py-1.5"
          />
        </div>
        <Select value={deptFilter} onValueChange={(v) => { if (v) setDeptFilter(v); }}>
          <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={useTypeFilter} onValueChange={(v) => { if (v) setUseTypeFilter(v); }}>
          <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Use Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Use Types</SelectItem>
            {useTypes.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Case Volume by Month</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.caseVolumeByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Cases" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Cases by Department</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data?.caseByDepartment || []}
                  dataKey="count"
                  nameKey="department"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={false}
                >
                  {(data?.caseByDepartment || []).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Cases by Use Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.caseByUseType || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="useType" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} name="Cases" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Material Usage Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data?.materialUsageTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="usageCount" stroke="#f59e0b" strokeWidth={2} dot name="Usage" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm font-semibold">Material Usage by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.materialUsageByCategory || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="totalUsed" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Total Used" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
