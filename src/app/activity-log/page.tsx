"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Search, ChevronLeft, ChevronRight, Activity, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

const ENTITY_COLORS: Record<string, string> = {
  Case: "bg-blue-100 text-blue-700",
  Material: "bg-emerald-100 text-emerald-700",
  Setting: "bg-violet-100 text-violet-700",
  CaseMaterialUsage: "bg-amber-100 text-amber-700",
  CaseProgressStep: "bg-cyan-100 text-cyan-700",
};

const ACTION_LABELS: Record<string, string> = {
  case_created: "Case created",
  case_updated: "Case updated",
  case_deleted: "Case deleted",
  case_duplicated: "Case duplicated",
  cases_imported: "Cases imported",
  material_created: "Material created",
  material_updated: "Material updated",
  material_deleted: "Material deleted",
  material_usage_added: "Material usage added",
  material_usage_updated: "Material usage updated",
  material_usage_deleted: "Material usage deleted",
  setting_created: "Setting created",
  setting_updated: "Setting updated",
  setting_deleted: "Setting deleted",
  progress_updated: "Progress updated",
  stock_take_imported: "Stock take imported",
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "50");
      if (filterEntity) params.set("entityType", filterEntity);
      if (filterAction) params.set("action", filterAction);
      if (searchText) params.set("search", searchText);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/audit-logs?${params}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs);
        setTotal(json.data.total);
        setTotalPages(json.data.totalPages);
        setEntityTypes(json.data.entityTypes);
        setActions(json.data.actions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, filterEntity, filterAction, searchText, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const hasFilters = filterEntity || filterAction || searchText || dateFrom || dateTo;
  const clearFilters = () => {
    setFilterEntity("");
    setFilterAction("");
    setSearchText("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Activity Log</h2>
          <p className="text-sm text-slate-500 mt-1">Records of all actions performed on the platform</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          {total} entries
        </Badge>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 pt-4 pb-4">
          <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-1.5 flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
              className="bg-transparent border-0 outline-none text-sm flex-1 placeholder:text-slate-400"
            />
            {searchText && (
              <button onClick={() => { setSearchText(""); setPage(1); }}>
                <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>

          <Select value={filterEntity} onValueChange={(v) => { setFilterEntity(v || ""); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-9 text-xs bg-white">
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All entities</SelectItem>
              {entityTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterAction} onValueChange={(v) => { setFilterAction(v || ""); setPage(1); }}>
            <SelectTrigger className="w-[170px] h-9 text-xs bg-white">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All actions</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="h-9 text-xs border rounded-lg px-2 bg-white w-[140px]"
          />
          <span className="text-slate-300 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="h-9 text-xs border rounded-lg px-2 bg-white w-[140px]"
          />

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-600 font-medium flex items-center gap-1">
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </CardContent>
      </Card>

      {/* Log entries */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Activity className="h-8 w-8 text-slate-200 animate-pulse" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Clock className="h-10 w-10 mb-3" />
              <p className="text-sm">No activity logs found</p>
              {hasFilters && <p className="text-xs mt-1">Try adjusting your filters</p>}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 px-5 py-3 hover:bg-slate-50/50 transition-colors">
                  <div className="shrink-0 mt-0.5">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <Activity className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`
                        inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold
                        ${ENTITY_COLORS[log.entityType] || "bg-slate-100 text-slate-600"}
                      `}>
                        {log.entityType}
                      </span>
                      <span className="text-sm font-medium text-slate-800">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{log.details}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-slate-500">{formatDate(log.createdAt)}</p>
                    <p className="text-[10px] text-slate-400">{log.staffName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="text-xs text-slate-500 px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
