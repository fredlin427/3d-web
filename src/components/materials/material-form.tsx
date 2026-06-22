"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { materialFormSchema, MaterialFormValues } from "@/lib/validators";
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
import { cn } from "@/lib/utils";
import { MATERIAL_FIELD_REGISTRY, MATERIAL_SECTION_ORDER, MATERIAL_CATEGORY_FIELDS, MATERIAL_CATEGORY_SECTION_ORDERS, MATERIAL_CATEGORY_SETTINGS_TYPE, FieldDef } from "@/lib/field-registry";
import { TANK_PRODUCT_CODES, SLA_MATERIAL_CODES, FDM_MATERIAL_TYPES, SLA_RESIN_PRODUCTS, SLA_PRINTERS, TANK_PRODUCTS } from "@/lib/constants";
import { FieldCard } from "@/components/shared/field-card";
import { AddFieldModal } from "@/components/shared/add-field-modal";
import { FormLayoutToolbar } from "@/components/shared/form-layout-toolbar";

const BASE_OPTIONS: Record<string, string[]> = {
  fdm_brand: ["[UM] Ultimaker","[R3D] Raise 3D","[DC] 3dRe","[RE] Recreus","[eSUN] eSUN","[BBL] Bambu Lab","[AC] Anycubic","Other"],
  fdm_material_type: [...FDM_MATERIAL_TYPES],
  fdm_unit: ["roll","kg","g","unit"],
  fdm_status: ["New","Opened","Disposed"],
  sla_product: [...SLA_RESIN_PRODUCTS, "Other"],
  sla_printer: [...SLA_PRINTERS, "Other"],
  sla_unit: ["bottle","cartridge","litre","ml","unit"],
  sla_status: ["New","Opened","Disposed"],
  tank_product: [...TANK_PRODUCTS, "Other"],
  tank_resin_type: [...SLA_RESIN_PRODUCTS, "Other"],
  tank_unit: ["unit"],
  tank_status: ["New","Opened","Disposed"],
  ipa_unit: ["litre","ml","bottle","unit"],
  ipa_status: ["In stock","Low stock","Expired"],
};

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
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalSection, setAddModalSection] = useState("");
  const [allSettings, setAllSettings] = useState<any[]>([]);
  const [optionsMap, setOptionsMap] = useState<Record<string, string[]>>(BASE_OPTIONS);
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultValues?.category || "");

  const categoryFields = selectedCategory ? MATERIAL_CATEGORY_FIELDS[selectedCategory] : null;
  const categorySectionOrder = selectedCategory ? (MATERIAL_CATEGORY_SECTION_ORDERS[selectedCategory] || MATERIAL_SECTION_ORDER) : MATERIAL_SECTION_ORDER;
  const settingsType = selectedCategory ? (MATERIAL_CATEGORY_SETTINGS_TYPE[selectedCategory] || "") : "";

  const pushHistory = (s: any[]) => {
    const h = history.slice(0, historyIdx + 1);
    h.push(JSON.parse(JSON.stringify(s)));
    if (h.length > 50) h.shift();
    setHistory(h); setHistoryIdx(h.length - 1);
  };

  const apply = async (s: any[]) => {
    const active = s.filter((x: any) => x.isActive).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    const fields: FieldDef[] = [];
    const seen = new Set<string>();
    for (const item of active) {
      const val = item.value.trim();
      if (seen.has(val)) continue;
      seen.add(val);
      if (val.startsWith("custom::")) {
        const parts = val.split("::");
        fields.push({ key: val, label: parts[1] || "Custom Field", section: parts[3] || "Additional", type: (parts[2] || "text") as FieldDef["type"] });
      } else if (MATERIAL_FIELD_REGISTRY[val]) {
        fields.push({ ...MATERIAL_FIELD_REGISTRY[val] });
      }
    }
    setOrderedFields(fields);
  };

  const { register, handleSubmit, control, setValue, watch, getValues, formState: { errors } } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema) as any,
    defaultValues: defaultValues || { status: "In stock", unit: "unit", initialQuantity: 0, currentQuantity: 0, reorderThreshold: 0 },
  });

  // ─── Load settings ──────────────────────────────────────────────
  useEffect(() => {
    if (!settingsType) return;
    fetch(`/api/settings?type=${settingsType}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data.length > 0) {
          setAllSettings(j.data);
          setHistory([JSON.parse(JSON.stringify(j.data))]);
          setHistoryIdx(0);
          apply(j.data);
        } else if (j.success) {
          const catFields = MATERIAL_CATEGORY_FIELDS[selectedCategory] || [];
          const defaults = catFields.map((key, i) => ({
            id: `default-${key}`, type: settingsType, value: key, sortOrder: i, isActive: true,
          }));
          setAllSettings(defaults);
          setHistory([JSON.parse(JSON.stringify(defaults))]);
          setHistoryIdx(0);
          apply(defaults);
          Promise.all(defaults.map((d) =>
            fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: settingsType, value: d.value, sortOrder: d.sortOrder, isActive: true }) })
          )).then(() =>
            fetch(`/api/settings?type=${settingsType}`).then((r) => r.json()).then((refreshed) => {
              if (refreshed.success && refreshed.data.length > 0) {
                setAllSettings(refreshed.data);
                setHistory([JSON.parse(JSON.stringify(refreshed.data))]);
                setHistoryIdx(0);
                apply(refreshed.data);
              }
            })
          ).catch(() => {});
        }
      })
      .catch(() => {});
  }, [settingsType, selectedCategory]);

  // Load option settings
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

  useEffect(() => {
    if (defaultValues?.category && defaultValues.category !== selectedCategory) {
      setSelectedCategory(defaultValues.category as string);
    }
  }, [defaultValues?.category]);

  // Auto-calculate status & remain
  const watchedOpenDate = watch("openDate");
  const watchedDisposalDate = watch("disposalDate");
  const watchedExpiryDate = watch("expiryDate");
  const watchedCategory = watch("category");
  const watchedBatch = watch("batchNumber");
  useEffect(() => {
    const cat = watchedCategory || selectedCategory;
    const hasDisposal = watchedDisposalDate && String(watchedDisposalDate).trim() !== "";
    const hasOpen = watchedOpenDate && String(watchedOpenDate).trim() !== "";
    const hasBatch = watchedBatch && String(watchedBatch).trim() !== "";
    if (cat === "SLA Resins") {
      if (!hasBatch) { setValue("status", ""); return; }
      const isExpired = watchedExpiryDate && new Date(String(watchedExpiryDate)) < new Date();
      if (isExpired) { setValue("status", hasDisposal ? "Disposed" : "Trial Only"); }
      else if (hasOpen) { setValue("status", hasDisposal ? "Disposed" : String(watchedOpenDate) !== "N/A" ? "Opened" : "N/A"); }
      else { setValue("status", "New"); }
    } else if (cat === "FDM Filaments" || cat === "Resin Tanks") {
      if (hasDisposal) { setValue("status", "Disposed"); }
      else if (hasOpen) { setValue("status", "Opened"); }
      else { setValue("status", "New"); }
    }
  }, [watchedOpenDate, watchedDisposalDate, watchedExpiryDate, watchedCategory, watchedBatch]);

  const watchedWeight = watch("initialQuantity");
  const watchedUsed = watch("unusedQuantity");
  const watchedOpenedQty = watch("openedQuantity");
  const watchedExpiredQty = watch("expiredQuantity");
  useEffect(() => {
    const w = Number(watchedWeight) || 0;
    const u = Number(watchedUsed) || 0;
    const o = Number(watchedOpenedQty) || 0;
    const e = Number(watchedExpiredQty) || 0;
    setValue("currentQuantity", Math.max(0, w - u - o - e));
  }, [watchedWeight, watchedUsed, watchedOpenedQty, watchedExpiredQty]);

  useEffect(() => {
    if (selectedCategory && allSettings.length > 0) apply(allSettings);
  }, [selectedCategory]);

  // ─── Field editing ──────────────────────────────────────────────

  const refreshFields = async () => {
    const res = await fetch(`/api/settings?type=${settingsType}`).then((r) => r.json());
    if (res.success) { setAllSettings(res.data); pushHistory(res.data); await apply(res.data); }
    window.dispatchEvent(new Event("form-fields-changed"));
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
    const cat = selectedCategory || "";
    const defaultKeys = MATERIAL_CATEGORY_FIELDS[cat] || Object.keys(MATERIAL_FIELD_REGISTRY);
    for (const s of allSettings) {
      const shouldBeActive = defaultKeys.includes(s.value);
      const defaultOrder = defaultKeys.indexOf(s.value);
      await fetch(`/api/settings/${s.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, isActive: shouldBeActive, sortOrder: shouldBeActive ? defaultOrder : s.sortOrder }) });
    }
    const res = await fetch(`/api/settings?type=${settingsType}`).then((r) => r.json());
    if (res.success) { setAllSettings(res.data); pushHistory(res.data); await apply(res.data); }
    toast.success("Reset to default");
  };

  const removeField = async (key: string) => {
    const e = allSettings.find((s: any) => s.value === key);
    if (!e) { toast.error("Field not found"); return; }
    const res = await fetch(`/api/settings/${e.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: e.type, value: e.value, sortOrder: e.sortOrder, isActive: false }) });
    if (!res.ok) { toast.error("Failed to remove"); return; }
    const check = await fetch(`/api/settings?type=${e.type}`).then(r => r.json());
    if (check.success) { setAllSettings(check.data); pushHistory(check.data); await apply(check.data); }
    const label = key.startsWith("custom::") ? key.split("::")[1] : (MATERIAL_FIELD_REGISTRY[key]?.label || key);
    toast.success(`Removed: ${label}`);
    if (expandedField === key) setExpandedField(null);
    window.dispatchEvent(new Event("form-fields-changed"));
  };

  const handleLabelChange = async (fieldKey: string, newLabel: string) => {
    const setting = allSettings.find((s: any) => s.value === fieldKey);
    if (!setting) return;
    const parsed = fieldKey.startsWith("custom::") ? { label: fieldKey.split("::")[1] || "", type: fieldKey.split("::")[2] || "text", section: fieldKey.split("::")[3] || MATERIAL_SECTION_ORDER[0] }
      : { label: MATERIAL_FIELD_REGISTRY[fieldKey]?.label || fieldKey, type: MATERIAL_FIELD_REGISTRY[fieldKey]?.type || "text", section: MATERIAL_FIELD_REGISTRY[fieldKey]?.section || MATERIAL_SECTION_ORDER[0] };
    const newValue = `custom::${newLabel}::${parsed.type}::${parsed.section}`;
    const u = { type: setting.type, value: newValue, sortOrder: setting.sortOrder, isActive: setting.isActive };
    await fetch(`/api/settings/${setting.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
    const ns = allSettings.map((s: any) => s.id === setting.id ? { ...s, value: newValue } : s);
    setAllSettings(ns); pushHistory(ns); await apply(ns);
    toast.success(`Renamed: ${newLabel}`);
    window.dispatchEvent(new Event("form-fields-changed"));
  };

  const handleTypeChange = async (fieldKey: string, newType: FieldDef["type"]) => {
    const setting = allSettings.find((s: any) => s.value === fieldKey);
    if (!setting) return;
    const parsed = fieldKey.startsWith("custom::") ? { label: fieldKey.split("::")[1] || "", section: fieldKey.split("::")[3] || MATERIAL_SECTION_ORDER[0] }
      : { label: MATERIAL_FIELD_REGISTRY[fieldKey]?.label || fieldKey, section: MATERIAL_FIELD_REGISTRY[fieldKey]?.section || MATERIAL_SECTION_ORDER[0] };
    const newValue = `custom::${parsed.label}::${newType}::${parsed.section}`;
    const u = { type: setting.type, value: newValue, sortOrder: setting.sortOrder, isActive: setting.isActive };
    await fetch(`/api/settings/${setting.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
    const ns = allSettings.map((s: any) => s.id === setting.id ? { ...s, value: newValue } : s);
    setAllSettings(ns); pushHistory(ns); await apply(ns);
    toast.success(`Type changed: ${parsed.label} → ${newType}`);
    window.dispatchEvent(new Event("form-fields-changed"));
  };

  const moveField = async (key: string, dir: -1 | 1) => {
    const active = [...allSettings].filter((s: any) => s.isActive).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    const idx = active.findIndex((s: any) => s.value === key);
    if (idx < 0 || !active[idx + dir]) return;
    const a = active[idx], b = active[idx + dir];
    await fetch(`/api/settings/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: a.type, value: a.value, sortOrder: b.sortOrder, isActive: a.isActive }) });
    await fetch(`/api/settings/${b.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: b.type, value: b.value, sortOrder: a.sortOrder, isActive: b.isActive }) });
    const ns = allSettings.map((s: any) => s.id === a.id ? { ...s, sortOrder: b.sortOrder } : s.id === b.id ? { ...s, sortOrder: a.sortOrder } : s);
    setAllSettings(ns); pushHistory(ns); await apply(ns);
  };

  const addNewField = async (label: string, type: string, sectionName: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const registryKey = Object.keys(MATERIAL_FIELD_REGISTRY).find(k => MATERIAL_FIELD_REGISTRY[k].label.toLowerCase() === trimmed.toLowerCase() || k === trimmed);
    if (registryKey) {
      const fieldDef = MATERIAL_FIELD_REGISTRY[registryKey];
      const existing = allSettings.find((s: any) => s.value === registryKey);
      if (existing) {
        if (existing.isActive) { toast.info(`${fieldDef.label} is already visible`); return; }
        const u = { type: existing.type, value: existing.value, sortOrder: existing.sortOrder, isActive: true };
        await fetch(`/api/settings/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
        const ns = allSettings.map((s: any) => s.id === existing.id ? { ...s, isActive: true } : s);
        setAllSettings(ns); pushHistory(ns); await apply(ns);
        toast.success(`Shown: ${fieldDef.label}`);
      } else {
        const postRes = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: settingsType, value: registryKey, sortOrder: allSettings.length + 1, isActive: true }) });
        if (!postRes.ok) { toast.error("Failed to save field"); return; }
        toast.success(`Added: ${fieldDef.label}`);
        const refresh = await fetch(`/api/settings?type=${settingsType}`).then((r) => r.json());
        if (refresh.success) { setAllSettings(refresh.data); await apply(refresh.data); }
      }
    } else {
      const customValue = `custom::${trimmed}::${type}::${sectionName}`;
      const existing = allSettings.find((s: any) => s.value === customValue);
      if (existing) {
        if (existing.isActive) { toast.info(`${trimmed} is already visible`); return; }
        const u = { type: existing.type, value: existing.value, sortOrder: existing.sortOrder, isActive: true };
        await fetch(`/api/settings/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
        const ns = allSettings.map((s: any) => s.id === existing.id ? { ...s, isActive: true } : s);
        setAllSettings(ns); pushHistory(ns); await apply(ns);
        toast.success(`Shown: ${trimmed}`);
      } else {
        const postRes = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: settingsType, value: customValue, sortOrder: allSettings.length + 1, isActive: true }) });
        if (!postRes.ok) { toast.error("Failed to save field"); return; }
        toast.success(`Added custom field: ${trimmed}`);
        const refresh = await fetch(`/api/settings?type=${settingsType}`).then((r) => r.json());
        if (refresh.success) { setAllSettings(refresh.data); pushHistory(refresh.data); await apply(refresh.data); }
      }
    }
    window.dispatchEvent(new Event("form-fields-changed"));
  };

  const sections = categorySectionOrder.map((secName) => ({
    name: secName,
    fields: orderedFields.filter((f) => f.section === secName),
  }));

  const onSubmit = async (formData: MaterialFormValues) => {
    setSaving(true);
    try {
      const fresh = getValues();
      const data = { ...(defaultValues || {}), ...fresh, ...formData };
      const cat = data.category || selectedCategory;
      if (!data.category) data.category = selectedCategory;
      if (cat === "SLA Resins" && data.materialName && !data.productCode) {
        data.productCode = SLA_MATERIAL_CODES[data.materialName as string] || (data.productCode as string);
      }
      if (cat === "Resin Tanks" && data.materialName && !data.productCode) {
        data.productCode = TANK_PRODUCT_CODES[data.materialName as string] || (data.productCode as string);
      }
      const url = isEditing ? `/api/materials/${materialId}` : "/api/materials";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (res.ok) { const json = await res.json(); toast.success(isEditing ? "Material updated" : "Material created"); router.push(isEditing ? `/materials/${materialId}` : `/materials/${json.data.id}`); }
      else { const err = await res.json(); toast.error(err.error || "Failed"); }
    } catch (e) { toast.error("Save failed: " + (e as Error).message); }
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
      case "number": {
        const isRemain = field.key === "currentQuantity";
        return wrapper(<Input type="number" step="0.01" {...register(key as any)} readOnly={isRemain} className={isRemain ? "bg-slate-50 text-emerald-600 font-medium" : ""} />);
      }
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
        const overrides = CATEGORY_OPTION_OVERRIDES[selectedCategory] || {};
        const optType = overrides[field.key] || field.options;
        return (
          <div className="space-y-2" key={field.key}>
            <Label>{field.label}{field.required ? " *" : ""}</Label>
            <Controller name={key as any} control={control}
              render={({ field: f }) => (
                <ComboBox value={(f.value as string) || ""} onChange={f.onChange}
                  options={optType ? (optionsMap[optType] || BASE_OPTIONS[optType] || []) : []}
                  placeholder={`Select ${field.label.toLowerCase()}`} settingsType={optType} />
              )}
            />
          </div>
        );
      }
      default: {
        const isAuto = field.key === "currentQuantity";
        return wrapper(<Input {...register(key as any)} placeholder={field.placeholder} readOnly={isAuto} className={isAuto ? "bg-slate-50 text-emerald-600 font-medium" : ""} />);
      }
    }
  };

  const totalFields = orderedFields.length;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ─── Category Picker ──────────────────────────────────────── */}
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
                key={cat.key} type="button"
                onClick={() => { setSelectedCategory(cat.key); setValue("category", cat.key); }}
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

      {/* ─── Category badge + Edit toggle ─────────────────────────── */}
      {selectedCategory && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Category:</span>
          <span className="text-sm font-semibold text-slate-800">{selectedCategory}</span>
          {!isEditing && (
            <button type="button" onClick={() => { setSelectedCategory(""); setValue("category", ""); }} className="text-xs text-primary hover:text-primary font-medium">
              Change
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={async () => {
              if (!editMode && settingsType) {
                const res = await fetch(`/api/settings?type=${settingsType}`).then((r) => r.json());
                if (res.success) {
                  setAllSettings(res.data);
                  setHistory([JSON.parse(JSON.stringify(res.data))]);
                  setHistoryIdx(0);
                  await apply(res.data);
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
      )}

      {/* ─── EDIT MODE: Toolbar ────────────────────────────────── */}
      {editMode && selectedCategory && (
        <FormLayoutToolbar
          fieldCount={totalFields}
          canUndo={historyIdx > 0}
          canRedo={historyIdx < history.length - 1}
          onUndo={undo}
          onRedo={redo}
          onReset={resetToDefault}
        />
      )}

      {/* ─── Sections ──────────────────────────────────────────── */}
      {selectedCategory && sections.map((section) => (
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
                return renderField(field);
              })}
            </div>

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

      {/* ─── Submit buttons ──────────────────────────────────────── */}
      {selectedCategory && (
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update Material" : "Create Material"}
          </Button>
        </div>
      )}

      {/* ─── Add Field Modal ──────────────────────────────────────── */}
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
