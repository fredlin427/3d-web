"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { materialFormSchema, MaterialFormValues } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboBox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Loader2, Settings2, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { MATERIAL_FIELD_REGISTRY, MATERIAL_SECTION_ORDER, MATERIAL_CATEGORY_FIELDS, MATERIAL_CATEGORY_SECTION_ORDERS, MATERIAL_CATEGORY_SETTINGS_TYPE, FieldDef } from "@/lib/field-registry";

const BASE_OPTIONS: Record<string, string[]> = {
  fdm_brand: ["3dRe","Ultimaker","Recreus","eSUN","Bambu Lab","Anycubic","Other"],
  fdm_material_type: ["rPET","ABS","PLA","PETG","TPU","Nylon","Other"],
  fdm_unit: ["roll","kg","g","unit"],
  fdm_status: ["New","Opened","Disposed"],
  sla_product: ["Elastic 50A Resin","Tough 1500 Resin","Flexible 80A Resin","Draft Resin","Clear Resin","High Temp Resin","Other"],
  sla_printer: ["Form 3BL","Form 4B","Form 3L","Form 4","Other"],
  sla_unit: ["bottle","cartridge","litre","ml","unit"],
  sla_status: ["New","Opened","Trial Only","Disposed"],
  tank_product: ["Form 3L Resin Tank V2","Form 4 Resin Tank","Other"],
  tank_resin_type: ["Standard","Tough","Elastic","Draft","Clear","High Temp","Other"],
  tank_unit: ["unit"],
  tank_status: ["New","Opened","Disposed"],
  ipa_unit: ["litre","ml","bottle","unit"],
  ipa_status: ["In stock","Opened","Low stock","Expired","Disposed"],
};

// Map each category's combo fields to its own option types (NOT shared)
const CATEGORY_OPTION_OVERRIDES: Record<string, Record<string, string>> = {
  "FDM Filaments": { brand: "fdm_brand", materialType: "fdm_material_type", unit: "fdm_unit", status: "fdm_status" },
  "SLA Resins": { materialType: "sla_product", compatiblePrinter: "sla_printer", unit: "sla_unit", status: "sla_status" },
  "Resin Tanks": { materialName: "tank_product", materialType: "tank_resin_type", unit: "tank_unit", status: "tank_status" },
  "IPA": { unit: "ipa_unit", status: "ipa_status" },
};

interface MaterialFormProps {
  defaultValues?: Partial<MaterialFormValues>;
  isEditing?: boolean;
  materialId?: string;
}

export function MaterialForm({ defaultValues, isEditing, materialId }: MaterialFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [orderedFields, setOrderedFields] = useState<FieldDef[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [allSettings, setAllSettings] = useState<any[]>([]);
  const [optionsMap, setOptionsMap] = useState<Record<string, string[]>>(BASE_OPTIONS);
  const [defaultSettings, setDefaultSettings] = useState<any[]>([]);
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultValues?.category || "");

  const categoryFields = selectedCategory ? MATERIAL_CATEGORY_FIELDS[selectedCategory] : null;
  const categorySectionOrder = selectedCategory ? (MATERIAL_CATEGORY_SECTION_ORDERS[selectedCategory] || MATERIAL_SECTION_ORDER) : MATERIAL_SECTION_ORDER;

  const pushHistory = (s: any[]) => {
    const h = history.slice(0, historyIdx + 1);
    h.push(JSON.parse(JSON.stringify(s)));
    if (h.length > 50) h.shift();
    setHistory(h); setHistoryIdx(h.length - 1);
  };
  const apply = async (s: any[]) => {
    const active = s.filter((x: any) => x.isActive).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    const fields: FieldDef[] = [];
    for (const item of active) {
      const val = item.value.trim();
      if (val.startsWith("custom::")) {
        const parts = val.split("::");
        const label = parts[1] || "Custom Field";
        const type = (parts[2] || "text") as FieldDef["type"];
        const section = parts[3] || "Additional";
        fields.push({ key: val, label, section, type });
      } else if (MATERIAL_FIELD_REGISTRY[val]) {
        if (categoryFields && !categoryFields.includes(val)) continue;
        fields.push({ ...MATERIAL_FIELD_REGISTRY[val] });
      }
    }
    setOrderedFields(fields);
  };

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema) as any,
    defaultValues: defaultValues || { status: "In stock", unit: "unit", initialQuantity: 0, currentQuantity: 0, reorderThreshold: 0 },
  });

  const settingsType = selectedCategory ? (MATERIAL_CATEGORY_SETTINGS_TYPE[selectedCategory] || "material_form_field") : "material_form_field";

  useEffect(() => {
    fetch(`/api/settings?type=${settingsType}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data.length > 0) {
          setAllSettings(j.data);
          setDefaultSettings(JSON.parse(JSON.stringify(j.data)));
          setHistory([JSON.parse(JSON.stringify(j.data))]);
          setHistoryIdx(0);
          apply(j.data);
        } else if (j.success) {
          // No settings yet for this category — seed defaults from MATERIAL_CATEGORY_FIELDS
          const catFields = MATERIAL_CATEGORY_FIELDS[selectedCategory] || [];
          const defaults = catFields.map((key, i) => ({
            id: `default-${key}`,
            type: settingsType,
            value: key,
            sortOrder: i,
            isActive: true,
          }));
          setAllSettings(defaults);
          setDefaultSettings(JSON.parse(JSON.stringify(defaults)));
          setHistory([JSON.parse(JSON.stringify(defaults))]);
          setHistoryIdx(0);
          apply(defaults);
          // Persist defaults to server
          for (const d of defaults) {
            fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: settingsType, value: d.value, sortOrder: d.sortOrder, isActive: true }) }).catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, [settingsType, selectedCategory]);

  // Load all option settings for combobox fields
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

  // Sync category from defaultValues (for edit page where data loads async)
  useEffect(() => {
    if (defaultValues?.category && defaultValues.category !== selectedCategory) {
      setSelectedCategory(defaultValues.category as string);
    }
  }, [defaultValues?.category]);

  // Auto-calculate status from dates (matches Excel Stock Taking logic)
  // Only auto-sets for date-derived states; preserves manual "Low stock" / "Expired"
  const watchedOpenDate = watch("openDate");
  const watchedDisposalDate = watch("disposalDate");
  useEffect(() => {
    const currentStatus = watch("status");
    const defaultNew = (selectedCategory === "FDM Filaments" || selectedCategory === "SLA Resins" || selectedCategory === "Resin Tanks") ? "New" : "In stock";
    const dateStatuses = [defaultNew, "Opened", "Disposed", ""];
    if (!dateStatuses.includes(currentStatus as string)) return;

    if (watchedDisposalDate) {
      setValue("status", "Disposed");
    } else if (watchedOpenDate) {
      setValue("status", "Opened");
    } else if (!currentStatus) {
      setValue("status", defaultNew);
    }
  }, [watchedOpenDate, watchedDisposalDate]);

  // Re-apply field filter when category changes
  useEffect(() => {
    if (selectedCategory && allSettings.length > 0) {
      apply(allSettings);
    }
  }, [selectedCategory]);

  // === EDIT MODE ===
  const refreshFields = async () => {
    const res = await fetch(`/api/settings?type=${settingsType}`).then((r) => r.json());
    if (res.success) { setAllSettings(res.data); pushHistory(res.data); await apply(res.data); }
  };
  const removeField = async (key: string) => {
    const e = allSettings.find((s: any) => s.value === key); if (!e) return;
    const u = { ...e, isActive: false };
    await fetch(`/api/settings/${e.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
    const ns = allSettings.map((s: any) => s.id === e.id ? u : s);
    setAllSettings(ns); pushHistory(ns); await apply(ns);
    const label = key.startsWith("custom::") ? key.split("::")[1] : (MATERIAL_FIELD_REGISTRY[key]?.label || key);
    toast.success(`Removed: ${label}`);
  };
  const editField = async (oldValue: string, newKey: string) => {
    const e = allSettings.find((s: any) => s.value === oldValue);
    if (!e || oldValue === newKey) { setEditingField(null); return; }
    const u = { ...e, value: newKey };
    await fetch(`/api/settings/${e.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
    const ns = allSettings.map((s: any) => s.id === e.id ? u : s);
    setAllSettings(ns); pushHistory(ns); await apply(ns);
    const newLabel = newKey.startsWith("custom::") ? newKey.split("::")[1] : (MATERIAL_FIELD_REGISTRY[newKey]?.label || newKey);
    toast.success(`Changed: ${newLabel}`);
    setEditingField(null);
  };
  const [editingField, setEditingField] = useState<string | null>(null);
  const moveField = async (key: string, dir: -1 | 1) => {
    const sorted = [...allSettings].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((s: any) => s.value === key);
    if (idx < 0 || !sorted[idx + dir]) return;
    const a = sorted[idx], b = sorted[idx + dir];
    const ua = { ...a, sortOrder: b.sortOrder }, ub = { ...b, sortOrder: a.sortOrder };
    await fetch(`/api/settings/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ua) });
    await fetch(`/api/settings/${b.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ub) });
    const ns = allSettings.map((s: any) => s.id === a.id ? ua : s.id === b.id ? ub : s);
    setAllSettings(ns); pushHistory(ns); await apply(ns);
  };
  const undo = async () => {
    if (historyIdx <= 0) return;
    const p = history[historyIdx - 1]; setHistoryIdx(historyIdx - 1); setAllSettings(p); await apply(p);
  };
  const redo = async () => {
    if (historyIdx >= history.length - 1) return;
    const n = history[historyIdx + 1]; setHistoryIdx(historyIdx + 1); setAllSettings(n); await apply(n);
  };
  const resetToDefault = async () => {
    for (const s of allSettings) {
      const d = defaultSettings.find((x: any) => x.value === s.value);
      await fetch(`/api/settings/${s.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, isActive: d ? d.isActive : true, sortOrder: d ? d.sortOrder : s.sortOrder }) });
    }
    setAllSettings(defaultSettings); pushHistory(defaultSettings); await apply(defaultSettings);
    toast.success("Reset to default");
  };

  const addNewField = async (fieldInput: string, sectionName: string) => {
    const registryKey = fieldInput.includes(" — ") ? fieldInput.split(" — ")[0] : null;
    const fieldDef = registryKey ? MATERIAL_FIELD_REGISTRY[registryKey] : null;

    if (fieldDef) {
      const existing = allSettings.find((s: any) => s.value === registryKey);
      if (existing) {
        if (existing.isActive) { toast.info(`${fieldDef.label} is already visible`); return; }
        const updated = { ...existing, isActive: true };
        await fetch(`/api/settings/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
        const newSettings = allSettings.map((s: any) => s.id === existing.id ? updated : s);
        setAllSettings(newSettings); pushHistory(newSettings); await apply(newSettings);
        toast.success(`Shown: ${fieldDef.label}`);
        return;
      }
      const lastInSection = allSettings.filter((s: any) => {
        const reg = MATERIAL_FIELD_REGISTRY[s.value];
        return reg && reg.section === fieldDef.section;
      });
      const maxSort = lastInSection.length > 0 ? Math.max(...lastInSection.map((s: any) => s.sortOrder)) : allSettings.length;
      const newEntry = { id: `temp-${Date.now()}`, type: settingsType, value: registryKey, sortOrder: maxSort + 1, isActive: true };
      const updatedSettings = [...allSettings, newEntry];
      setAllSettings(updatedSettings); pushHistory(updatedSettings); await apply(updatedSettings);
      const postRes = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: settingsType, value: registryKey, sortOrder: maxSort + 1, isActive: true }) });
      if (!postRes.ok) { toast.error("Failed to save field"); return; }
      toast.success(`Added: ${fieldDef.label} → ${fieldDef.section}`);
    } else {
      // Custom field
      const label = fieldInput.trim();
      if (!label) return;
      const customValue = `custom::${label}::text::${sectionName}`;
      const existing = allSettings.find((s: any) => s.value === customValue);
      if (existing) {
        if (existing.isActive) { toast.info(`${label} is already visible`); return; }
        const updated = { ...existing, isActive: true };
        await fetch(`/api/settings/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
        const newSettings = allSettings.map((s: any) => s.id === existing.id ? updated : s);
        setAllSettings(newSettings); pushHistory(newSettings); await apply(newSettings);
        toast.success(`Shown: ${label}`);
        return;
      }
      const lastInSection = allSettings.filter((s: any) => s.value.startsWith("custom::") && s.value.endsWith(`::${sectionName}`));
      const maxSort = lastInSection.length > 0 ? Math.max(...lastInSection.map((s: any) => s.sortOrder)) : allSettings.length;
      const newEntry = { id: `temp-${Date.now()}`, type: settingsType, value: customValue, sortOrder: maxSort + 1, isActive: true };
      const updatedSettings = [...allSettings, newEntry];
      setAllSettings(updatedSettings); pushHistory(updatedSettings); await apply(updatedSettings);
      const postRes = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: settingsType, value: customValue, sortOrder: maxSort + 1, isActive: true }) });
      if (!postRes.ok) { toast.error("Failed to save field"); return; }
      toast.success(`Added custom field: ${label} → ${sectionName}`);
    }

    const res = await fetch(`/api/settings?type=${settingsType}`).then((r) => r.json());
    if (res.success) { setAllSettings(res.data); await apply(res.data); }
  };

  const sections = categorySectionOrder.map((secName) => ({
    name: secName,
    fields: orderedFields.filter((f) => f.section === secName),
  })).filter((s) => s.fields.length > 0);

  const onSubmit = async (data: MaterialFormValues) => {
    setSaving(true);
    try {
      const url = isEditing ? `/api/materials/${materialId}` : "/api/materials";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (res.ok) { const json = await res.json(); toast.success(isEditing ? "Material updated" : "Material created"); router.push(isEditing ? `/materials/${materialId}` : `/materials/${json.data.id}`); }
      else { const err = await res.json(); toast.error(err.error || "Failed"); }
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  const renderField = (field: FieldDef) => {
    const key = field.key as keyof MaterialFormValues;
    const wrapper = (children: React.ReactNode) => (
      <div className="space-y-2" key={field.key}>
        <Label>{field.label}{field.required ? " *" : ""}</Label>
        {children}
        {(errors as any)[key] && <p className="text-xs text-red-500">{(errors as any)[key]?.message}</p>}
      </div>
    );

    switch (field.type) {
      case "checkbox":
        return (<div className="space-y-2" key={field.key}><div className="flex items-center gap-3 pt-6"><Controller name={key as any} control={control} render={({ field: f }) => (<Switch checked={f.value === "Yes"} onCheckedChange={(v) => f.onChange(v ? "Yes" : "No")} />)} /><Label>{field.label}{field.required ? " *" : ""}</Label></div></div>);
      case "date": return wrapper(<Input type="date" {...register(key as any)} />);
      case "textarea": return wrapper(<Textarea {...register(key as any)} rows={2} />);
      case "number": return wrapper(<Input type="number" step="0.01" {...register(key as any)} />);
      case "combobox": {
        const overrides = CATEGORY_OPTION_OVERRIDES[selectedCategory] || {};
        const optType = overrides[field.key] || field.options;
        return (
          <div className="space-y-2" key={field.key}>
            <Label>{field.label}{field.required ? " *" : ""}</Label>
            <Controller name={key as any} control={control}
              render={({ field: f }) => (
                <ComboBox
                  value={(f.value as string) || ""}
                  onChange={f.onChange}
                  options={optType ? (optionsMap[optType] || BASE_OPTIONS[optType] || []) : []}
                  placeholder={`Select ${field.label.toLowerCase()}`}
                  settingsType={optType}
                />
              )}
            />
          </div>
        );
      }
      default: return wrapper(<Input {...register(key as any)} placeholder={field.placeholder} />);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            const res = await fetch(`/api/settings?type=${settingsType}`).then((r) => r.json());
            if (res.success) {
              setAllSettings(res.data);
              setDefaultSettings(JSON.parse(JSON.stringify(res.data)));
              setHistory([JSON.parse(JSON.stringify(res.data))]);
              setHistoryIdx(0);
              await apply(res.data);
            }
          }
          setEditMode(!editMode);
        }}>
          <Settings2 className="h-4 w-4" />{editMode ? "Done Editing" : "Edit Layout"}
        </Button>
      </div>

      {/* Category Picker — shown when no category selected yet */}
      {!selectedCategory && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-800">Select Material Category</h3>
            <p className="text-sm text-slate-500 mt-1">Each category has its own form fields matching the Stock Taking template</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: "FDM Filaments", label: "FDM", desc: "Filament spools — Color, QTY", color: "border-amber-200 hover:border-amber-400 bg-amber-50/50" },
              { key: "SLA Resins", label: "SLA", desc: "Resin bottles — Version, Printer, QTY", color: "border-purple-200 hover:border-purple-400 bg-purple-50/50" },
              { key: "Resin Tanks", label: "Tank", desc: "Printer tanks — QTY only", color: "border-blue-200 hover:border-blue-400 bg-blue-50/50" },
              { key: "IPA", label: "IPA", desc: "Isopropyl Alcohol — QTY only", color: "border-teal-200 hover:border-teal-400 bg-teal-50/50" },
            ].map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.key);
                  setValue("category", cat.key);
                }}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${cat.color}`}
              >
                <span className="text-xl font-bold text-slate-700">{cat.label}</span>
                <span className="font-semibold text-slate-800 text-sm">{cat.key}</span>
                <span className="text-[11px] text-slate-500 text-center leading-tight">{cat.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedCategory && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Category:</span>
          <span className="text-sm font-semibold text-slate-800">{selectedCategory}</span>
          {!isEditing && (
            <button type="button" onClick={() => { setSelectedCategory(""); setValue("category", ""); }} className="ml-auto text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              Change
            </button>
          )}
        </div>
      )}

      {selectedCategory && sections.map((section) => (
        <Card key={section.name} className={cn("overflow-visible", editMode && "ring-2 ring-indigo-200")}>
          <CardHeader className="pb-2"><CardTitle className="text-base">{section.name}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.fields.map((field) => (
                <div key={field.key} className={cn(editMode && "rounded-lg border-2 border-dashed border-slate-200 p-3 hover:border-indigo-300")}>
                  {editMode && (
                    <div className="flex items-center gap-1 mb-2 bg-slate-50 rounded-lg px-2 py-1">
                      <button type="button" onClick={() => moveField(field.key, -1)} className="text-slate-500 hover:text-slate-700 p-0.5"><ChevronUp className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => moveField(field.key, 1)} className="text-slate-500 hover:text-slate-700 p-0.5"><ChevronDown className="h-3.5 w-3.5" /></button>
                      {editingField === field.key ? (
                        <ComboBox
                          value=""
                          onChange={(v) => { if (v) { const newKey = v.split(" — ")[0]; if (MATERIAL_FIELD_REGISTRY[newKey]) editField(field.key, newKey); } }}
                          options={Object.keys(MATERIAL_FIELD_REGISTRY).filter((k) => k !== field.key).map((k) => `${k} — ${MATERIAL_FIELD_REGISTRY[k].label}`)}
                          placeholder="Replace with..."
                          className="flex-1 min-w-0"
                        />
                      ) : (
                        <button type="button" onClick={() => setEditingField(field.key)} className="flex-1 text-center text-[11px] text-slate-500 font-mono hover:text-indigo-600 hover:bg-indigo-50 rounded px-1 py-0.5 transition-colors" title="Click to change">
                          {field.key}
                        </button>
                      )}
                      <button type="button" onClick={() => removeField(field.key)} className="p-0.5 shrink-0" title="Remove field"><Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" /></button>
                    </div>
                  )}
                  {renderField(field)}
                </div>
              ))}
              {editMode && (
                <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-6 min-h-[80px]">
                  <ComboBox
                    value=""
                    onChange={(v) => { if (v) addNewField(v, section.name); }}
                    options={Object.keys(MATERIAL_FIELD_REGISTRY).filter((k) => !orderedFields.find((f) => f.key === k)).map((k) => `${k} — ${MATERIAL_FIELD_REGISTRY[k].label}`)}
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
          {isEditing ? "Update Material" : "Create Material"}
        </Button>
      </div>
    </form>
  );
}
