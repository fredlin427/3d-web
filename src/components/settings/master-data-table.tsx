"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MasterDataItem {
  id: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
}

interface MasterDataTableProps {
  title: string;
  type: string;
  items: MasterDataItem[];
  onRefresh: () => void;
  showReorder?: boolean;
  displayMap?: Record<string, string>;
}

export function MasterDataTable({ title, type, items, onRefresh, showReorder, displayMap }: MasterDataTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) {
      const input = document.querySelector(`[data-edit-id="${editingId}"]`) as HTMLInputElement;
      input?.focus();
      input?.select();
    }
  }, [editingId]);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value: newValue.trim(), sortOrder: items.length, isActive: true }),
      });
      if (res.ok) {
        toast.success("Added");
        setNewValue("");
        onRefresh();
        addInputRef.current?.focus();
      }
    } finally { setSaving(false); }
  };

  const handleSaveEdit = async (item: MasterDataItem) => {
    if (!editValue.trim() || editValue.trim() === item.value) { setEditingId(null); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, value: editValue.trim() }),
      });
      if (res.ok) { toast.success("Updated"); setEditingId(null); onRefresh(); }
    } finally { setSaving(false); }
  };

  const handleToggle = async (item: MasterDataItem) => {
    try {
      await fetch(`/api/settings/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, isActive: !item.isActive }),
      });
      onRefresh();
    } catch { toast.error("Failed"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/settings/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      onRefresh();
    } catch { toast.error("Failed"); }
  };

  const swapOrder = async (item: MasterDataItem, target: MasterDataItem) => {
    await Promise.all([
      fetch(`/api/settings/${item.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, sortOrder: target.sortOrder }),
      }),
      fetch(`/api/settings/${target.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, sortOrder: item.sortOrder }),
      }),
    ]);
    onRefresh();
  };

  return (
    <div className="space-y-3">
      {/* Add row */}
      <div className="flex gap-2">
        <Input
          ref={addInputRef}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder={`Type new ${title.toLowerCase()} and press Enter...`}
          className="h-9 text-sm border-dashed"
        />
        <Button size="sm" onClick={handleAdd} disabled={saving || !newValue.trim()} variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Spreadsheet-like rows */}
      <div className="rounded-lg border overflow-hidden">
        <div className="flex items-center gap-3 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          {showReorder && <div className="w-8" />}
          <div className="flex-1">Value</div>
          <div className="w-14 text-center">Active</div>
          <div className="w-16" />
        </div>

        {items.length === 0 ? (
          <div className="px-3 py-8 text-sm text-slate-400 text-center">No items. Type above to add.</div>
        ) : (
          <div className="divide-y">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-1.5 transition-colors hover:bg-blue-50/30",
                  !item.isActive && "opacity-50"
                )}
              >
                {showReorder && (
                  <div className="flex gap-0.5 w-8">
                    <button className="text-slate-400 hover:text-slate-600 disabled:opacity-20" onClick={() => index > 0 && swapOrder(item, items[index - 1])} disabled={index === 0}>↑</button>
                    <button className="text-slate-400 hover:text-slate-600 disabled:opacity-20" onClick={() => index < items.length - 1 && swapOrder(item, items[index + 1])} disabled={index === items.length - 1}>↓</button>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-1">
                      <Input data-edit-id={item.id} value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 text-sm" onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(item); if (e.key === "Escape") setEditingId(null); }} onBlur={() => handleSaveEdit(item)} />
                    </div>
                  ) : (
                    <span className={cn("block text-sm py-1.5 px-2 rounded cursor-pointer select-none", "hover:bg-slate-100", !item.isActive && "line-through")} onDoubleClick={() => { setEditingId(item.id); setEditValue(item.value); }} title="Double-click to edit">
                      {displayMap?.[item.value] || item.value}
                    </span>
                  )}
                </div>

                <div className="w-14 flex justify-center">
                  <Switch checked={item.isActive} onCheckedChange={() => handleToggle(item)} className="scale-75" />
                </div>

                <div className="w-16 flex justify-end">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => handleDelete(item.id)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
