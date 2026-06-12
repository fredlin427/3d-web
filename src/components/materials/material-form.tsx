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
import { TANK_PRODUCT_CODES, SLA_MATERIAL_CODES } from "@/lib/constants";

const BASE_OPTIONS: Record<string, string[]> = {
  // FDM — from Excel Code List
  fdm_brand: ["3dRe","Ultimaker","Recreus","eSUN","Bambu Lab","Anycubic","Raise 3D","Dreamcubics","Other"],
  fdm_material_type: ["ABS","CF","CPE","Glass","PA","PC","PETG","PLA","PP","PVA","TPU","Wood","rPET","Nylon","Other"],
  fdm_unit: ["roll","kg","g","unit"],
  fdm_status: ["New","Opened","Disposed"],
  // SLA Resins — from Excel Code List (full names)
  sla_product: [
    "BioMed Clear Resin","BioMed Durable Resin","BioMed Elastic 50A Resin","BioMed Flex 80A Resin","BioMed White Resin",
    "BioMed Amber Resin","BioMed Black Resin",
    "Black Resin","Clear Resin","Color Resin","Dental LT Clear Resin","Draft Resin","Durable Resin",
    "Elastic 50A Resin","Flexible 80A Resin","Grey Pro Resin","Grey Resin","High Temp Resin",
    "IBT Resin","IBT Flex Resin","Rigid 10K Resin","Rigid 4000 Resin","Silicone 40A Resin",
    "Surgical Guide Resin","Tough 1500 Resin","Tough 2000 Resin","White Resin",
    "Other",
  ],
  sla_printer: ["Form 3BL","Form 4B","Other"],
  sla_unit: ["bottle","cartridge","litre","ml","unit"],
  sla_status: ["New","Opened","Disposed"],
  // Resin Tanks — from Excel Code List
  tank_product: ["Form 2 Resin Tank LT","Form 3L Resin Tank V2","Form 3L Resin Tank V3","Form 4 Resin Tank","Form 4L Resin Tank","Other"],
  tank_resin_type: [
    "BioMed Clear Resin","BioMed Durable Resin","BioMed Elastic 50A Resin","BioMed Flex 80A Resin","BioMed White Resin",
    "BioMed Amber Resin","BioMed Black Resin",
    "Black Resin","Clear Resin","Color Resin","Dental LT Clear Resin","Draft Resin","Durable Resin",
    "Elastic 50A Resin","Flexible 80A Resin","Grey Pro Resin","Grey Resin","High Temp Resin",
    "IBT Resin","IBT Flex Resin","Rigid 10K Resin","Rigid 4000 Resin","Silicone 40A Resin",
    "Surgical Guide Resin","Tough 1500 Resin","Tough 2000 Resin","White Resin",
    "Other",
  ],
  tank_unit: ["unit"],
  tank_status: ["New","Opened","Disposed"],
  // IPA
  ipa_unit: ["litre","ml","bottle","unit"],
  ipa_status: ["In stock","Low stock","Expired"],
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
          // Persist defaults & refresh to get real IDs
          Promise.all(defaults.map((d) =>
            fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: settingsType, value: d.value, sortOrder: d.sortOrder, isActive: true }) })
          )).then(() =>
            fetch(`/api/settings?type=${settingsType}`).then((r) => r.json()).then((refreshed) => {
              if (refreshed.success && refreshed.data.length > 0) {
                setAllSettings(refreshed.data);
                setDefaultSettings(JSON.parse(JSON.stringify(refreshed.data)));
                setHistory([JSON.parse(JSON.stringify(refreshed.data))]);
                apply(refreshed.data);
              }
            })
          ).catch(() => {});
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

  // Auto-calculate status from dates (matches Excel formulas per category)
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
      // SLA Excel formula:
      // No batch → ""
      // Expired → Disposed (if disposal date) or "Trial Only"
      // Not expired + has open date → Disposed (if disposal date) or "Opened" (if not N/A) or "N/A"
      // Not expired + no open date → "New"
      if (!hasBatch) {
        setValue("status", "");
        return;
      }
      const isExpired = watchedExpiryDate && new Date(String(watchedExpiryDate)) < new Date();
      if (isExpired) {
        setValue("status", hasDisposal ? "Disposed" : "Trial Only");
      } else if (hasOpen) {
        if (hasDisposal) {
          setValue("status", "Disposed");
        } else if (String(watchedOpenDate) !== "N/A") {
          setValue("status", "Opened");
        } else {
          setValue("status", "N/A");
        }
      } else {
        setValue("status", "New");
      }
    } else if (cat === "FDM Filaments" || cat === "Resin Tanks") {
      if (hasDisposal) {
        setValue("status", "Disposed");
      } else if (hasOpen) {
        setValue("status", "Opened");
      } else {
        setValue("status", "New");
      }
    } else {
      // IPA — no auto status
    }
  }, [watchedOpenDate, watchedDisposalDate, watchedExpiryDate, watchedCategory, watchedBatch]);

  // Auto-fill FDM Material ID = {BrandCode}-{MaterialType}-{ArrivalYear}-{Seq}
  // Formula: MID(Brand, SEARCH("[",Brand)+1, SEARCH("]",Brand)-2) & "-" & MaterialType & "-" & YEAR(Arrival) & "-" & Seq
  const watchedBrand = watch("brand");
  const watchedMaterialType = watch("materialType");
  const watchedArrivalDate = watch("receivedDate");
  const watchedCatFdm = watch("category");
  useEffect(() => {
    const cat = watchedCatFdm || selectedCategory;
    if (cat !== "FDM Filaments") return;
    if (!watchedBrand || !watchedMaterialType || !watchedArrivalDate) return;
    let code = "";
    const bracketMatch = String(watchedBrand).match(/\[([^\]]+)\]/);
    const parenMatch = String(watchedBrand).match(/\(([^)]+)\)/);
    if (bracketMatch) code = bracketMatch[1];
    else if (parenMatch) code = parenMatch[1];
    else code = String(watchedBrand).split(" ")[0];
    if (!code) return;
    const year = new Date(String(watchedArrivalDate)).getFullYear();
    const prefix = `${code}-${watchedMaterialType}-${year}`;
    // Fetch next sequence number from API
    fetch(`/api/materials/next-material-id?prefix=${encodeURIComponent(prefix)}&category=${encodeURIComponent(cat)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data.materialId) {
          setValue("materialId", j.data.materialId);
        }
      })
      .catch(() => {});
  }, [watchedBrand, watchedMaterialType, watchedArrivalDate, watchedCatFdm]);

  // Auto-fill SLA Material Code from Product Name (VLOOKUP)
  const watchedSlaProduct = watch("materialName");
  const watchedCatSla = watch("category");
  useEffect(() => {
    const cat = watchedCatSla || selectedCategory;
    if (cat === "SLA Resins" && watchedSlaProduct) {
      const code = SLA_MATERIAL_CODES[watchedSlaProduct];
      if (code) setValue("productCode", code);
    }
  }, [watchedSlaProduct, watchedCatSla]);

  // Auto-fill SLA Material ID = {MaterialCode}-{Version}-{ArrivalYear}-{Seq}
  const watchedSlaCode = watch("productCode");
  const watchedSlaVersion = watch("materialType");
  const watchedSlaArrival = watch("receivedDate");
  useEffect(() => {
    const cat = watchedCatSla || selectedCategory;
    if (cat !== "SLA Resins") return;
    if (!watchedSlaCode || !watchedSlaVersion || !watchedSlaArrival) return;
    const year = new Date(String(watchedSlaArrival)).getFullYear();
    const prefix = `${watchedSlaCode}-${watchedSlaVersion}-${year}`;
    fetch(`/api/materials/next-material-id?prefix=${encodeURIComponent(prefix)}&category=${encodeURIComponent(cat)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data.materialId) {
          setValue("materialId", j.data.materialId);
        }
      })
      .catch(() => {});
  }, [watchedSlaCode, watchedSlaVersion, watchedSlaArrival, watchedCatSla]);

  // Auto-fill Tank Product Code from Product Name (VLOOKUP)
  const watchedMaterialName = watch("materialName");
  const watchedCatTank = watch("category");
  useEffect(() => {
    const cat = watchedCatTank || selectedCategory;
    if (cat === "Resin Tanks" && watchedMaterialName) {
      const code = TANK_PRODUCT_CODES[watchedMaterialName];
      if (code) setValue("productCode", code);
    }
  }, [watchedMaterialName, watchedCatTank]);

  // Auto-calculate Remain = Weight - Used - Opened - Expired
  const watchedInitial = watch("initialQuantity");
  const watchedUnused = watch("unusedQuantity");
  const watchedOpened = watch("openedQuantity");
  const watchedExpired = watch("expiredQuantity");
  useEffect(() => {
    const init = Number(watchedInitial) || 0;
    const used = Number(watchedUnused) || 0;
    const opened = Number(watchedOpened) || 0;
    const expired = Number(watchedExpired) || 0;
    const remain = init - used - opened - expired;
    setValue("currentQuantity", Math.max(0, remain));
  }, [watchedInitial, watchedUnused, watchedOpened, watchedExpired]);

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
    const e = allSettings.find((s: any) => s.value === key);
    if (!e) { toast.error("Field not found"); return; }
    try {
      const u = { type: e.type, value: e.value, sortOrder: e.sortOrder, isActive: false };
      const res = await fetch(`/api/settings/${e.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
      if (!res.ok) throw new Error("API error");
      const ns = allSettings.map((s: any) => s.id === e.id ? { ...s, isActive: false } : s);
      setAllSettings(ns); pushHistory(ns); await apply(ns);
      const label = key.startsWith("custom::") ? key.split("::")[1] : (MATERIAL_FIELD_REGISTRY[key]?.label || key);
      toast.success(`Removed: ${label}`);
    } catch { toast.error("Failed to remove field"); }
  };
  const editField = async (oldValue: string, newKey: string) => {
    const e = allSettings.find((s: any) => s.value === oldValue);
    if (!e || oldValue === newKey) { setEditingField(null); return; }
    try {
      const u = { type: e.type, value: newKey, sortOrder: e.sortOrder, isActive: e.isActive };
      const res = await fetch(`/api/settings/${e.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
      if (!res.ok) throw new Error("API error");
      const ns = allSettings.map((s: any) => s.id === e.id ? { ...s, value: newKey } : s);
      setAllSettings(ns); pushHistory(ns); await apply(ns);
      const newLabel = newKey.startsWith("custom::") ? newKey.split("::")[1] : (MATERIAL_FIELD_REGISTRY[newKey]?.label || newKey);
      toast.success(`Changed: ${newLabel}`);
    } catch { toast.error("Failed to change field"); }
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
    const reg = MATERIAL_FIELD_REGISTRY[val];
    if (reg) return { key: val, label: reg.label, type: reg.type, section: reg.section, isCustom: false };
    return { key: val, label: val, type: "text" as FieldDef["type"], section: currentSection, isCustom: false };
  };

  const updateFieldLabel = async (settingKey: string, newLabel: string) => {
    const trimmed = newLabel.trim();
    if (!trimmed || trimmed === parseFieldValue(settingKey, MATERIAL_SECTION_ORDER[0]).label) { setEditingLabel(null); return; }
    const setting = allSettings.find((s: any) => s.value === settingKey);
    if (!setting) { toast.error("Field not found"); setEditingLabel(null); return; }
    try {
      const parsed = parseFieldValue(setting.value, MATERIAL_SECTION_ORDER[0]);
      const newValue = `custom::${trimmed}::${parsed.type}::${parsed.section}`;
      const u = { type: setting.type, value: newValue, sortOrder: setting.sortOrder, isActive: setting.isActive };
      const res = await fetch(`/api/settings/${setting.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
      if (!res.ok) throw new Error("Failed");
      const ns = allSettings.map((s: any) => s.id === setting.id ? { ...s, value: newValue } : s);
      setAllSettings(ns); pushHistory(ns); await apply(ns);
      toast.success(`Renamed: ${trimmed}`);
    } catch { toast.error("Failed to rename field"); }
    setEditingLabel(null);
  };

  const updateFieldType = async (settingKey: string, newType: FieldDef["type"]) => {
    const setting = allSettings.find((s: any) => s.value === settingKey);
    if (!setting) { toast.error("Field not found"); setEditingType(null); return; }
    try {
      const parsed = parseFieldValue(setting.value, MATERIAL_SECTION_ORDER[0]);
      if (parsed.type === newType) { setEditingType(null); return; }
      const newValue = `custom::${parsed.label}::${newType}::${parsed.section}`;
      const u = { type: setting.type, value: newValue, sortOrder: setting.sortOrder, isActive: setting.isActive };
      const res = await fetch(`/api/settings/${setting.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
      if (!res.ok) throw new Error("Failed");
      const ns = allSettings.map((s: any) => s.id === setting.id ? { ...s, value: newValue } : s);
      setAllSettings(ns); pushHistory(ns); await apply(ns);
      toast.success(`Type changed: ${parsed.label} → ${newType}`);
    } catch { toast.error("Failed to change type"); }
    setEditingType(null);
  };
  const moveField = async (key: string, dir: -1 | 1) => {
    const sorted = [...allSettings].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((s: any) => s.value === key);
    if (idx < 0 || !sorted[idx + dir]) return;
    const a = sorted[idx], b = sorted[idx + dir];
    try {
      await fetch(`/api/settings/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: a.type, value: a.value, sortOrder: b.sortOrder, isActive: a.isActive }) });
      await fetch(`/api/settings/${b.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: b.type, value: b.value, sortOrder: a.sortOrder, isActive: b.isActive }) });
      const ns = allSettings.map((s: any) => s.id === a.id ? { ...s, sortOrder: b.sortOrder } : s.id === b.id ? { ...s, sortOrder: a.sortOrder } : s);
      setAllSettings(ns); pushHistory(ns); await apply(ns);
    } catch { toast.error("Failed to reorder"); }
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

    try {
      if (fieldDef) {
        const existing = allSettings.find((s: any) => s.value === registryKey);
        if (existing) {
          if (existing.isActive) { toast.info(`${fieldDef.label} is already visible`); return; }
          const u = { type: existing.type, value: existing.value, sortOrder: existing.sortOrder, isActive: true };
          const res = await fetch(`/api/settings/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
          if (!res.ok) throw new Error("API error");
          const ns = allSettings.map((s: any) => s.id === existing.id ? { ...s, isActive: true } : s);
          setAllSettings(ns); pushHistory(ns); await apply(ns);
          toast.success(`Shown: ${fieldDef.label}`);
          return;
        }
        const lastInSection = allSettings.filter((s: any) => {
          const reg = MATERIAL_FIELD_REGISTRY[s.value];
          return reg && reg.section === fieldDef.section;
        });
        const maxSort = lastInSection.length > 0 ? Math.max(...lastInSection.map((s: any) => s.sortOrder)) : allSettings.length;
        const postRes = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: settingsType, value: registryKey, sortOrder: maxSort + 1, isActive: true }) });
        if (!postRes.ok) throw new Error("API error");
        toast.success(`Added: ${fieldDef.label} → ${fieldDef.section}`);
      } else {
        const label = fieldInput.trim();
        if (!label) return;
        const customValue = `custom::${label}::text::${sectionName}`;
        const existing = allSettings.find((s: any) => s.value === customValue);
        if (existing) {
          if (existing.isActive) { toast.info(`${label} is already visible`); return; }
          const u = { type: existing.type, value: existing.value, sortOrder: existing.sortOrder, isActive: true };
          const res = await fetch(`/api/settings/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
          if (!res.ok) throw new Error("API error");
          const ns = allSettings.map((s: any) => s.id === existing.id ? { ...s, isActive: true } : s);
          setAllSettings(ns); pushHistory(ns); await apply(ns);
          toast.success(`Shown: ${label}`);
          return;
        }
        const maxSort = allSettings.length;
        const postRes = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: settingsType, value: customValue, sortOrder: maxSort + 1, isActive: true }) });
        if (!postRes.ok) throw new Error("API error");
        toast.success(`Added custom field: ${label} → ${sectionName}`);
      }
      // Refresh from server to get real IDs
      const refresh = await fetch(`/api/settings?type=${settingsType}`).then((r) => r.json());
      if (refresh.success) { setAllSettings(refresh.data); await apply(refresh.data); }
    } catch { toast.error("Failed to add field"); }
  };

  const sections = categorySectionOrder.map((secName) => ({
    name: secName,
    fields: orderedFields.filter((f) => f.section === secName),
  })).filter((s) => s.fields.length > 0 || editMode);

  const onSubmit = async (data: MaterialFormValues) => {
    setSaving(true);
    try {
      // Merge with defaultValues so unrendered fields (not in current category) keep their original values
      const merged = { ...(defaultValues || {}), ...data };
      const url = isEditing ? `/api/materials/${materialId}` : "/api/materials";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(merged) });
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
      case "number": {
        const isRemain = field.key === "currentQuantity";
        return wrapper(<Input type="number" step="0.01" {...register(key as any)} readOnly={isRemain} className={isRemain ? "bg-slate-50 text-emerald-600 font-medium" : ""} />);
      }
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
      default: {
        const isAuto = field.key === "materialId" || field.key === "currentQuantity" || field.key === "status" || field.key === "productCode";
        return wrapper(<Input {...register(key as any)} placeholder={field.placeholder} readOnly={isAuto} className={isAuto ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""} />);
      }
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
          setEditMode(!editMode); setEditingField(null); setEditingLabel(null); setEditingType(null);
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
                    <div className="flex items-center gap-1 mb-2 bg-slate-50 rounded-lg px-2 py-1 flex-wrap">
                      <button type="button" onClick={() => moveField(field.key, -1)} className="text-slate-500 hover:text-slate-700 p-0.5"><ChevronUp className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => moveField(field.key, 1)} className="text-slate-500 hover:text-slate-700 p-0.5"><ChevronDown className="h-3.5 w-3.5" /></button>
                      {/* Key */}
                      {editingField === field.key ? (
                        <ComboBox value="" onChange={(v) => { if (v) { const nk = v.split(" — ")[0]; if (MATERIAL_FIELD_REGISTRY[nk]) editField(field.key, nk); } }}
                          options={Object.keys(MATERIAL_FIELD_REGISTRY).filter((k) => k !== field.key).map((k) => `${k} — ${MATERIAL_FIELD_REGISTRY[k].label}`)}
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
                          field.type==="combobox"?"bg-purple-100 text-purple-700 border-purple-200":field.type==="checkbox"?"bg-amber-100 text-amber-700 border-amber-200":field.type==="date"?"bg-blue-100 text-blue-700 border-blue-200":field.type==="number"?"bg-teal-100 text-teal-700 border-teal-200":field.type==="textarea"?"bg-pink-100 text-pink-700 border-pink-200":"bg-slate-100 text-slate-600 border-slate-200")}>
                        {(["text","combobox","checkbox","date","number","textarea"] as FieldDef["type"][]).map((t) => (<option key={t} value={t}>{t}</option>))}
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
