"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboBox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Settings2, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { APPLY_FIELD_REGISTRY, APPLY_SECTION_ORDER, FieldDef } from "@/lib/field-registry";
import { CATEGORIES, PURPOSES } from "@/lib/constants";

const BASE_OPTIONS: Record<string, string[]> = {
  department: ["SURG","ANA","ONC","COS","ORT","NS","ENT","DENTAL","RAD","PAED","Other"],
  hospital: ["QEH","Other"], rank: ["CON","COS","Physicist","MO","Other"],
  case_category: [...CATEGORIES], purpose: Object.values(PURPOSES).flat(),
  model_type: ["Anatomical Model","Device / Tool","Anatomical + Device"],
  service_option: ["Segmentation","Design","Printing","Segmentation, Design","Segmentation, Printing","Design, Printing","Segmentation, Design, Printing"],
  sterilization: ["Yes","No"],
};

export default function ApplyManagePage() {
  const [orderedFields, setOrderedFields] = useState<FieldDef[]>([]);
  const [form, setForm] = useState<Record<string, any>>({});
  const [optionsMap, setOptionsMap] = useState<Record<string, string[]>>(BASE_OPTIONS);

  // Edit Layout state
  const [editMode, setEditMode] = useState(false);
  const [allSettings, setAllSettings] = useState<any[]>([]);
  const [defaultSettings, setDefaultSettings] = useState<any[]>([]);
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [editingField, setEditingField] = useState<string | null>(null);

  const applySettings = async (settings: any[]) => {
    const active = settings.filter((s: any) => s.isActive).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    const fields: FieldDef[] = [];
    for (const item of active) {
      const val = item.value.trim();
      if (val.startsWith("custom::")) {
        const parts = val.split("::");
        fields.push({ key: val, label: parts[1] || "Custom Field", section: parts[3] || "Part I — Applicant Information", type: (parts[2] || "text") as FieldDef["type"] });
      } else if (APPLY_FIELD_REGISTRY[val]) {
        fields.push({ ...APPLY_FIELD_REGISTRY[val] });
      }
    }
    setOrderedFields(fields);
    setForm((prev) => { const next = { ...prev }; for (const f of fields) { if (!(f.key in next)) next[f.key] = f.defaultValue ?? ""; } return next; });
  };

  const pushHistory = (s: any[]) => { const h = history.slice(0, historyIdx + 1); h.push(JSON.parse(JSON.stringify(s))); if (h.length > 50) h.shift(); setHistory(h); setHistoryIdx(h.length - 1); };
  const undo = async () => { if (historyIdx <= 0) return; const p = history[historyIdx - 1]; setHistoryIdx(historyIdx - 1); setAllSettings(p); await applySettings(p); };
  const redo = async () => { if (historyIdx >= history.length - 1) return; const n = history[historyIdx + 1]; setHistoryIdx(historyIdx + 1); setAllSettings(n); await applySettings(n); };
  const resetToDefault = async () => { for (const s of allSettings) { const d = defaultSettings.find((x: any) => x.value === s.value); await fetch(`/api/settings/${s.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, isActive: d ? d.isActive : true, sortOrder: d ? d.sortOrder : s.sortOrder }) }); } setAllSettings(defaultSettings); pushHistory(defaultSettings); await applySettings(defaultSettings); toast.success("Reset to default"); };

  const removeField = async (k: string) => {
    const e = allSettings.find((s: any) => s.value === k); if (!e) return;
    const u = { ...e, isActive: false };
    await fetch(`/api/settings/${e.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
    const ns = allSettings.map((s: any) => s.id === e.id ? u : s); setAllSettings(ns); pushHistory(ns); await applySettings(ns);
    toast.success(`Removed: ${k.startsWith("custom::") ? k.split("::")[1] : (APPLY_FIELD_REGISTRY[k]?.label || k)}`);
  };

  const editField = async (oldV: string, newK: string) => {
    const e = allSettings.find((s: any) => s.value === oldV); if (!e || oldV === newK) { setEditingField(null); return; }
    const u = { ...e, value: newK };
    await fetch(`/api/settings/${e.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
    const ns = allSettings.map((s: any) => s.id === e.id ? u : s); setAllSettings(ns); pushHistory(ns); await applySettings(ns);
    toast.success(`Changed: ${newK.startsWith("custom::") ? newK.split("::")[1] : (APPLY_FIELD_REGISTRY[newK]?.label || newK)}`);
    setEditingField(null);
  };

  const move = async (k: string, dir: -1 | 1) => {
    const sorted = [...allSettings].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    const i = sorted.findIndex((s: any) => s.value === k); if (i < 0 || !sorted[i + dir]) return;
    const a = sorted[i], b = sorted[i + dir];
    await fetch(`/api/settings/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...a, sortOrder: b.sortOrder }) });
    await fetch(`/api/settings/${b.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...b, sortOrder: a.sortOrder }) });
    const ns = allSettings.map((s: any) => s.id === a.id ? { ...a, sortOrder: b.sortOrder } : s.id === b.id ? { ...b, sortOrder: a.sortOrder } : s);
    setAllSettings(ns); pushHistory(ns); await applySettings(ns);
  };

  const addNewField = async (input: string, sectionName: string) => {
    const rkey = input.includes(" — ") ? input.split(" — ")[0] : null;
    const fd = rkey ? APPLY_FIELD_REGISTRY[rkey] : null;
    const val = fd ? rkey! : `custom::${input.trim()}::text::${sectionName}`;
    const ex = allSettings.find((s: any) => s.value === val);
    if (ex) {
      if (ex.isActive) { toast.info(`${input.trim()} is already visible`); return; }
      const u = { ...ex, isActive: true }; await fetch(`/api/settings/${ex.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
      const ns = allSettings.map((s: any) => s.id === ex.id ? u : s); setAllSettings(ns); pushHistory(ns); await applySettings(ns); return;
    }
    const lastInSection = allSettings.filter((s: any) => s.value.startsWith("custom::") ? s.value.endsWith(`::${sectionName}`) : APPLY_FIELD_REGISTRY[s.value]?.section === sectionName);
    const maxSort = lastInSection.length > 0 ? Math.max(...lastInSection.map((s: any) => s.sortOrder)) : allSettings.length;
    const newEntry = { id: `temp-${Date.now()}`, type: "apply_form_field", value: val, sortOrder: maxSort + 1, isActive: true };
    const ns = [...allSettings, newEntry]; setAllSettings(ns); pushHistory(ns); await applySettings(ns);
    await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "apply_form_field", value: val, sortOrder: maxSort + 1, isActive: true }) });
    toast.success(`Added: ${fd ? fd.label : input.trim()} → ${sectionName}`);
    const res = await fetch("/api/settings?type=apply_form_field").then((r) => r.json());
    if (res.success) { setAllSettings(res.data); await applySettings(res.data); }
  };

  // Load settings & options
  useEffect(() => {
    fetch("/api/settings?type=apply_form_field")
      .then((r) => r.json()).then((j) => {
        if (j.success) { setAllSettings(j.data); setDefaultSettings(JSON.parse(JSON.stringify(j.data))); setHistory([JSON.parse(JSON.stringify(j.data))]); setHistoryIdx(0); applySettings(j.data); }
      }).catch(() => {});
    fetch("/api/settings").then((r) => r.json()).then((j) => {
      if (j.success) { const map = { ...BASE_OPTIONS }; for (const item of j.data) { if (item.isActive && !item.type.endsWith("_form_field") && item.type !== "progress_step") { if (!map[item.type]) map[item.type] = []; if (!map[item.type].includes(item.value)) map[item.type].push(item.value); } } setOptionsMap(map); }
    }).catch(() => {});
  }, []);

  // Auto-refresh options when new ones are created
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

  const sections = APPLY_SECTION_ORDER.map((name) => ({
    name, fields: orderedFields.filter((f) => f.section === name),
  })).filter((s) => s.fields.length > 0);

  const renderField = (field: FieldDef) => {
    const wrapper = (c: React.ReactNode) => (
      <div className="space-y-1.5" key={field.key}>
        <Label className="text-sm font-medium">{field.label}{field.required ? " *" : ""}</Label>{c}
      </div>
    );
    switch (field.type) {
      case "date": return wrapper(<Input type="date" value={form[field.key] || ""} onChange={(e) => setForm((f: any) => ({ ...f, [field.key]: e.target.value }))} />);
      case "textarea": return wrapper(<Textarea value={form[field.key] || ""} onChange={(e) => setForm((f: any) => ({ ...f, [field.key]: e.target.value }))} rows={3} />);
      case "number": return wrapper(<Input type="number" value={form[field.key] || ""} onChange={(e) => setForm((f: any) => ({ ...f, [field.key]: parseInt(e.target.value) || 1 }))} min={1} />);
      case "combobox":
        const isPurpose = field.key === "purpose";
        const category = form["category"];
        const opts = isPurpose && category && PURPOSES[category] ? PURPOSES[category] : (field.options ? (optionsMap[field.options] || BASE_OPTIONS[field.options] || []) : []);
        return wrapper(<ComboBox value={form[field.key] || ""} onChange={(v) => setForm((f: any) => ({ ...f, [field.key]: v }))} options={opts} placeholder={`Select ${field.label.toLowerCase()}`} settingsType={field.options} disabled={isPurpose && !category} />);
      default: return wrapper(<Input value={form[field.key] || ""} onChange={(e) => setForm((f: any) => ({ ...f, [field.key]: e.target.value }))} placeholder={field.placeholder} />);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Manage Application Form</h2>
        <p className="text-sm text-slate-500 mt-1">Edit form layout — changes reflect on the public <code className="bg-slate-100 px-1 rounded text-xs">/apply</code> page</p>
      </div>

      {/* Edit Layout Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {editMode && (<>
            <Button type="button" variant="outline" size="sm" className="text-xs gap-1" onClick={undo} disabled={historyIdx <= 0}>↶ Undo</Button>
            <Button type="button" variant="outline" size="sm" className="text-xs gap-1" onClick={redo} disabled={historyIdx >= history.length - 1}>↷ Redo</Button>
            <Button type="button" variant="outline" size="sm" className="text-xs text-red-500" onClick={resetToDefault}>Reset to default</Button>
          </>)}
        </div>
        <Button type="button" variant={editMode ? "default" : "outline"} size="sm" className="gap-2" onClick={async () => {
          if (!editMode) { const r = await fetch("/api/settings?type=apply_form_field").then(r => r.json()); if (r.success) { setAllSettings(r.data); setDefaultSettings(JSON.parse(JSON.stringify(r.data))); setHistory([JSON.parse(JSON.stringify(r.data))]); setHistoryIdx(0); await applySettings(r.data); } }
          setEditMode(!editMode);
        }}><Settings2 className="h-4 w-4" />{editMode ? "Done Editing" : "Edit Layout"}</Button>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.name} className={cn("overflow-visible border-0 shadow-sm", editMode && "ring-2 ring-indigo-200")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{section.name}</CardTitle>
              {editMode && <p className="text-[11px] text-slate-400">↑↓ reorder · click key to change · trash to remove</p>}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map((field) => (
                  <div key={field.key} className={cn("relative", editMode && "rounded-lg border-2 border-dashed border-slate-200 p-3 hover:border-indigo-300 transition-colors")}>
                    {editMode && (
                      <div className="flex items-center gap-1 mb-2 bg-slate-50 rounded-lg px-2 py-1">
                        <button type="button" onClick={() => move(field.key, -1)} className="text-slate-500 hover:text-slate-700 p-0.5"><ChevronUp className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => move(field.key, 1)} className="text-slate-500 hover:text-slate-700 p-0.5"><ChevronDown className="h-3.5 w-3.5" /></button>
                        {editingField === field.key ? (
                          <ComboBox value="" onChange={(v) => { if (v) { const nk = v.split(" — ")[0]; if (APPLY_FIELD_REGISTRY[nk]) editField(field.key, nk); } }} options={Object.keys(APPLY_FIELD_REGISTRY).filter((k) => k !== field.key).map((k) => `${k} — ${APPLY_FIELD_REGISTRY[k].label}`)} placeholder="Replace..." className="flex-1 min-w-0" />
                        ) : (
                          <button type="button" onClick={() => setEditingField(field.key)} className="flex-1 text-center text-[11px] text-slate-500 font-mono hover:text-indigo-600 hover:bg-indigo-50 rounded px-1 py-0.5 transition-colors" title="Click to change">{field.key.startsWith("custom::") ? field.key.split("::")[1] : field.key}</button>
                        )}
                        <button type="button" onClick={() => removeField(field.key)} className="p-0.5 shrink-0" title="Remove"><Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" /></button>
                      </div>
                    )}
                    {renderField(field)}
                  </div>
                ))}
                {editMode && (
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-6 min-h-[80px]">
                    <ComboBox value="" onChange={(v) => { if (v) addNewField(v, section.name); }} options={Object.keys(APPLY_FIELD_REGISTRY).filter((k) => !orderedFields.find((f) => f.key === k)).map((k) => `${k} — ${APPLY_FIELD_REGISTRY[k].label}`)} placeholder="Type or select field..." />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
