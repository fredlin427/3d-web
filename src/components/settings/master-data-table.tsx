"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Check, X } from "lucide-react";

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
}

export function MasterDataTable({ title, type, items, onRefresh, showReorder }: MasterDataTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          value: newValue.trim(),
          sortOrder: items.length,
          isActive: true,
        }),
      });
      if (res.ok) {
        toast.success("Item added");
        setNewValue("");
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: MasterDataItem) => {
    setEditingId(item.id);
    setEditValue(item.value);
  };

  const handleSaveEdit = async (item: MasterDataItem) => {
    if (!editValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, value: editValue.trim() }),
      });
      if (res.ok) {
        toast.success("Item updated");
        setEditingId(null);
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: MasterDataItem) => {
    try {
      const res = await fetch(`/api/settings/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, isActive: !item.isActive }),
      });
      if (res.ok) {
        toast.success(item.isActive ? "Item deactivated" : "Item activated");
        onRefresh();
      }
    } catch {
      toast.error("Failed to update item");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Item deleted");
        onRefresh();
      }
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const handleMoveUp = async (item: MasterDataItem, index: number) => {
    if (index === 0) return;
    const prevItem = items[index - 1];
    await updateOrder(item, item.sortOrder - 1);
    await updateOrder(prevItem, prevItem.sortOrder + 1);
    onRefresh();
  };

  const handleMoveDown = async (item: MasterDataItem, index: number) => {
    if (index === items.length - 1) return;
    const nextItem = items[index + 1];
    await updateOrder(item, item.sortOrder + 1);
    await updateOrder(nextItem, nextItem.sortOrder - 1);
    onRefresh();
  };

  const updateOrder = async (item: MasterDataItem, sortOrder: number) => {
    await fetch(`/api/settings/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, sortOrder }),
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-700">{title}</h3>

      {/* Add new */}
      <div className="flex gap-2">
        <Input
          placeholder={`Add new ${title.toLowerCase()}...`}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="max-w-xs"
        />
        <Button size="sm" onClick={handleAdd} disabled={saving || !newValue.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {/* Item list */}
      <div className="space-y-1 max-h-80 overflow-y-auto border rounded-lg">
        {items.length === 0 ? (
          <div className="p-4 text-sm text-slate-400 text-center">No items yet</div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 border-b last:border-b-0"
            >
              {showReorder && (
                <div className="flex flex-col gap-0.5 mr-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4"
                    onClick={() => handleMoveUp(item, index)}
                    disabled={index === 0}
                  >
                    <GripVertical className="h-3 w-3" />
                  </Button>
                  {/* Vertical grip icon only; up/down via order buttons */}
                </div>
              )}

              {editingId === item.id ? (
                <>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(item)}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveEdit(item)}>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className={`flex-1 text-sm ${item.isActive ? "" : "text-slate-400 line-through"}`}>
                    {item.value}
                  </span>
                  {showReorder && (
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveUp(item, index)} disabled={index === 0}>
                        <span className="text-xs">↑</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveDown(item, index)} disabled={index === items.length - 1}>
                        <span className="text-xs">↓</span>
                      </Button>
                    </div>
                  )}
                  <Switch checked={item.isActive} onCheckedChange={() => handleToggleActive(item)} className="scale-90" />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
