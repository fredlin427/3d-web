"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Eye, EyeOff, ChevronUp, ChevronDown, Plus, Settings2, Check, X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldConfig {
  key: string;
  label: string;
  section: string;
  type: string;
  options?: string;
  required?: boolean;
}

interface StoredField {
  id: string;
  type: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
}

interface FormFieldEditorProps {
  settingsType: string; // "case_form_field" | "material_form_field" | "apply_form_field"
  fieldRegistry: Record<string, FieldConfig>;
  children: (editMode: boolean, fields: FieldConfig[], refresh: () => void) => React.ReactNode;
}

export function useFormEditor(settingsType: string) {
  const [editMode, setEditMode] = useState(false);
  const [fields, setFields] = useState<StoredField[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFields = useCallback(() => {
    fetch(`/api/settings?type=${settingsType}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setFields(j.data.sort((a: StoredField, b: StoredField) => a.sortOrder - b.sortOrder));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [settingsType]);

  useEffect(() => { fetchFields(); }, [fetchFields]);

  const updateField = async (id: string, data: Partial<StoredField>) => {
    const field = fields.find((f) => f.id === id);
    if (!field) return;
    await fetch(`/api/settings/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...field, ...data }),
    });
    fetchFields();
  };

  const toggleActive = (id: string) => {
    const f = fields.find((x) => x.id === id);
    if (f) updateField(id, { isActive: !f.isActive });
  };

  const moveField = (id: string, dir: -1 | 1) => {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const target = fields[idx + dir];
    if (!target) return;
    const current = fields[idx];
    updateField(current.id, { sortOrder: target.sortOrder });
    updateField(target.id, { sortOrder: current.sortOrder });
  };

  const renameField = (id: string, value: string) => {
    updateField(id, { value });
  };

  const addField = async (key: string) => {
    await fetch("/api/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: settingsType, value: key, sortOrder: fields.length + 1, isActive: true }),
    });
    fetchFields();
    toast.success("Field added");
  };

  return { editMode, setEditMode, fields, loading, toggleActive, moveField, renameField, addField, fetchFields };
}

// Inline field editor bar shown when edit mode is on
export function FieldEditBar({
  fieldKey, label, visible, onToggle, onMoveUp, onMoveDown, onRename, isFirst, isLast,
}: {
  fieldKey: string; label: string; visible: boolean;
  onToggle: () => void; onMoveUp: () => void; onMoveDown: () => void;
  onRename: (newKey: string) => void; isFirst: boolean; isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(fieldKey);

  return (
    <div className="flex items-center gap-1 mb-1 px-1">
      <button onClick={onMoveUp} disabled={isFirst} className="text-slate-400 hover:text-slate-600 disabled:opacity-20 p-0.5"><ChevronUp className="h-3 w-3" /></button>
      <button onClick={onMoveDown} disabled={isLast} className="text-slate-400 hover:text-slate-600 disabled:opacity-20 p-0.5"><ChevronDown className="h-3 w-3" /></button>
      <span className="text-[10px] text-slate-400 font-mono flex-1 truncate px-1" title={fieldKey}>
        {editing ? (
          <span className="flex items-center gap-1">
            <Input value={editVal} onChange={(e) => setEditVal(e.target.value)} className="h-5 text-[10px] w-24 px-1 py-0" autoFocus onKeyDown={(e) => { if (e.key === "Enter") { onRename(editVal); setEditing(false); } if (e.key === "Escape") setEditing(false); }} />
            <Check className="h-3 w-3 text-green-500 cursor-pointer" onClick={() => { onRename(editVal); setEditing(false); }} />
            <X className="h-3 w-3 text-slate-400 cursor-pointer" onClick={() => setEditing(false)} />
          </span>
        ) : (
          <span className="cursor-pointer hover:text-indigo-500" onClick={() => { setEditVal(fieldKey); setEditing(true); }}>{fieldKey}</span>
        )}
      </span>
      <button onClick={onToggle} className="p-0.5" title={visible ? "Hide" : "Show"}>
        {visible ? <Eye className="h-3.5 w-3.5 text-slate-400" /> : <EyeOff className="h-3.5 w-3.5 text-slate-300" />}
      </button>
    </div>
  );
}
