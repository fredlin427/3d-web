"use client";

import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchInput } from "./search-input";
import { EmptyState } from "./empty-state";
import { LoadingState } from "./loading-state";

export interface Column<T> {
  key: string; header: string; render?: (item: T) => React.ReactNode; sortable?: boolean; className?: string;
}

export interface ColumnPickerConfig {
  columns: string[];
  selected: string[];
  onChange: (cols: string[]) => void;
}

interface DataTableProps<T> {
  data: T[]; columns: Column<T>[]; keyField?: string;
  searchValue?: string; onSearchChange?: (value: string) => void; searchPlaceholder?: string;
  isLoading?: boolean; emptyTitle?: string; emptyDescription?: string;
  pageSize?: number; actions?: React.ReactNode; toolbar?: React.ReactNode;
  columnPicker?: ColumnPickerConfig;
  density?: "compact" | "comfortable";
  striped?: boolean;
}

export function DataTable<T>({
  data, columns, keyField = "id", searchValue = "", onSearchChange, searchPlaceholder,
  isLoading, emptyTitle = "No records", emptyDescription, pageSize = 15, actions, toolbar,
  columnPicker, density = "comfortable", striped = true,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (aVal == null) return 1; if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  // Filter visible columns based on columnPicker selection
  const visibleColumns = columnPicker
    ? columns.filter((c) => columnPicker.selected.includes(c.header))
    : columns;

  return (
    <div className="space-y-4">
      {(onSearchChange || toolbar || columnPicker) && (
        <div className="flex items-center gap-3">
          {onSearchChange && <div className="max-w-sm flex-1"><SearchInput placeholder={searchPlaceholder} value={searchValue} onChange={onSearchChange} /></div>}
          {toolbar && <div className="flex items-center gap-2 flex-wrap">{toolbar}</div>}
          <div className="flex-1" />
          {columnPicker && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setPickerOpen(!pickerOpen)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                Columns ({columnPicker.selected.length}/{columns.length})
              </button>
              {pickerOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 w-56 bg-white rounded-xl shadow-lg ring-1 ring-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Show columns</span>
                      <div className="flex gap-1">
                        <button onClick={() => columnPicker.onChange(columnPicker.columns)} className="text-[10px] text-blue-500 hover:text-blue-700 font-medium px-1">All</button>
                        <button onClick={() => columnPicker.onChange([])} className="text-[10px] text-slate-400 hover:text-slate-600 font-medium px-1">None</button>
                      </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                      {columnPicker.columns.map((col) => (
                        <label
                          key={col}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-[13px]",
                            columnPicker.selected.includes(col) ? "bg-blue-50 text-slate-800 font-medium" : "text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={columnPicker.selected.includes(col)}
                            onChange={() => {
                              const s = columnPicker.selected.includes(col)
                                ? columnPicker.selected.filter((c) => c !== col)
                                : [...columnPicker.selected, col];
                              columnPicker.onChange(s);
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                          />
                          {col}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 bg-slate-50/50 hover:bg-slate-50/50">
                {visibleColumns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      density === "compact" ? "h-8 text-[10px]" : "h-11 text-xs",
                      "font-semibold uppercase tracking-wider text-slate-500",
                      col.sortable && "cursor-pointer select-none",
                      col.className
                    )}
                    onClick={() => col.sortable && (setSortKey(col.key), setSortDir(sortKey === col.key && sortDir === "asc" ? "desc" : "asc"))}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && (sortKey === col.key ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-30" />)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={visibleColumns.length} className="h-40"><LoadingState text="Loading..." /></TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={visibleColumns.length} className="h-40"><EmptyState title={emptyTitle} description={emptyDescription} /></TableCell></TableRow>
              ) : (
                paged.map((item) => (
                  <TableRow
                    key={String((item as Record<string, unknown>)[keyField])}
                    className={cn(
                      "border-b border-slate-50 hover:bg-slate-50/70 transition-colors duration-150",
                      striped && "even:bg-slate-50/30"
                    )}
                  >
                    {visibleColumns.map((col) => (
                      <TableCell key={col.key} className={cn(density === "compact" ? "py-1.5 text-xs" : "py-3 text-sm", col.className)}>
                        {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-400">Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) { pageNum = i; }
                else if (page < 4) { pageNum = i < 5 ? i : i === 5 ? -1 : totalPages - 1; }
                else if (page > totalPages - 5) { pageNum = i === 0 ? 0 : i === 1 ? -1 : totalPages - 7 + i; }
                else { pageNum = i === 0 ? 0 : i === 1 ? -1 : page + i - 3; }
                if (pageNum === -1) return <span key="dots" className="px-1 text-slate-300">...</span>;
                return <Button key={pageNum} variant={pageNum === page ? "default" : "outline"} size="sm" className={cn("h-8 w-8 p-0 font-medium", pageNum === page && "bg-primary hover:bg-primary/90")} onClick={() => setPage(pageNum)}>{pageNum + 1}</Button>;
              })}
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1} className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
