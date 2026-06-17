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

interface DataTableProps<T> {
  data: T[]; columns: Column<T>[]; keyField?: string;
  searchValue?: string; onSearchChange?: (value: string) => void; searchPlaceholder?: string;
  isLoading?: boolean; emptyTitle?: string; emptyDescription?: string;
  pageSize?: number; actions?: React.ReactNode; toolbar?: React.ReactNode;
}

export function DataTable<T>({ data, columns, keyField = "id", searchValue = "", onSearchChange, searchPlaceholder, isLoading, emptyTitle = "No records", emptyDescription, pageSize = 15, actions, toolbar }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

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

  return (
    <div className="space-y-4">
      {(onSearchChange || toolbar) && (
        <div className="flex items-center gap-3">
          {onSearchChange && <div className="max-w-sm flex-1"><SearchInput placeholder={searchPlaceholder} value={searchValue} onChange={onSearchChange} /></div>}
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
          {actions && <div className="ml-auto">{actions}</div>}
        </div>
      )}

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 bg-slate-50/50 hover:bg-slate-50/50">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn("h-11 text-xs font-semibold uppercase tracking-wider text-slate-500", col.sortable && "cursor-pointer select-none", col.className)}
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
                <TableRow><TableCell colSpan={columns.length} className="h-40"><LoadingState text="Loading..." /></TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={columns.length} className="h-40"><EmptyState title={emptyTitle} description={emptyDescription} /></TableCell></TableRow>
              ) : (
                paged.map((item) => (
                  <TableRow key={String((item as Record<string, unknown>)[keyField])} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors duration-150">
                    {columns.map((col) => (
                      <TableCell key={col.key} className={cn("py-3 text-sm", col.className)}>
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
