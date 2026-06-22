"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, Plus, Eye, EyeOff, Trash2 } from "lucide-react";
import { APPLY_FIELD_REGISTRY, APPLY_SECTION_ORDER, FieldDef } from "@/lib/field-registry";
import { CATEGORIES, PURPOSES } from "@/lib/constants";
import { AddFieldModal } from "@/components/shared/add-field-modal";
import { FormLayoutToolbar } from "@/components/shared/form-layout-toolbar";

export default function ApplyManagePage() {
  const [orderedFields, setOrderedFields] = useState<FieldDef[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [allSettings, setAllSettings] = useState<any[]>([]);
  const [defaultSettings, setDefaultSettings] = useState<any[]>([]);
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalSection, setAddModalSection] = useState("");

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
    setHistory(h); setHistoryIdx(h.length - 1);
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
    window.dispatchEvent(new Event("form-fields-changed"));
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
    window.dispatchEvent(new Event("form-fields-changed"));
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

  const addNewField = async (label: string, type: string, sectionName: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const registryKey = Object.keys(APPLY_FIELD_REGISTRY).find(k => APPLY_FIELD_REGISTRY[k].label.toLowerCase() === trimmed.toLowerCase() || k === trimmed);
    if (registryKey) {
      const fd = APPLY_FIELD_REGISTRY[registryKey];
      const existing = allSettings.find((s: any) => s.value === registryKey);
      if (existing) {
        if (existing.isActive) { toast.info(`${fd.label} is already visible`); return; }
        const u = { ...existing, isActive: true };
        await fetch(`/api/settings/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
        const ns = allSettings.map((s: any) => s.id === existing.id ? u : s);
        setAllSettings(ns); pushHistory(ns); await applySettings(ns);
        toast.success(`Shown: ${fd.label}`);
      } else {
        const maxSort = Math.max(0, ...allSettings.filter((s: any) => APPLY_FIELD_REGISTRY[s.value]?.section === fd.section).map((s: any) => s.sortOrder));
        await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: settingsType, value: registryKey, sortOrder: maxSort + 1, isActive: true }) });
        toast.success(`Added: ${fd.label} → ${fd.section}`);
        const refresh = await fetch(`/api/settings?type=${settingsType}`).then((r) => r.json());
        if (refresh.success) { setAllSettings(refresh.data); await applySettings(refresh.data); }
      }
    } else {
      const customValue = `custom::${trimmed}::${type}::${sectionName}`;
      const existing = allSettings.find((s: any) => s.value === customValue);
      if (existing) {
        if (existing.isActive) { toast.info(`"${trimmed}" already exists`); return; }
        const u = { ...existing, isActive: true };
        await fetch(`/api/settings/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) });
        const ns = allSettings.map((s: any) => s.id === existing.id ? u : s);
        setAllSettings(ns); pushHistory(ns); await applySettings(ns);
        toast.success(`Restored: ${trimmed}`);
      } else {
        const maxSort = allSettings.length;
        await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: settingsType, value: customValue, sortOrder: maxSort + 1, isActive: true }) });
        toast.success(`Added: ${trimmed} → ${sectionName}`);
        const refresh = await fetch(`/api/settings?type=${settingsType}`).then((r) => r.json());
        if (refresh.success) { setAllSettings(refresh.data); pushHistory(refresh.data); await applySettings(refresh.data); }
      }
    }
    window.dispatchEvent(new Event("form-fields-changed"));
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
    setPurposeItems((prev) => ({ ...prev, [cat]: (prev[cat] || []).map((p: any) => p.id === item.id ? updated : p) }));
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
          ).catch(() => toast.error("Failed to load"));
        }
      }).catch(() => toast.error("Failed to load"));
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
  }));

  const totalFields = orderedFields.length;

  // Type badge color map
  const typeColor = (t: string) => {
    switch (t) {
      case "combobox": return "text-purple-600 bg-purple-50";
      case "checkbox": return "text-amber-600 bg-amber-50";
      case "date": return "text-blue-600 bg-blue-50";
      case "number": return "text-teal-600 bg-teal-50";
      case "textarea": return "text-pink-600 bg-pink-50";
      default: return "text-slate-500 bg-slate-100";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Manage Application Form</h2>
          <p className="text-sm text-slate-500 mt-1">
            Edit the public <code className="bg-slate-100 px-1 rounded text-xs">/apply</code> form layout
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (!editMode) {
              const res = await fetch(`/api/settings?type=${settingsType}`).then((r) => r.json());
              if (res.success) {
                setAllSettings(res.data);
                setDefaultSettings(JSON.parse(JSON.stringify(res.data)));
                setHistory([JSON.parse(JSON.stringify(res.data))]);
                setHistoryIdx(0);
                await applySettings(res.data);
              }
            }
            setEditMode(!editMode);
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

      {/* EDIT MODE: Toolbar */}
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

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((section) => {
          const activeFields = section.fields.filter((f) =>
            allSettings.find((s: any) => s.value === f.key)?.isActive !== false
          );
          if (!editMode && activeFields.length === 0) return null;

          return (
            <Card key={section.name} className={cn("overflow-visible border-0 shadow-sm", editMode && "ring-2 ring-blue-100")}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{section.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <div className="space-y-2">
                    {section.fields.map((field, idx) => {
                      const setting = allSettings.find((s: any) => s.value === field.key);
                      const isActive = setting?.isActive !== false;
                      return (
                        <div key={field.key} className={cn(
                          "flex items-center gap-3 rounded-xl ring-1 ring-slate-200 p-3 transition-all group",
                          isActive ? "bg-white hover:ring-blue-300 hover:shadow-sm" : "bg-red-50/30 ring-red-100 opacity-60"
                        )}>
                          <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => moveField(field.key, -1)} className="text-slate-400 hover:text-slate-600 p-0.5"><ChevronUp className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => moveField(field.key, 1)} className="text-slate-400 hover:text-slate-600 p-0.5"><ChevronDown className="h-3.5 w-3.5" /></button>
                          </div>
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", typeColor(field.type))}>{field.type}</span>
                            <span className="text-sm font-medium text-slate-700 truncate">{field.label}</span>
                            {field.required && <span className="text-red-400 text-xs">*</span>}
                          </div>
                          <button type="button" onClick={() => toggleField(field.key)}
                            className={cn("shrink-0 px-2.5 py-1 text-[10px] font-semibold rounded-full transition-colors", isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                            {isActive ? <Eye className="h-3 w-3 inline mr-0.5" /> : <EyeOff className="h-3 w-3 inline mr-0.5" />}
                            {isActive ? "Visible" : "Hidden"}
                          </button>
                          <button type="button" onClick={() => removeField(field.key)}
                            className="shrink-0 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => { setAddModalSection(section.name); setAddModalOpen(true); }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add field to "{section.name}"
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {activeFields.map((field) => (
                      <div key={field.key} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                        <span className={cn("text-[10px] font-bold uppercase px-1 rounded", typeColor(field.type))}>{field.type}</span>
                        <span className="text-slate-700">{field.label}</span>
                        {field.required && <span className="text-red-400 text-xs">*</span>}
                      </div>
                    ))}
                    {activeFields.length === 0 && <p className="text-sm text-slate-400 py-4">No fields visible. Click ✎ Edit Form to add fields.</p>}
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

      {/* Add Field Modal */}
      <AddFieldModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={(label, type, section) => addNewField(label, type, section)}
        sections={sections}
        defaultSection={addModalSection}
      />
    </div>
  );
}
