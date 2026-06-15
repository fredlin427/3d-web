"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { caseFormSchema, CaseFormValues } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboBox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Settings2, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { ImageUpload } from "@/components/shared/image-upload";
import { CASE_FIELD_REGISTRY, CASE_SECTION_ORDER, FieldDef } from "@/lib/field-registry";
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

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema) as any,
    defaultValues: defaultValues || { applicationDate: new Date().toISOString().split("T")[0], hospital: "QEH", priority: "Routine", currentStatus: "Draft", quantity: 1, totalComponents: 1 },
  });

  const selectedCategory = watch("category");
  const [editMode, setEditMode] = useState(false);
  const [allSettings, setAllSettings] = useState<any[]>([]);
  const [optionsMap, setOptionsMap] = useState<Record<string, string[]>>(BASE_OPTIONS);
  const [defaultSettings, setDefaultSettings] = useState<any[]>([]);
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const pushHistory = (settings: any[]) => {
    const newHistory = history.slice(0, historyIdx + 1);
    newHistory.push(JSON.parse(JSON.stringify(settings)));
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
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
        const label = parts[1] || "Custom Field";
        const type = (parts[2] || "text") as FieldDef["type"];
        const section = parts[3] || "Additional";
        fields.push({ key: val, label, section, type });
      } else if (CASE_FIELD_REGISTRY[val]) {
        fields.push({ ...CASE_FIELD_REGISTRY[val] });
      }
    }
    setOrderedFields(fields);
  };

  // Load field configuration from Settings
  useEffect(() => {
    fetch("/api/settings?type=case_form_field")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setAllSettings(j.data);
          setDefaultSettings(JSON.parse(JSON.stringify(j.data)));
          setHistory([JSON.parse(JSON.stringify(j.data))]);
          setHistoryIdx(0);
          const activeKeys: string[] = j.data
            .filter((s: { isActive: boolean }) => s.isActive)
            .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
            .map((s: { value: string }) => s.value.trim());

          // Map keys to field definitions, fallback to registry if value IS a key
          const fields: FieldDef[] = [];
          for (const keyOrSpec of activeKeys) {
            // Check if it's a custom field spec: "custom::Label::type::section"
            if (keyOrSpec.startsWith("custom::")) {
              const parts = keyOrSpec.split("::");
              const label = parts[1] || "Custom Field";
              const type = (parts[2] || "text") as FieldDef["type"];
              const section = parts[3] || "Additional";
              fields.push({ key: keyOrSpec, label, section, type });
            } else if (CASE_FIELD_REGISTRY[keyOrSpec]) {
              fields.push({ ...CASE_FIELD_REGISTRY[keyOrSpec] });
            }
          }
          setOrderedFields(fields);
        }
      })
      .catch(() => {});
  }, []);

  // Load all option settings for combobox fields (sync with Settings page)
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const map = { ...BASE_OPTIONS };
          for (const item of j.data) {
            if (item.isActive && item.type !== "case_form_field" && item.type !== "material_form_field" && item.type !== "apply_form_field") {
              if (!map[item.type]) map[item.type] = [];
              if (!map[item.type].includes(item.value)) map[item.type].push(item.value);
            }
          }
          setOptionsMap(map);
        }
      })
      .catch(() => {});
  }, []);

  // Refresh options when a new option is created via any ComboBox
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

  // Group by section, preserving order
  // === EDIT MODE HELPERS ===
  const refreshFields = async () => {
    const res = await fetch("/api/settings?type=case_form_field").then((r) => r.json());
    if (res.success) {
      setAllSettings(res.data);
      pushHistory(res.data);
      await applySettings(res.data);
    }
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
  };
  const editField = async (oldValue: string, newKey: string) => {
    const entry = allSettings.find((s: any) => s.value === oldValue);
    if (!entry || oldValue === newKey) { setEditingField(null); return; }
    const updated = { ...entry, value: newKey };
    await fetch(`/api/settings/${entry.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    const newSettings = allSettings.map((s: any) => s.id === entry.id ? updated : s);
    setAllSettings(newSettings);
    pushHistory(newSettings);
    await applySettings(newSettings);
    const newLabel = newKey.startsWith("custom::") ? newKey.split("::")[1] : (CASE_FIELD_REGISTRY[newKey]?.label || newKey);
    toast.success(`Changed: ${newLabel}`);
    setEditingField(null);
  };
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<string | null>(null);

  const parseFieldValue = (val: string, currentSection: string) => {
    if (val.startsWith("custom::")) {
      const parts = val.split("::");
      return { key: val, label: parts[1] || "", type: (parts[2] || "text") as FieldDef["type"], section: parts[3] || currentSection, isCustom: true };
    }
    const reg = CASE_FIELD_REGISTRY[val];
    if (reg) return { key: val, label: reg.label, type: reg.type, section: reg.section, isCustom: false };
    return { key: val, label: val, type: "text" as FieldDef["type"], section: currentSection, isCustom: false };
  };

  const updateFieldLabel = async (settingKey: string, newLabel: string) => {
    const trimmed = newLabel.trim();
    if (!trimmed || trimmed === parseFieldValue(settingKey, CASE_SECTION_ORDER[0]).label) { setEditingLabel(null); return; }
    const setting = allSettings.find((s: any) => s.value === settingKey);
    if (!setting) { toast.error("Field not found"); setEditingLabel(null); return; }
    try {
      const parsed = parseFieldValue(setting.value, CASE_SECTION_ORDER[0]);
      const newValue = `custom::${trimmed}::${parsed.type}::${parsed.section}`;
      const u = { type: setting.type, value: newValue, sortOrder: setting.sortOrder, isActive: setting.isActive };
      const res = await fetch(`/api/settings/${setting.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
      if (!res.ok) throw new Error("Failed");
      const ns = allSettings.map((s: any) => s.id === setting.id ? { ...s, value: newValue } : s);
      setAllSettings(ns); pushHistory(ns); await applySettings(ns);
      toast.success(`Renamed: ${trimmed}`);
    } catch { toast.error("Failed to rename field"); }
    setEditingLabel(null);
  };

  const updateFieldType = async (settingKey: string, newType: FieldDef["type"]) => {
    const setting = allSettings.find((s: any) => s.value === settingKey);
    if (!setting) { toast.error("Field not found"); setEditingType(null); return; }
    try {
      const parsed = parseFieldValue(setting.value, CASE_SECTION_ORDER[0]);
      if (parsed.type === newType) { setEditingType(null); return; }
      const newValue = `custom::${parsed.label}::${newType}::${parsed.section}`;
      const u = { type: setting.type, value: newValue, sortOrder: setting.sortOrder, isActive: setting.isActive };
      const res = await fetch(`/api/settings/${setting.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
      if (!res.ok) throw new Error("Failed");
      const ns = allSettings.map((s: any) => s.id === setting.id ? { ...s, value: newValue } : s);
      setAllSettings(ns); pushHistory(ns); await applySettings(ns);
      toast.success(`Type changed: ${parsed.label} → ${newType}`);
    } catch { toast.error("Failed to change type"); }
    setEditingType(null);
  };
  const moveFieldUp = async (fieldKey: string) => {
    const sorted = [...allSettings].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((s: any) => s.value === fieldKey);
    if (idx <= 0) return;
    const cur = sorted[idx], prev = sorted[idx - 1];
    await fetch(`/api/settings/${cur.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cur, sortOrder: prev.sortOrder }) });
    await fetch(`/api/settings/${prev.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...prev, sortOrder: cur.sortOrder }) });
    const newSettings = allSettings.map((s: any) => s.id === cur.id ? { ...cur, sortOrder: prev.sortOrder } : s.id === prev.id ? { ...prev, sortOrder: cur.sortOrder } : s);
    setAllSettings(newSettings);
    pushHistory(newSettings);
    await applySettings(newSettings);
  };
  const moveFieldDown = async (fieldKey: string) => {
    const sorted = [...allSettings].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((s: any) => s.value === fieldKey);
    if (idx < 0 || idx >= sorted.length - 1) return;
    const cur = sorted[idx], next = sorted[idx + 1];
    await fetch(`/api/settings/${cur.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cur, sortOrder: next.sortOrder }) });
    await fetch(`/api/settings/${next.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...next, sortOrder: cur.sortOrder }) });
    const newSettings = allSettings.map((s: any) => s.id === cur.id ? { ...cur, sortOrder: next.sortOrder } : s.id === next.id ? { ...next, sortOrder: cur.sortOrder } : s);
    setAllSettings(newSettings);
    pushHistory(newSettings);
    await applySettings(newSettings);
  };
  const addNewField = async (fieldInput: string, sectionName: string) => {
	    // Try to match as "key — Label" dropdown selection first
	    const registryKey = fieldInput.includes(" — ") ? fieldInput.split(" — ")[0] : null;
	    const fieldDef = registryKey ? CASE_FIELD_REGISTRY[registryKey] : null;

	    if (fieldDef) {
	      // Existing registry field — reactivate or create
	      const existing = allSettings.find((s: any) => s.value === registryKey);
	      if (existing) {
	        if (existing.isActive) { toast.info(`${fieldDef.label} is already visible`); return; }
	        const updated = { ...existing, isActive: true };
	        await fetch(`/api/settings/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
	        const newSettings = allSettings.map((s: any) => s.id === existing.id ? updated : s);
	        setAllSettings(newSettings); pushHistory(newSettings); await applySettings(newSettings);
	        toast.success(`Shown: ${fieldDef.label}`);
	        return;
	      }

	      const lastInSection = allSettings.filter((s: any) => {
	        const reg = CASE_FIELD_REGISTRY[s.value];
	        return reg && reg.section === fieldDef.section;
	      });
	      const maxSort = lastInSection.length > 0 ? Math.max(...lastInSection.map((s: any) => s.sortOrder)) : allSettings.length;

	      const newEntry = { id: `temp-${Date.now()}`, type: "case_form_field", value: registryKey, sortOrder: maxSort + 1, isActive: true };
	      const updatedSettings = [...allSettings, newEntry];
	      setAllSettings(updatedSettings); pushHistory(updatedSettings); await applySettings(updatedSettings);

	      const postRes = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "case_form_field", value: registryKey, sortOrder: maxSort + 1, isActive: true }) });
	      if (!postRes.ok) { toast.error("Failed to save field"); return; }
	      toast.success(`Added: ${fieldDef.label} → ${fieldDef.section}`);
	    } else {
	      // Custom field: user typed a new field name — create as custom:text
	      const label = fieldInput.trim();
	      if (!label) return;
	      const customValue = `custom::${label}::text::${sectionName}`;

	      const existing = allSettings.find((s: any) => s.value === customValue);
	      if (existing) {
	        if (existing.isActive) { toast.info(`${label} is already visible`); return; }
	        const updated = { ...existing, isActive: true };
	        await fetch(`/api/settings/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
	        const newSettings = allSettings.map((s: any) => s.id === existing.id ? updated : s);
	        setAllSettings(newSettings); pushHistory(newSettings); await applySettings(newSettings);
	        toast.success(`Shown: ${label}`);
	        return;
	      }

	      const lastInSection = allSettings.filter((s: any) => s.value.startsWith("custom:") && s.value.endsWith(`:${sectionName}`));
	      const maxSort = lastInSection.length > 0 ? Math.max(...lastInSection.map((s: any) => s.sortOrder)) : allSettings.length;

	      const newEntry = { id: `temp-${Date.now()}`, type: "case_form_field", value: customValue, sortOrder: maxSort + 1, isActive: true };
	      const updatedSettings = [...allSettings, newEntry];
	      setAllSettings(updatedSettings); pushHistory(updatedSettings); await applySettings(updatedSettings);

	      const postRes = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "case_form_field", value: customValue, sortOrder: maxSort + 1, isActive: true }) });
	      if (!postRes.ok) { toast.error("Failed to save field"); return; }
	      toast.success(`Added custom field: ${label} → ${sectionName}`);
	    }

	    // Refresh from server to get real IDs
	    const res = await fetch("/api/settings?type=case_form_field").then((r) => r.json());
	    if (res.success) { setAllSettings(res.data); await applySettings(res.data); }
	  };

  const sections = CASE_SECTION_ORDER.map((secName) => ({
    name: secName,
    fields: orderedFields.filter((f) => f.section === secName),
  })).filter((s) => s.fields.length > 0);

  const onSubmit = async (data: CaseFormValues) => {
    setSaving(true);
    try {
      const url = isEditing ? `/api/cases/${caseId}` : "/api/cases";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (res.ok) { const json = await res.json(); toast.success(isEditing ? "Case updated" : "Case created"); router.push(isEditing ? `/cases/${caseId}` : `/cases/${json.data.id}`); }
      else { const err = await res.json(); toast.error(err.error || "Failed to save case"); }
    } catch { toast.error("Failed to save case"); }
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
        return wrapper(<Textarea {...register(key as any)} rows={field.key === "serviceRequirements" ? 2 : 3} placeholder={field.placeholder} />);

      case "number":
        return wrapper(<Input type="number" {...register(key as any)} min={1} />);

      case "combobox":
        const opt = isPurposeField && selectedCategory && PURPOSES[selectedCategory]
          ? PURPOSES[selectedCategory]
          : (field.options ? (optionsMap[field.options] || BASE_OPTIONS[field.options] || []) : []);
        return (
          <div className="space-y-2" key={field.key}>
            <Label>{field.label}{field.required ? " *" : ""}</Label>
            <Controller name={key as any} control={control}
              render={({ field: f }) => (
                <ComboBox
                  value={(f.value as string) || ""}
                  onChange={f.onChange}
                  options={opt}
                  placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
                  settingsType={field.options}
                  disabled={isPurposeField && !selectedCategory}
                />
              )}
            />
            {(errors as any)[key] && <p className="text-xs text-red-500">{(errors as any)[key]?.message}</p>}
          </div>
        );

      case "image":
        return (
          <div className="space-y-2" key={field.key}>
            <Label>{field.label}{field.required ? " *" : ""}</Label>
            <Controller name={key as any} control={control}
              render={({ field: f }) => <ImageUpload value={(f.value as string) || ""} onChange={f.onChange} />}
            />
          </div>
        );
      default: // text
        return wrapper(<Input {...register(key as any)} placeholder={field.placeholder} />);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Edit Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {editMode && (
            <>
              <Button type="button" variant="outline" size="sm" className="text-xs gap-1" onClick={undo} disabled={historyIdx <= 0}>↶ Undo</Button>
              <Button type="button" variant="outline" size="sm" className="text-xs gap-1" onClick={redo} disabled={historyIdx >= history.length - 1}>↷ Redo</Button>
              <Button type="button" variant="outline" size="sm" className="text-xs text-red-500" onClick={resetToDefault}>Reset to default</Button>
            </>
          )}
        </div>
        <Button type="button" variant={editMode ? "default" : "outline"} size="sm" className="gap-2" onClick={async () => {
          if (!editMode) {
            // Refresh from server when entering edit mode (sync with Settings page)
            const res = await fetch("/api/settings?type=case_form_field").then((r) => r.json());
            if (res.success) {
              setAllSettings(res.data);
              setHistory([JSON.parse(JSON.stringify(res.data))]);
              setHistoryIdx(0);
              await applySettings(res.data);
            }
          }
          setEditMode(!editMode); setEditingField(null); setEditingLabel(null); setEditingType(null);
        }}>
          <Settings2 className="h-4 w-4" />
          {editMode ? "Done Editing" : "Edit Layout"}
        </Button>
      </div>

      {sections.map((section) => (
        <Card key={section.name} className={cn("overflow-visible", editMode && "ring-2 ring-indigo-200")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{section.name}</CardTitle>
            {editMode && <p className="text-[11px] text-slate-400">↑↓ reorder, trash to remove, add fields at bottom</p>}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.fields.map((field) => (
                <div key={field.key} className={cn("relative", editMode && "rounded-lg border-2 border-dashed border-slate-200 p-3 hover:border-indigo-300 transition-colors")}>
                  {editMode && (
                    <div className="flex items-center gap-1 mb-2 bg-slate-50 rounded-lg px-2 py-1 flex-wrap">
                      <button type="button" onClick={() => moveFieldUp(field.key)} className="text-slate-500 hover:text-slate-700 p-0.5"><ChevronUp className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => moveFieldDown(field.key)} className="text-slate-500 hover:text-slate-700 p-0.5"><ChevronDown className="h-3.5 w-3.5" /></button>
                      {/* Key (click to replace) */}
                      {editingField === field.key ? (
                        <ComboBox value="" onChange={(v) => { if (v) { const nk = v.split(" — ")[0]; if (CASE_FIELD_REGISTRY[nk]) editField(field.key, nk); } }}
                          options={Object.keys(CASE_FIELD_REGISTRY).filter((k) => k !== field.key).map((k) => `${k} — ${CASE_FIELD_REGISTRY[k].label}`)}
                          placeholder="Replace..." className="min-w-[120px]" />
                      ) : (
                        <button type="button" onClick={() => setEditingField(field.key)}
                          className="text-[10px] font-mono text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded px-1 py-0.5 transition-colors shrink-0" title="Replace field">
                          {field.key.startsWith("custom::") ? "custom" : field.key}
                        </button>
                      )}
                      {/* Type selector — always visible in edit mode */}
                      <select value={field.type} onChange={(e) => updateFieldType(field.key, e.target.value as FieldDef["type"])}
                        className={cn("text-[10px] px-1 py-0.5 rounded font-medium border cursor-pointer shrink-0",
                          field.type==="combobox"?"bg-purple-100 text-purple-700 border-purple-200":field.type==="checkbox"?"bg-amber-100 text-amber-700 border-amber-200":field.type==="date"?"bg-blue-100 text-blue-700 border-blue-200":field.type==="number"?"bg-teal-100 text-teal-700 border-teal-200":field.type==="textarea"?"bg-pink-100 text-pink-700 border-pink-200":field.type==="image"?"bg-cyan-100 text-cyan-700":"bg-slate-100 text-slate-600 border-slate-200")}>
                        {(["text","combobox","checkbox","date","number","textarea","image"] as FieldDef["type"][]).map((t) => (<option key={t} value={t}>{t}</option>))}
                      </select>
                      {/* Label input — always editable in edit mode */}
                      <input type="text" defaultValue={field.label}
                        onBlur={(e) => updateFieldLabel(field.key, e.target.value)}
                        onKeyDown={(e) => { if (e.key==="Enter") { e.preventDefault(); updateFieldLabel(field.key, (e.target as HTMLInputElement).value); } }}
                        className="text-xs font-medium text-slate-700 border-b-2 border-slate-200 focus:border-indigo-400 outline-none px-1 min-w-[80px] bg-transparent"
                        placeholder="Field name" />
                      <button type="button" onClick={() => removeField(field.key)} className="p-0.5 shrink-0 ml-auto" title="Remove"><Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" /></button>
                    </div>
                  )}
                  {renderField(field)}
                </div>
              ))}
              {/* Add field button when in edit mode */}
              {editMode && (
                <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-6 min-h-[80px]">
                  <ComboBox
                    value=""
                    onChange={(v) => { if (v) addNewField(v, section.name); }}
                    options={Object.keys(CASE_FIELD_REGISTRY).filter((k) => !orderedFields.find((f) => f.key === k)).map((k) => `${k} — ${CASE_FIELD_REGISTRY[k].label}`)}
                    placeholder="Type or select field..."
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Case" : "Create Case"}
        </Button>
      </div>
    </form>
  );
}
