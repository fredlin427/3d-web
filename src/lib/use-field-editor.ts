"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

// Generic setting item shape used by all form editors
export interface SettingItem {
  id: string;
  type: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
}

/**
 * Shared undo/redo history for form field editing.
 * Used identically by case-form, material-form, settings, and apply-manage.
 */
export function useUndoHistory() {
  const [history, setHistory] = useState<SettingItem[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const pushHistory = useCallback((settings: SettingItem[]) => {
    setHistory((prev) => {
      const h = prev.slice(0, historyIdx + 1);
      h.push(JSON.parse(JSON.stringify(settings)));
      if (h.length > 50) h.shift();
      return h;
    });
    setHistoryIdx((prev) => {
      const hLen = history.slice(0, prev + 1).length + 1;
      return Math.min(hLen + 1, 50) - 1;
    });
  }, [historyIdx, history]); // eslint-disable-line react-hooks/exhaustive-deps

  const undo = useCallback(
    (applyFn: (s: SettingItem[]) => void) => {
      if (historyIdx <= 0) return;
      const newIdx = historyIdx - 1;
      setHistoryIdx(newIdx);
      applyFn(history[newIdx]);
      toast("Undo");
    },
    [historyIdx, history]
  );

  const redo = useCallback(
    (applyFn: (s: SettingItem[]) => void) => {
      if (historyIdx >= history.length - 1) return;
      const newIdx = historyIdx + 1;
      setHistoryIdx(newIdx);
      applyFn(history[newIdx]);
      toast("Redo");
    },
    [historyIdx, history]
  );

  const resetHistory = useCallback((settings: SettingItem[]) => {
    const clone = JSON.parse(JSON.stringify(settings));
    setHistory([clone]);
    setHistoryIdx(0);
  }, []);

  return { history, historyIdx, pushHistory, undo, redo, resetHistory, setHistory, setHistoryIdx };
}

// ─── Shared field-editing API helpers ──────────────────────────

/** Swap sortOrder of two settings (parallel PUTs) */
export async function swapSortOrders(a: SettingItem, b: SettingItem) {
  await Promise.all([
    fetch(`/api/settings/${a.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, sortOrder: b.sortOrder }),
    }),
    fetch(`/api/settings/${b.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...b, sortOrder: a.sortOrder }),
    }),
  ]);
}

/** Toggle isActive off (soft-delete) for a setting */
export async function deactivateSetting(item: SettingItem) {
  await fetch(`/api/settings/${item.id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: item.type, value: item.value, sortOrder: item.sortOrder, isActive: false }),
  });
}

/** Create a new setting and return it with server-assigned ID */
export async function createSetting(type: string, value: string, sortOrder: number): Promise<SettingItem> {
  const res = await fetch("/api/settings", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, value, sortOrder, isActive: true }),
  });
  const json = await res.json();
  if (!json.success) throw new Error("Failed to create setting");
  return json.data as SettingItem;
}

/** Fetch settings by type */
export async function fetchSettings(type: string): Promise<SettingItem[]> {
  const res = await fetch(`/api/settings?type=${type}`);
  const json = await res.json();
  return json.success ? json.data : [];
}
