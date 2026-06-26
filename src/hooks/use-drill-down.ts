"use client";

import { useState, useCallback, useMemo } from "react";
import type { StackedRow } from "@/components/charts/hierarchical-table";

export interface DrillLevel {
  label: string;
  value: number;
  children: { label: string; value: number }[];
  grandTotal: number;
}

interface UseDrillDownOptions {
  stackedData: StackedRow[];
  total: number;
  xField: string;
  stackBy: string;
  baseParams?: URLSearchParams;
}

export function useDrillDown(opts: UseDrillDownOptions) {
  const [path, setPath] = useState<DrillLevel[]>([]);
  const [activeSliceIndex, setActiveSliceIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const isOpen = path.length > 0;
  const currentLevel = path.length > 0 ? path[path.length - 1] : null;

  // Breadcrumbs from path
  const breadcrumbs = useMemo(() => {
    const items: { label: string; onClick: () => void }[] = [
      { label: "All Groups", onClick: reset },
    ];
    path.forEach((level, i) => {
      items.push({
        label: level.label,
        onClick: () => goToLevel(i),
      });
    });
    return items;
  }, [path]);

  function reset() {
    setPath([]);
    setActiveSliceIndex(null);
    setLoading(false);
  }

  function goToLevel(index: number) {
    setPath(prev => prev.slice(0, index + 1));
    if (index < 0) reset();
  }

  /** Push a level from chart click (data already in memory from stackedData) */
  const drillIn = useCallback((item: StackedRow, sliceIndex?: number) => {
    const level: DrillLevel = {
      label: item.label,
      value: item.value,
      children: item.children,
      grandTotal: opts.total,
    };
    setPath(prev => [...prev, level]);
    if (sliceIndex !== undefined) setActiveSliceIndex(sliceIndex);
    else setActiveSliceIndex(null);
  }, [opts.total]);

  /** Fetch deeper data and push a new level */
  const drillDeeper = useCallback(async (child: { label: string; value: number }, drillField: string) => {
    setLoading(true);
    try {
      const params = opts.baseParams ? new URLSearchParams(opts.baseParams) : new URLSearchParams();
      // Accumulate filter params from path + the newly clicked child
      const filters = new Map<string, string[]>();
      for (const level of path) {
        const field = drillField; // use same field for accumulated filters
        if (!filters.has(field)) filters.set(field, []);
        // Actually we need to know which field each level represents...
        // For simplicity: use the stackBy field from the initial opts
      }
      // Add the clicked child as a filter on the current drill field
      params.set(`filter_${drillField}`, child.label);
      // Keep existing date/filter params
      for (const [key, val] of opts.baseParams?.entries() || []) {
        if (key.startsWith("filter_") || key === "dateFrom" || key === "dateTo" || key === "fy") {
          params.set(key, val);
        }
      }
      params.set("x", opts.xField);
      params.set("stackBy", opts.stackBy);
      params.set("limit", "50");
      params.set("source", opts.baseParams?.get("source") || "cases");

      const res = await fetch(`/api/chart-data?${params}`);
      const json = await res.json();
      if (json.success && json.data?.stacked) {
        const newStacked: StackedRow[] = json.data.stacked;
        const newTotal: number = json.data.total;
        // Push the first matching group, or use the child directly
        const found = newStacked.find((s: StackedRow) => s.label === child.label);
        const level: DrillLevel = found
          ? { label: found.label, value: found.value, children: found.children, grandTotal: newTotal }
          : { label: child.label, value: child.value, children: newStacked.flatMap((s: StackedRow) => s.children), grandTotal: newTotal };
        setPath(prev => [...prev, level]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [opts.baseParams, opts.xField, opts.stackBy, path]);

  /** Pop one level, close if at top */
  const drillOut = useCallback(() => {
    setPath(prev => {
      const next = prev.slice(0, -1);
      if (next.length === 0) setActiveSliceIndex(null);
      return next;
    });
  }, []);

  return {
    path,
    currentLevel,
    isOpen,
    breadcrumbs,
    loading,
    activeSliceIndex,
    setActiveSliceIndex,
    drillIn,
    drillDeeper,
    drillOut,
    goToLevel,
    reset,
  };
}
