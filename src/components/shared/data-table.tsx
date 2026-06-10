"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchInput } from "./search-input";
import { EmptyState } from "./empty-state";
import { LoadingState } from "./loading-state";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  keyField = "id",
  searchValue = "",
  onSearchChange,
  searchPlaceholder,
  isLoading,
  emptyTitle = "No records found",
  emptyDescription,
  pageSize = 15,
  actions,
  toolbar,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) return <ChevronsUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    );
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {(onSearchChange || toolbar) && (
        <div className="flex items-center gap-3">
          {onSearchChange && (
            <div className="max-w-sm flex-1">
              <SearchInput
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={onSearchChange}
              />
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
          {actions && <div className="ml-auto">{actions}</div>}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      col.sortable && "cursor-pointer select-none",
                      col.className
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center">
                      {col.header}
                      {col.sortable && <SortIcon columnKey={col.key} />}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32">
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((item) => (
                  <TableRow key={String((item as Record<string, unknown>)[keyField])}>
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-slate-500">
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  variant={i === page ? "default" : "outline"}
                  size="sm"
                  className={cn(i === page && "bg-teal-600 hover:bg-teal-700")}
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
