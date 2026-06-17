"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboBox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Settings2, Trash2, ChevronUp, ChevronDown, Plus, RotateCcw } from "lucide-react";
import { APPLY_FIELD_REGISTRY, APPLY_SECTION_ORDER, FieldDef } from "@/lib/field-registry";
import { CATEGORIES, PURPOSES } from "@/lib/constants";

export default function ApplyManagePage() {
  const [orderedFields, setOrderedFields] = useState<FieldDef[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [allSettings, setAllSettings] = useState<any[]>([]);
  const [defaultSettings, setDefaultSettings] = useState<any[]>([]);
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<string | null>(null);

  // --- Purpose options management ---
  const [purposeTab, setPurposeTab] = useState<string>(CATEGORIES[0]);
  const [purposeItems, setPurposeItems] = useState<Record<string, any[]>>({});

  const settingsType = "apply_form_field";

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
        fields.push({ key: val, label: parts[1] || "Custom Field", section: parts[3] || APPLY_SECTION_ORDER[0], type: (parts[2] || "text") as FieldDef["type"] });
      } else if (APPLY_FIELD_REGISTRY[val]) {
        fields.push({ ...APPLY_FIELD_REGISTRY[val] });
      }
    }
    setOrderedFields(fields);
  };

  const pushHistory = (s: any[]) => {
    const h = history.slice(0, historyIdx + 1);
    h.push(JSON.parse(JSON.stringify(s)));
    if (h.length > 50) h.shift();
    setHistory(h);
    setHistoryIdx(h.length - 1);
  };

  const undo = async () => { if (historyIdx <= 0) return; const p = history[historyIdx - 1]; setHistoryIdx(historyIdx - 1); setAllSettings(p); await applySettings(p); };
  const redo = async () => { if (historyIdx >= history.length - 1) return; const n = history[historyIdx + 1]; setHistoryIdx(historyIdx + 1); setAllSettings(n); await applySettings(n); };

  const resetToDefault = async () => {
    for (const s of allSettings) {
      const d = defaultSettings.find((x: any) => x.value === s.value);
      await fetch(`/api/settings/${s.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, isActive: d ? d.isActive : true, sortOrder: d ? d.sortOrder : s.sortOrder }) });
    }
    setAllSettings(defaultSettings); pushHistory(defaultSettings); await applySettings(defaultSettings);
    toast.success("Reset to default");
  };

  const toggleField = async (key: string) => {
    const e = allSettings.find((s: any) => s.value === key);
    if (!e) return;
    const u = { ...e, isActive: !e.isActive };
    await fetch(`/api/settings/${e.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
    const ns = allSettings.map((s: any) => s.id === e.id ? u : s);
    setAllSettings(ns); pushHistory(ns); await applySettings(ns);
    const label = key.startsWith("custom::") ? key.split("::")[1] : (APPLY_FIELD_REGISTRY[key]?.label || key);
    toast.success(u.isActive ? `Shown: ${label}` : `Hidden: ${label}`);
  };

  const removeField = async (key: string) => {
    const e = allSettings.find((s: any) => s.value === key);
    if (!e) return;
    const u = { ...e, isActive: false };
    await fetch(`/api/settings/${e.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
    const ns = allSettings.map((s: any) => s.id === e.id ? u : s);
    setAllSettings(ns); pushHistory(ns); await applySettings(ns);
    const label = key.startsWith("custom::") ? key.split("::")[1] : (APPLY_FIELD_REGISTRY[key]?.label || key);
    toast.success(`Removed: ${label}`);
  };

  const editField = async (oldValue: string, newKey: string) => {
    const e = allSettings.find((s: any) => s.value === oldValue);
    if (!e || oldValue === newKey) { setEditingField(null); return; }
    const u = { ...e, value: newKey };
    await fetch(`/api/settings/${e.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
    const ns = allSettings.map((s: any) => s.id === e.id ? u : s);
    setAllSettings(ns); pushHistory(ns); await applySettings(ns);
    const newLabel = newKey.startsWith("custom::") ? newKey.split("::")[1] : (APPLY_FIELD_REGISTRY[newKey]?.label || newKey);
    toast.success(`Changed: ${newLabel}`);
    setEditingField(null);
  };

  const moveField = async (key: string, dir: -1 | 1) => {
    const sorted = [...allSettings].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((s: any) => s.value === key);
    if (idx < 0 || !sorted[idx + dir]) return;
    const a = sorted[idx], b = sorted[idx + dir];
    const ua = { ...a, sortOrder: b.sortOrder }, ub = { ...b, sortOrder: a.sortOrder };
    await fetch(`/api/settings/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ua) });
    await fetch(`/api/settings/${b.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ub) });
    const ns = allSettings.map((s: any) => s.id === a.id ? ua : s.id === b.id ? ub : s);
    setAllSettings(ns); pushHistory(ns); await applySettings(ns);
  };

  // Parse a setting value into { key, label, type, section }
  const parseFieldValue = (val: string, currentSection: string) => {
    if (val.startsWith("custom::")) {
      const parts = val.split("::");
      return { key: val, label: parts[1] || "", type: (parts[2] || "text") as FieldDef["type"], section: parts[3] || currentSection, isCustom: true };
    }
    const reg = APPLY_FIELD_REGISTRY[val];
    if (reg) return { key: val, label: reg.label, type: reg.type, section: reg.section, isCustom: false };
    return { key: val, label: val, type: "text" as FieldDef["type"], section: currentSection, isCustom: false };
  };

  const updateFieldLabel = async (settingKey: string, newLabel: string) => {
    const trimmed = newLabel.trim();
    if (!trimmed || trimmed === parseFieldValue(settingKey, APPLY_SECTION_ORDER[0]).label) { setEditingLabel(null); return; }
    const setting = allSettings.find((s: any) => s.value === settingKey);
    if (!setting) { toast.error("Field not found"); setEditingLabel(null); return; }
    try {
      const parsed = parseFieldValue(setting.value, APPLY_SECTION_ORDER[0]);
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
      const parsed = parseFieldValue(setting.value, APPLY_SECTION_ORDER[0]);
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

  const addCustomField = async (label: string, sectionName: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const customValue = `custom::${trimmed}::text::${sectionName}`;
    const existing = allSettings.find((s: any) => s.value === customValue);
    if (existing) {
      if (existing.isActive) { toast.info(`"${trimmed}" already exists`); return; }
      const u = { ...existing, isActive: true };
      await fetch(`/api/settings/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
      const ns = allSettings.map((s: any) => s.id === existing.id ? u : s);
      setAllSettings(ns); pushHistory(ns); await applySettings(ns);
      toast.success(`Restored: ${trimmed}`);
      return;
    }
    const lastInSection = allSettings.filter((s: any) => {
      const reg = APPLY_FIELD_REGISTRY[s.value];
      return reg && reg.section === sectionName;
    });
    const maxSort = lastInSection.length > 0 ? Math.max(...lastInSection.map((s: any) => s.sortOrder)) : allSettings.length;
    const newEntry = { id: `temp-${Date.now()}`, type: settingsType, value: customValue, sortOrder: maxSort + 1, isActive: true };
    const updatedSettings = [...allSettings, newEntry];
    setAllSettings(updatedSettings); pushHistory(updatedSettings); await applySettings(updatedSettings);
    const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: settingsType, value: customValue, sortOrder: maxSort + 1, isActive: true }) });
    if (res.ok) toast.success(`Added: ${trimmed} → ${sectionName}`);
    const refresh = await fetch(`/api/settings?type=${settingsType}`).then((r) => r.json());
    if (refresh.success) { setAllSettings(refresh.data); await applySettings(refresh.data); }
  };

  const addRegistryField = async (fieldKey: string) => {
    const fd = APPLY_FIELD_REGISTRY[fieldKey];
    if (!fd) return;
    const existing = allSettings.find((s: any) => s.value === fieldKey);
    if (existing) {
      if (existing.isActive) { toast.info(`${fd.label} is already visible`); return; }
      const u = { ...existing, isActive: true };
      await fetch(`/api/settings/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
      const ns = allSettings.map((s: any) => s.id === existing.id ? u : s);
      setAllSettings(ns); pushHistory(ns); await applySettings(ns);
      toast.success(`Shown: ${fd.label}`);
      return;
    }
    const inSection = allSettings.filter((s: any) => {
      const reg = APPLY_FIELD_REGISTRY[s.value];
      return reg && reg.section === fd.section;
    });
    const maxSort = inSection.length > 0 ? Math.max(...inSection.map((s: any) => s.sortOrder)) : allSettings.length;
    const newEntry = { id: `temp-${Date.now()}`, type: settingsType, value: fieldKey, sortOrder: maxSort + 1, isActive: true };
    const updatedSettings = [...allSettings, newEntry];
    setAllSettings(updatedSettings); pushHistory(updatedSettings); await applySettings(updatedSettings);
    await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: settingsType, value: fieldKey, sortOrder: maxSort + 1, isActive: true }) });
    toast.success(`Added: ${fd.label} → ${fd.section}`);
    const refresh = await fetch(`/api/settings?type=${settingsType}`).then((r) => r.json());
    if (refresh.success) { setAllSettings(refresh.data); await applySettings(refresh.data); }
  };

  // --- Purpose options management ---
  const loadPurposeOptions = async (cat: string) => {
    const st = `purpose_${cat}`;
    const res = await fetch(`/api/settings?type=${st}`).then((r) => r.json());
    if (res.success && res.data.length > 0) {
      setPurposeItems((prev) => ({ ...prev, [cat]: res.data.sort((a: any, b: any) => a.sortOrder - b.sortOrder) }));
    } else {
      setPurposeItems((prev) => ({ ...prev, [cat]: (PURPOSES[cat] || []).map((v, i) => ({ id: `default-${cat}-${i}`, value: v, sortOrder: i, isActive: true })) }));
    }
  };

  const togglePurposeOption = async (cat: string, item: any) => {
    const st = `purpose_${cat}`;
    const updated = { ...item, isActive: !item.isActive };
    await fetch(`/api/settings/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    setPurposeItems((prev) => ({
      ...prev, [cat]: (prev[cat] || []).map((p: any) => p.id === item.id ? updated : p),
    }));
  };

  const addPurposeOption = async (cat: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const st = `purpose_${cat}`;
    const current = purposeItems[cat] || [];
    if (current.find((p: any) => p.value.toLowerCase() === trimmed.toLowerCase() && p.isActive)) {
      toast.info(`"${trimmed}" already exists`); return;
    }
    const maxSort = current.length > 0 ? Math.max(...current.map((p: any) => p.sortOrder)) : -1;
    const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: st, value: trimmed, sortOrder: maxSort + 1, isActive: true }) });
    if (res.ok) {
      const json = await res.json();
      setPurposeItems((prev) => ({ ...prev, [cat]: [...current, { id: json.data.id, value: trimmed, sortOrder: maxSort + 1, isActive: true }] }));
      toast.success(`Added: ${trimmed}`);
    }
  };

  const movePurposeOption = async (cat: string, idx: number, dir: -1 | 1) => {
    const items = [...(purposeItems[cat] || [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const a = items[idx], b = items[target];
    const ua = { ...a, sortOrder: b.sortOrder }, ub = { ...b, sortOrder: a.sortOrder };
    await fetch(`/api/settings/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ua) });
    await fetch(`/api/settings/${b.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ub) });
    setPurposeItems((prev) => ({
      ...prev, [cat]: (prev[cat] || []).map((p: any) => p.id === a.id ? ua : p.id === b.id ? ub : p),
    }));
  };

  // --- Init ---
  useEffect(() => {
    fetch(`/api/settings?type=${settingsType}`)
      .then((r) => r.json()).then((j) => {
        if (j.success && j.data.length > 0) {
          setAllSettings(j.data);
          setDefaultSettings(JSON.parse(JSON.stringify(j.data)));
          setHistory([JSON.parse(JSON.stringify(j.data))]);
          setHistoryIdx(0);
          applySettings(j.data);
        } else {
          // Seed defaults from registry
          const defaults = APPLY_SECTION_ORDER.flatMap((section, si) =>
            Object.values(APPLY_FIELD_REGISTRY)
              .filter((f) => f.section === section)
              .map((f, fi) => ({ id: `default-${f.key}`, type: settingsType, value: f.key, sortOrder: si * 100 + fi, isActive: true }))
          );
          setAllSettings(defaults);
          setDefaultSettings(JSON.parse(JSON.stringify(defaults)));
          setHistory([JSON.parse(JSON.stringify(defaults))]);
          setHistoryIdx(0);
          applySettings(defaults);
          // Persist defaults & refresh to get real IDs
          Promise.all(defaults.map((d) =>
            fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: settingsType, value: d.value, sortOrder: d.sortOrder, isActive: true }) })
          )).then(() =>
            fetch(`/api/settings?type=${settingsType}`).then((r) => r.json()).then((refreshed) => {
              if (refreshed.success && refreshed.data.length > 0) {
                setAllSettings(refreshed.data);
                setDefaultSettings(JSON.parse(JSON.stringify(refreshed.data)));
                setHistory([JSON.parse(JSON.stringify(refreshed.data))]);
                applySettings(refreshed.data);
              }
            })
          ).catch(() => {});
        }
      }).catch(() => {});
    CATEGORIES.forEach((cat) => loadPurposeOptions(cat));
  }, []);

  useEffect(() => {
    const handler = () => {
      fetch(`/api/settings?type=${settingsType}`).then((r) => r.json()).then((j) => {
        if (j.success && j.data.length > 0) { setAllSettings(j.data); applySettings(j.data); }
      });
    };
    window.addEventListener("settings-updated", handler);
    return () => window.removeEventListener("settings-updated", handler);
  }, []);

  const sections = APPLY_SECTION_ORDER.map((name) => ({
    name,
    fields: orderedFields.filter((f) => f.section === name),
  })).filter((s) => s.fields.length > 0 || editMode);

  // All registry keys not yet in orderedFields
  const availableRegistryKeys = Object.keys(APPLY_FIELD_REGISTRY).filter(
    (k) => !orderedFields.find((f) => f.key === k)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Manage Application Form</h2>
        <p className="text-sm text-slate-500 mt-1">
          Edit the public <code className="bg-slate-100 px-1 rounded text-xs">/apply</code> form layout.
          Toggle fields, reorder, or add custom fields. Changes are live.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {editMode && (
            <>
              <Button type="button" variant="outline" size="sm" className="text-xs gap-1" onClick={undo} disabled={historyIdx <= 0}>↶ Undo</Button>
              <Button type="button" variant="outline" size="sm" className="text-xs gap-1" onClick={redo} disabled={historyIdx >= history.length - 1}>↷ Redo</Button>
              <Button type="button" variant="outline" size="sm" className="text-xs text-red-500 gap-1" onClick={resetToDefault}><RotateCcw className="h-3 w-3" />Reset to default</Button>
            </>
          )}
        </div>
        <Button type="button" variant={editMode ? "default" : "outline"} size="sm" className="gap-2"
          onClick={async () => {
            if (!editMode) {
              const r = await fetch(`/api/settings?type=${settingsType}`).then((r) => r.json());
              if (r.success) { setAllSettings(r.data); setDefaultSettings(JSON.parse(JSON.stringify(r.data))); setHistory([JSON.parse(JSON.stringify(r.data))]); setHistoryIdx(0); await applySettings(r.data); }
            }
            setEditMode(!editMode); setEditingField(null); setEditingLabel(null); setEditingType(null);
          }}>
          <Settings2 className="h-4 w-4" />{editMode ? "Done Editing" : "Edit Layout"}
        </Button>
      </div>

      {/* Form sections preview */}
      <div className="space-y-6">
        {sections.map((section) => {
          const activeFields = section.fields.filter((f) =>
            allSettings.find((s: any) => s.value === f.key)?.isActive !== false
          );
          if (!editMode && activeFields.length === 0) return null;

          return (
            <Card key={section.name} className={cn("overflow-visible border-0 shadow-sm", editMode && "ring-2 ring-primary/20")}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{section.name}</CardTitle>
                {editMode && <p className="text-[11px] text-slate-400">↑↓ reorder · toggle to show/hide · trash to remove · click tag to change field</p>}
              </CardHeader>
              <CardContent>
                {editMode ? (
                  /* EDIT MODE: all fields with controls */
                  <div className="space-y-3">
                    {section.fields.map((field, idx) => {
                      const setting = allSettings.find((s: any) => s.value === field.key);
                      const isActive = setting?.isActive !== false;
                      return (
                        <div key={field.key} className={cn(
                          "flex items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-colors",
                          isActive ? "border-slate-200 hover:border-primary/30" : "border-red-100 bg-red-50/30 opacity-60"
                        )}>
                          {/* Reorder */}
                          <div className="flex flex-col gap-0.5">
                            <button type="button" onClick={() => moveField(field.key, -1)} className="text-slate-400 hover:text-slate-600 p-0.5"><ChevronUp className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => moveField(field.key, 1)} className="text-slate-400 hover:text-slate-600 p-0.5"><ChevronDown className="h-3.5 w-3.5" /></button>
                          </div>

                          {/* Field info */}
                          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                            {/* Key (click to replace) */}
                            {editingField === field.key ? (
                              <ComboBox value="" onChange={(v) => { if (v) { const nk = v.split(" — ")[0]; if (APPLY_FIELD_REGISTRY[nk]) editField(field.key, nk); } }}
                                options={Object.keys(APPLY_FIELD_REGISTRY).filter((k) => k !== field.key).map((k) => `${k} — ${APPLY_FIELD_REGISTRY[k].label}`)}
                                placeholder="Replace with..." className="min-w-[140px]" />
                            ) : (
                              <button type="button" onClick={() => setEditingField(field.key)}
                                className="text-[10px] font-mono text-slate-400 hover:text-primary hover:bg-accent rounded px-1 py-0.5 transition-colors shrink-0" title="Click to replace with another field">
                                {field.key.startsWith("custom::") ? "custom" : field.key}
                              </button>
                            )}

                            {/* Type selector — always visible in edit mode */}
                            <select
                              value={field.type}
                              onChange={(e) => updateFieldType(field.key, e.target.value as FieldDef["type"])}
                              className={cn("text-[10px] px-1 py-0.5 rounded font-medium border cursor-pointer shrink-0",
                                field.type === "combobox" ? "bg-purple-100 text-purple-700 border-purple-200" :
                                field.type === "checkbox" ? "bg-amber-100 text-amber-700 border-amber-200" :
                                field.type === "date" ? "bg-blue-100 text-blue-700 border-blue-200" :
                                field.type === "number" ? "bg-teal-100 text-teal-700 border-teal-200" :
                                field.type === "textarea" ? "bg-pink-100 text-pink-700 border-pink-200" :
                                "bg-slate-100 text-slate-600 border-slate-200")}
                            >
                              {(["text", "combobox", "checkbox", "date", "number", "textarea"] as FieldDef["type"][]).map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>

                            {/* Label input — always editable in edit mode */}
                            <input
                              type="text"
                              defaultValue={field.label}
                              onBlur={(e) => updateFieldLabel(field.key, e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); updateFieldLabel(field.key, (e.target as HTMLInputElement).value); } }}
                              className="text-sm font-medium text-slate-700 border-b-2 border-slate-200 focus:border-primary/60 outline-none px-1 min-w-[80px] bg-transparent"
                              placeholder="Field name"
                            />
                            {field.required && <span className="text-red-400 text-xs">*</span>}
                          </div>

                          {/* Controls */}
                          <button type="button" onClick={() => toggleField(field.key)}
                            className={cn("px-2 py-1 text-xs font-medium rounded transition-colors", isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                            {isActive ? "Visible" : "Hidden"}
                          </button>
                          <button type="button" onClick={() => removeField(field.key)}
                            className="p-1 text-slate-400 hover:text-red-500 shrink-0" title="Remove field">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                    {/* Add field to this section */}
                    <div className="flex items-center gap-2 pt-2">
                      <ComboBox value="" onChange={(v) => { if (v) addRegistryField(v); }}
                        options={availableRegistryKeys.filter((k) => APPLY_FIELD_REGISTRY[k].section === section.name).map((k) => `${k} — ${APPLY_FIELD_REGISTRY[k].label}`)}
                        placeholder="Add field from registry..." className="flex-1" />
                      <span className="text-xs text-slate-300">or</span>
                      <div className="flex gap-1 flex-1">
                        <Input placeholder="Custom field name..." className="h-9 text-sm" onKeyDown={(e) => { if (e.key === "Enter") { addCustomField((e.target as HTMLInputElement).value, section.name); (e.target as HTMLInputElement).value = ""; } }} />
                        <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={(e) => { const inp = (e.currentTarget.parentElement?.querySelector("input") as HTMLInputElement); if (inp?.value) { addCustomField(inp.value, section.name); inp.value = ""; } }}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* PREVIEW MODE: show active fields compactly */
                  <div className="flex flex-wrap gap-3">
                    {activeFields.map((field) => (
                      <div key={field.key} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                        <span className={cn("text-[10px] font-bold uppercase px-1 rounded", field.type === "combobox" ? "text-purple-600" : field.type === "checkbox" ? "text-amber-600" : field.type === "date" ? "text-blue-600" : "text-slate-500")}>{field.type}</span>
                        <span className="text-slate-700">{field.label}</span>
                        {field.required && <span className="text-red-400 text-xs">*</span>}
                      </div>
                    ))}
                    {activeFields.length === 0 && <p className="text-sm text-slate-400 py-4">No fields visible. Click Edit Layout to add fields.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Purpose Checkbox Options */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Purpose Checkbox Options</CardTitle>
          <p className="text-xs text-slate-400">Manage checkbox options under each purpose category</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
            {CATEGORIES.map((cat) => (
              <button key={cat} type="button" onClick={() => setPurposeTab(cat)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${purposeTab === cat ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{cat}</button>
            ))}
          </div>

          <div className="space-y-1">
            {(purposeItems[purposeTab] || []).sort((a, b) => a.sortOrder - b.sortOrder).map((item: any, idx: number) => (
              <div key={item.id} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg group", !item.isActive && "opacity-40")}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span className="flex-1 text-sm text-slate-700">{item.value}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => movePurposeOption(purposeTab, idx, -1)} disabled={idx === 0} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => movePurposeOption(purposeTab, idx, 1)} disabled={idx === (purposeItems[purposeTab] || []).length - 1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => togglePurposeOption(purposeTab, item)}
                    className={cn("px-2 py-0.5 text-[10px] font-medium rounded", item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                    {item.isActive ? "Visible" : "Hidden"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Input placeholder="New checkbox option..." className="max-w-xs" id="purpose-new-input"
              onKeyDown={(e) => { if (e.key === "Enter") { addPurposeOption(purposeTab, (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; } }} />
            <Button type="button" size="sm" variant="outline" className="gap-1"
              onClick={() => { const inp = document.getElementById("purpose-new-input") as HTMLInputElement; if (inp?.value) { addPurposeOption(purposeTab, inp.value); inp.value = ""; } }}>
              <Plus className="h-4 w-4" />Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
