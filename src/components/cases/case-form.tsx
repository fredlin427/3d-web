"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { caseFormSchema, CaseFormValues } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboBox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { ImageUpload } from "@/components/shared/image-upload";
import { CASE_FIELD_REGISTRY, CASE_SECTION_ORDER, FieldDef } from "@/lib/field-registry";
import { FieldCard } from "@/components/shared/field-card";
import { AddFieldModal } from "@/components/shared/add-field-modal";
import { FormLayoutToolbar } from "@/components/shared/form-layout-toolbar";
import {
  DEPARTMENTS, CATEGORIES, PURPOSES, MODEL_TYPES, OWNERSHIP_TYPES,
  SERVICE_OPTIONS, STERILIZATION_OPTIONS, RANKS, HOSPITALS,
  TECHNICIANS, PRINTING_PARTIES,
} from "@/lib/constants";

const BASE_OPTIONS: Record<string, string[]> = {
  department: [...DEPARTMENTS], case_category: [...CATEGORIES],
  model_type: [...MODEL_TYPES], ownership: [...OWNERSHIP_TYPES],
  service_option: [...SERVICE_OPTIONS], sterilization: [...STERILIZATION_OPTIONS],
  rank: [...RANKS], hospital: [...HOSPITALS], technician: [...TECHNICIANS],
  printing_party: [...PRINTING_PARTIES],
  priority: ["Routine", "Urgent", "High priority"],
  case_status: ["Draft", "In progress", "On hold", "Completed", "Cancelled"],
};

interface CaseFormProps {
  defaultValues?: Partial<CaseFormValues>;
  isEditing?: boolean;
  caseId?: string;
}

export function CaseForm({ defaultValues, isEditing, caseId }: CaseFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [orderedFields, setOrderedFields] = useState<FieldDef[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalSection, setAddModalSection] = useState("");

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema) as any,
    defaultValues: defaultValues || { applicationDate: new Date().toISOString().split("T")[0], hospital: "QEH", priority: "Routine", currentStatus: "Draft", quantity: 1, totalComponents: 1 },
  });

  const selectedCategory = watch("category");
  const [allSettings, setAllSettings] = useState<any[]>([]);
  const [optionsMap, setOptionsMap] = useState<Record<string, string[]>>(BASE_OPTIONS);
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const pushHistory = (settings: any[]) => {
    const newHistory = history.slice(0, historyIdx + 1);
    newHistory.push(JSON.parse(JSON.stringify(settings)));
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
  };

  const applySettings = async (settings: any[]) => {
    const active = settings.filter((s: any) => s.isActive).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    const fields: FieldDef[] = [];
    const seen = new Set<string>();
    for (const item of active) {
      const val = item.value.trim();
      if (seen.has(val)) continue;
      seen.add(val);
      if (val.startsWith("custom::")) {
        const parts = val.split("::");
        fields.push({ key: val, label: parts[1] || "Custom Field", section: parts[3] || "Additional", type: (parts[2] || "text") as FieldDef["type"] });
      } else if (CASE_FIELD_REGISTRY[val]) {
        fields.push({ ...CASE_FIELD_REGISTRY[val] });
      }
    }
    setOrderedFields(fields);
  };

  // ─── Load field configuration ────────────────────────────────────
  useEffect(() => {
    fetch("/api/settings?type=case_form_field")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setAllSettings(j.data);
          setHistory([JSON.parse(JSON.stringify(j.data))]);
          setHistoryIdx(0);
          const active = j.data.filter((s: any) => s.isActive).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
          const fields: FieldDef[] = [];
          for (const item of active) {
            const val = item.value.trim();
            if (val.startsWith("custom::")) {
              const parts = val.split("::");
              fields.push({ key: val, label: parts[1] || "Custom Field", section: parts[3] || "Additional", type: (parts[2] || "text") as FieldDef["type"] });
            } else if (CASE_FIELD_REGISTRY[val]) {
              fields.push({ ...CASE_FIELD_REGISTRY[val] });
            }
          }
          setOrderedFields(fields);
        }
      })
      .catch(() => {});
  }, []);

  // Load all option settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const map = { ...BASE_OPTIONS };
          for (const item of j.data) {
            if (item.isActive && !item.type.endsWith("_form_field") && item.type !== "progress_step") {
              if (!map[item.type]) map[item.type] = [];
              if (!map[item.type].includes(item.value)) map[item.type].push(item.value);
            }
          }
          setOptionsMap(map);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = () => {
      fetch("/api/settings").then((r) => r.json()).then((j) => {
        if (j.success) {
          const map = { ...BASE_OPTIONS };
          for (const item of j.data) {
            if (item.isActive && !item.type.endsWith("_form_field") && item.type !== "progress_step") {
              if (!map[item.type]) map[item.type] = [];
              if (!map[item.type].includes(item.value)) map[item.type].push(item.value);
            }
          }
          setOptionsMap(map);
        }
      }).catch(() => {});
    };
    window.addEventListener("settings-updated", handler);
    return () => window.removeEventListener("settings-updated", handler);
  }, []);

  // ─── Field editing helpers ──────────────────────────────────────

  const refreshFields = async () => {
    const res = await fetch("/api/settings?type=case_form_field").then((r) => r.json());
    if (res.success) {
      setAllSettings(res.data);
      pushHistory(res.data);
      await applySettings(res.data);
    }
    window.dispatchEvent(new Event("form-fields-changed"));
  };

  const undo = async () => {
    if (historyIdx <= 0) return;
    const prev = history[historyIdx - 1];
    setHistoryIdx(historyIdx - 1);
    setAllSettings(prev);
    await applySettings(prev);
  };

  const redo = async () => {
    if (historyIdx >= history.length - 1) return;
    const next = history[historyIdx + 1];
    setHistoryIdx(historyIdx + 1);
    setAllSettings(next);
    await applySettings(next);
  };

  const resetToDefault = async () => {
    const defaultKeys = Object.keys(CASE_FIELD_REGISTRY);
    for (const s of allSettings) {
      const shouldBeActive = defaultKeys.includes(s.value);
      const defaultOrder = defaultKeys.indexOf(s.value);
      await fetch(`/api/settings/${s.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, isActive: shouldBeActive, sortOrder: shouldBeActive ? defaultOrder : s.sortOrder }) });
    }
    const res = await fetch("/api/settings?type=case_form_field").then((r) => r.json());
    if (res.success) {
      setAllSettings(res.data);
      pushHistory(res.data);
      await applySettings(res.data);
    }
    toast.success("Reset to default");
  };

  const removeField = async (fieldKey: string) => {
    const entry = allSettings.find((s: any) => s.value === fieldKey);
    if (!entry) return;
    const ns = allSettings.map((s: any) => s.id === entry.id ? { ...s, isActive: false } : s);
    setAllSettings(ns);
    pushHistory(ns);
    await applySettings(ns);
    await fetch(`/api/settings/${entry.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: entry.type, value: entry.value, sortOrder: entry.sortOrder, isActive: false }) });
    const label = fieldKey.startsWith("custom::") ? fieldKey.split("::")[1] : (CASE_FIELD_REGISTRY[fieldKey]?.label || fieldKey);
    toast.success(`Removed: ${label}`);
    if (expandedField === fieldKey) setExpandedField(null);
    window.dispatchEvent(new Event("form-fields-changed"));
  };

  const handleLabelChange = async (fieldKey: string, newLabel: string) => {
    const setting = allSettings.find((s: any) => s.value === fieldKey);
    if (!setting) return;
    const parsed = fieldKey.startsWith("custom::") ? { label: fieldKey.split("::")[1] || "", type: fieldKey.split("::")[2] || "text", section: fieldKey.split("::")[3] || CASE_SECTION_ORDER[0] }
      : { label: CASE_FIELD_REGISTRY[fieldKey]?.label || fieldKey, type: CASE_FIELD_REGISTRY[fieldKey]?.type || "text", section: CASE_FIELD_REGISTRY[fieldKey]?.section || CASE_SECTION_ORDER[0] };
    const newValue = `custom::${newLabel}::${parsed.type}::${parsed.section}`;
    const u = { type: setting.type, value: newValue, sortOrder: setting.sortOrder, isActive: setting.isActive };
    await fetch(`/api/settings/${setting.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
    const ns = allSettings.map((s: any) => s.id === setting.id ? { ...s, value: newValue } : s);
    setAllSettings(ns); pushHistory(ns); await applySettings(ns);
    toast.success(`Renamed: ${newLabel}`);
    window.dispatchEvent(new Event("form-fields-changed"));
  };

  const handleTypeChange = async (fieldKey: string, newType: FieldDef["type"]) => {
    const setting = allSettings.find((s: any) => s.value === fieldKey);
    if (!setting) return;
    const parsed = fieldKey.startsWith("custom::") ? { label: fieldKey.split("::")[1] || "", section: fieldKey.split("::")[3] || CASE_SECTION_ORDER[0] }
      : { label: CASE_FIELD_REGISTRY[fieldKey]?.label || fieldKey, section: CASE_FIELD_REGISTRY[fieldKey]?.section || CASE_SECTION_ORDER[0] };
    const newValue = `custom::${parsed.label}::${newType}::${parsed.section}`;
    const u = { type: setting.type, value: newValue, sortOrder: setting.sortOrder, isActive: setting.isActive };
    await fetch(`/api/settings/${setting.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
    const ns = allSettings.map((s: any) => s.id === setting.id ? { ...s, value: newValue } : s);
    setAllSettings(ns); pushHistory(ns); await applySettings(ns);
    toast.success(`Type changed: ${parsed.label} → ${newType}`);
    window.dispatchEvent(new Event("form-fields-changed"));
  };

  const moveField = async (fieldKey: string, dir: -1 | 1) => {
    const sorted = [...allSettings].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((s: any) => s.value === fieldKey);
    if (idx < 0 || !sorted[idx + dir]) return;
    const a = sorted[idx], b = sorted[idx + dir];
    await fetch(`/api/settings/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: a.type, value: a.value, sortOrder: b.sortOrder, isActive: a.isActive }) });
    await fetch(`/api/settings/${b.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: b.type, value: b.value, sortOrder: a.sortOrder, isActive: b.isActive }) });
    const ns = allSettings.map((s: any) => s.id === a.id ? { ...s, sortOrder: b.sortOrder } : s.id === b.id ? { ...s, sortOrder: a.sortOrder } : s);
    setAllSettings(ns); pushHistory(ns); await applySettings(ns);
  };

  const addNewField = async (label: string, type: string, sectionName: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    // Check if it matches a registry field
    const registryKey = Object.keys(CASE_FIELD_REGISTRY).find(k => CASE_FIELD_REGISTRY[k].label.toLowerCase() === trimmed.toLowerCase() || k === trimmed);
    if (registryKey) {
      const fieldDef = CASE_FIELD_REGISTRY[registryKey];
      const existing = allSettings.find((s: any) => s.value === registryKey);
      if (existing) {
        if (existing.isActive) { toast.info(`${fieldDef.label} is already visible`); return; }
        const updated = { ...existing, isActive: true };
        await fetch(`/api/settings/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
        const newSettings = allSettings.map((s: any) => s.id === existing.id ? updated : s);
        setAllSettings(newSettings); pushHistory(newSettings); await applySettings(newSettings);
        toast.success(`Shown: ${fieldDef.label}`);
      } else {
        const maxSort = allSettings.length;
        const postRes = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "case_form_field", value: registryKey, sortOrder: maxSort + 1, isActive: true }) });
        if (!postRes.ok) { toast.error("Failed to save field"); return; }
        toast.success(`Added: ${fieldDef.label}`);
        const refresh = await fetch("/api/settings?type=case_form_field").then((r) => r.json());
        if (refresh.success) { setAllSettings(refresh.data); await applySettings(refresh.data); }
      }
    } else {
      // Custom field
      const customValue = `custom::${trimmed}::${type}::${sectionName}`;
      const existing = allSettings.find((s: any) => s.value === customValue);
      if (existing) {
        if (existing.isActive) { toast.info(`${trimmed} is already visible`); return; }
        const updated = { ...existing, isActive: true };
        await fetch(`/api/settings/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
        const newSettings = allSettings.map((s: any) => s.id === existing.id ? updated : s);
        setAllSettings(newSettings); pushHistory(newSettings); await applySettings(newSettings);
        toast.success(`Shown: ${trimmed}`);
      } else {
        const postRes = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "case_form_field", value: customValue, sortOrder: allSettings.length + 1, isActive: true }) });
        if (!postRes.ok) { toast.error("Failed to save field"); return; }
        toast.success(`Added custom field: ${trimmed}`);
        const refresh = await fetch("/api/settings?type=case_form_field").then((r) => r.json());
        if (refresh.success) { setAllSettings(refresh.data); pushHistory(refresh.data); await applySettings(refresh.data); }
      }
    }
    window.dispatchEvent(new Event("form-fields-changed"));
  };

  const sections = CASE_SECTION_ORDER.map((secName) => ({
    name: secName,
    fields: orderedFields.filter((f) => f.section === secName),
  }));

  const onSubmit = async (data: CaseFormValues) => {
    setSaving(true);
    try {
      const url = isEditing ? `/api/cases/${caseId}` : "/api/cases";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (res.ok) { const json = await res.json(); toast.success(isEditing ? "Case updated" : "Case created"); router.push(isEditing ? `/cases/${caseId}` : `/cases/${json.data.id}`); }
      else { const err = await res.json(); toast.error(err.error || "Failed to save case"); }
    } catch (e) { console.error(e); toast.error("Failed to save case"); }
    finally { setSaving(false); }
  };

  const renderField = (field: FieldDef) => {
    const key = field.key as keyof CaseFormValues;
    const isPurposeField = key === "purpose";

    const wrapper = (children: React.ReactNode) => (
      <div className="space-y-2" key={field.key}>
        <Label>{field.label}{field.required ? " *" : ""}</Label>
        {children}
        {(errors as any)[key] && <p className="text-xs text-red-500">{(errors as any)[key]?.message}</p>}
      </div>
    );

    switch (field.type) {
      case "checkbox":
        return (
          <div className="space-y-2" key={field.key}>
            <div className="flex items-center gap-3 pt-6">
              <Controller name={key as any} control={control} render={({ field: f }) => (
                <Switch checked={f.value === "Yes"} onCheckedChange={(v) => f.onChange(v ? "Yes" : "No")} />
              )} />
              <Label>{field.label}{field.required ? " *" : ""}</Label>
            </div>
          </div>
        );
      case "date":
        return wrapper(<Input type="date" {...register(key as any)} />);
      case "textarea":
        return wrapper(<Textarea {...register(key as any)} rows={3} />);
      case "number":
        return wrapper(<Input type="number" {...register(key as any)} min={1} />);
      case "multiselect": {
        const multiOptions = (field.options || "").split(",").filter(Boolean);
        return (
          <div className="space-y-2" key={field.key}>
            <Label>{field.label}{field.required ? " *" : ""}</Label>
            <Controller name={key as any} control={control}
              render={({ field: f }) => {
                const selected = ((f.value as string) || "").split(",").filter(Boolean);
                return (
                  <div className="flex flex-wrap gap-3">
                    {multiOptions.map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={selected.includes(opt)} onCheckedChange={(checked) => {
                          const next = checked ? [...selected, opt] : selected.filter((v: string) => v !== opt);
                          f.onChange(next.join(","));
                        }} />
                        <span className="text-sm text-slate-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                );
              }}
            />
          </div>
        );
      }
      case "combobox": {
        const opt = isPurposeField && selectedCategory && PURPOSES[selectedCategory]
          ? PURPOSES[selectedCategory]
          : (field.options ? (optionsMap[field.options] || BASE_OPTIONS[field.options] || []) : []);
        return (
          <div className="space-y-2" key={field.key}>
            <Label>{field.label}{field.required ? " *" : ""}</Label>
            <Controller name={key as any} control={control}
              render={({ field: f }) => (
                <ComboBox value={(f.value as string) || ""} onChange={f.onChange} options={opt}
                  placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
                  settingsType={field.options} disabled={isPurposeField && !selectedCategory} />
              )}
            />
          </div>
        );
      }
      case "image":
        return (
          <div className="space-y-2" key={field.key}>
            <Label>{field.label}{field.required ? " *" : ""}</Label>
            <Controller name={key as any} control={control}
              render={({ field: f }) => <ImageUpload value={(f.value as string) || ""} onChange={f.onChange} />}
            />
          </div>
        );
      default:
        return wrapper(<Input {...register(key as any)} placeholder={field.placeholder} />);
    }
  };

  const totalFields = orderedFields.length;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ─── Mode toggle ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div />
        <button
          type="button"
          onClick={async () => {
            if (!editMode) {
              const res = await fetch("/api/settings?type=case_form_field").then((r) => r.json());
              if (res.success) {
                setAllSettings(res.data);
                setHistory([JSON.parse(JSON.stringify(res.data))]);
                setHistoryIdx(0);
                await applySettings(res.data);
              }
            }
            setEditMode(!editMode);
            setExpandedField(null);
          }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            editMode
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600"
          }`}
        >
          {editMode ? "✓ Done" : "✎ Edit Form"}
        </button>
      </div>

      {/* ─── EDIT MODE: Toolbar ────────────────────────────────── */}
      {editMode && (
        <FormLayoutToolbar
          fieldCount={totalFields}
          canUndo={historyIdx > 0}
          canRedo={historyIdx < history.length - 1}
          onUndo={undo}
          onRedo={redo}
          onReset={resetToDefault}
        />
      )}

      {/* ─── Sections ─────────────────────────────────────────── */}
      {sections.map((section) => (
        <Card key={section.name} className={editMode ? "overflow-visible ring-2 ring-blue-100" : "overflow-visible"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{section.name}</CardTitle>
          </CardHeader>
          <CardContent className={editMode ? "space-y-3" : ""}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.fields.map((field, fi) => {
                if (editMode) {
                  const sectionFieldIndices = orderedFields
                    .map((f, i) => f.section === section.name ? i : -1)
                    .filter(i => i >= 0);
                  const idxInSection = sectionFieldIndices.indexOf(
                    orderedFields.findIndex(f => f.key === field.key)
                  );
                  return (
                    <FieldCard
                      key={field.key}
                      field={field}
                      index={idxInSection}
                      totalInSection={section.fields.length}
                      isExpanded={expandedField === field.key}
                      onExpand={() => setExpandedField(expandedField === field.key ? null : field.key)}
                      onRemove={() => removeField(field.key)}
                      onMove={(dir) => moveField(field.key, dir)}
                      onLabelChange={(newLabel) => handleLabelChange(field.key, newLabel)}
                      onTypeChange={(newType) => handleTypeChange(field.key, newType)}
                    >
                      {renderField(field)}
                    </FieldCard>
                  );
                }
                // Fill mode: clean, just the field
                return renderField(field);
              })}
            </div>

            {/* Add field button — only in edit mode */}
            {editMode && (
              <button
                type="button"
                onClick={() => { setAddModalSection(section.name); setAddModalOpen(true); }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors mt-3"
              >
                <Plus className="h-4 w-4" />
                Add field to "{section.name}"
              </button>
            )}
          </CardContent>
        </Card>
      ))}

      {/* ─── Submit ────────────────────────────────────────────── */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Case" : "Create Case"}
        </Button>
      </div>

      {/* ─── Add Field Modal ────────────────────────────────────── */}
      <AddFieldModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={(label, type, section) => addNewField(label, type, section)}
        sections={sections}
        defaultSection={addModalSection}
      />
    </form>
  );
}
