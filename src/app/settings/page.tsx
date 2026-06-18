"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MasterDataTable } from "@/components/settings/master-data-table";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Search, ChevronDown, ChevronRight, X } from "lucide-react";
import { CASE_FIELD_REGISTRY, MATERIAL_FIELD_REGISTRY, APPLY_FIELD_REGISTRY, MATERIAL_CATEGORY_FIELDS } from "@/lib/field-registry";

const MASTER_DATA_TYPES = [
  { key: "department", title: "Departments" },
  { key: "case_category", title: "Case Categories" },
  { key: "purpose", title: "Purposes" },
  { key: "model_type", title: "Model Types" },
  { key: "ownership", title: "Ownership Types" },
  { key: "rank", title: "Ranks" },
  { key: "priority", title: "Priorities" },
  { key: "case_status", title: "Case Statuses" },
  { key: "hospital", title: "Hospitals" },
  { key: "service_option", title: "Service Options" },
  { key: "technician", title: "Technicians" },
  { key: "printing_party", title: "Printing Parties" },
  { key: "fdm_brand", title: "FDM Brands" },
  { key: "fdm_material_type", title: "FDM Material Types" },
  { key: "fdm_unit", title: "FDM Units" },
  { key: "fdm_status", title: "FDM Statuses" },
  { key: "sla_product", title: "SLA Product Names" },
  { key: "sla_printer", title: "SLA Compatible Printers" },
  { key: "sla_unit", title: "SLA Units" },
  { key: "sla_status", title: "SLA Statuses" },
  { key: "tank_product", title: "Tank Product Names" },
  { key: "tank_resin_type", title: "Tank Resin Types" },
  { key: "tank_unit", title: "Tank Units" },
  { key: "tank_status", title: "Tank Statuses" },
  { key: "ipa_unit", title: "IPA Units" },
  { key: "ipa_status", title: "IPA Statuses" },
  { key: "sterilization", title: "Sterilization Options" },
  { key: "progress_step", title: "Progress Steps" },
  { key: "case_form_field", title: "Case Form Fields" },
  { key: "fdm_form_field", title: "FDM Form Fields" },
  { key: "sla_form_field", title: "SLA Form Fields" },
  { key: "tank_form_field", title: "Tank Form Fields" },
  { key: "ipa_form_field", title: "IPA Form Fields" },
  { key: "apply_form_field", title: "Application Form Fields" },
];

const GROUPS = [
  {
    label: "Case",
    desc: "Dropdown options and form fields",
    items: ["department", "case_category", "purpose", "model_type", "ownership", "rank", "priority", "case_status", "case_form_field"],
  },
  {
    label: "FDM Filaments",
    desc: "Brands, types, units, statuses, form fields",
    items: ["fdm_brand", "fdm_material_type", "fdm_unit", "fdm_status", "fdm_form_field"],
  },
  {
    label: "SLA Resins",
    desc: "Products, printers, units, statuses, form fields",
    items: ["sla_product", "sla_printer", "sla_unit", "sla_status", "sla_form_field"],
  },
  {
    label: "Resin Tanks",
    desc: "Products, resin types, units, statuses, form fields",
    items: ["tank_product", "tank_resin_type", "tank_unit", "tank_status", "tank_form_field"],
  },
  {
    label: "IPA",
    desc: "Units, statuses, form fields",
    items: ["ipa_unit", "ipa_status", "ipa_form_field"],
  },
  {
    label: "Application",
    desc: "Public apply form and shared options",
    items: ["apply_form_field", "hospital", "service_option", "technician", "printing_party", "sterilization", "progress_step"],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, Array<{ id: string; value: string; sortOrder: number; isActive: boolean }>>>({});
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState("department");
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Case": true,
    "FDM Filaments": false,
    "SLA Resins": false,
    "Resin Tanks": false,
    "IPA": false,
    "Application": false,
  });

  const toggleGroup = (label: string) => setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success) {
        const grouped: Record<string, Array<{ id: string; value: string; sortOrder: number; isActive: boolean }>> = {};
        for (const item of json.data) {
          if (!grouped[item.type]) grouped[item.type] = [];
          grouped[item.type].push(item);
        }
        for (const key of Object.keys(grouped)) {
          grouped[key].sort((a, b) => a.sortOrder - b.sortOrder);
        }
        setSettings(grouped);
      }
    } catch (e) { console.error(e); toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Undo/redo for form field types
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const defaultRef = useRef<any[]>([]);

  const formFieldTypes = ["case_form_field", "fdm_form_field", "sla_form_field", "tank_form_field", "ipa_form_field", "apply_form_field"];
  const isFormField = formFieldTypes.includes(activeKey);

  const pushHistory = (items: any[]) => {
    const h = history.slice(0, historyIdx + 1);
    h.push(JSON.parse(JSON.stringify(items)));
    if (h.length > 50) h.shift();
    setHistory(h); setHistoryIdx(h.length - 1);
  };

  const handleUndo = async () => {
    if (historyIdx <= 0) return;
    const prev = history[historyIdx - 1];
    for (const s of prev) await fetch(`/api/settings/${s.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    setHistoryIdx(historyIdx - 1);
    fetchSettings();
  };

  const handleRedo = async () => {
    if (historyIdx >= history.length - 1) return;
    const next = history[historyIdx + 1];
    for (const s of next) await fetch(`/api/settings/${s.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    setHistoryIdx(historyIdx + 1);
    fetchSettings();
  };

  const getDefaultFieldKeys = (type: string): string[] => {
    if (type === "case_form_field") return Object.keys(CASE_FIELD_REGISTRY);
    if (type === "apply_form_field") return Object.keys(APPLY_FIELD_REGISTRY);
    const catMap: Record<string, string> = { fdm_form_field: "FDM Filaments", sla_form_field: "SLA Resins", tank_form_field: "Resin Tanks", ipa_form_field: "IPA" };
    if (catMap[type]) return MATERIAL_CATEGORY_FIELDS[catMap[type]] || [];
    return [];
  };

  const handleReset = async () => {
    const current = settings[activeKey] || [];
    const defaultKeys = getDefaultFieldKeys(activeKey);
    if (isFormField && defaultKeys.length > 0) {
      // Form field: reset to hardcoded registry defaults
      for (const s of current) {
        const shouldBeActive = defaultKeys.includes(s.value);
        const defaultOrder = defaultKeys.indexOf(s.value);
        await fetch(`/api/settings/${s.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, isActive: shouldBeActive, sortOrder: shouldBeActive ? defaultOrder : s.sortOrder }) });
      }
      toast.success("Reset to default");
      fetchSettings();
    } else {
      // Option type: reset to initial snapshot
      for (const s of current) {
        const d = defaultRef.current.find((x: any) => x.value === s.value);
        await fetch(`/api/settings/${s.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, isActive: d ? d.isActive : true, sortOrder: d ? d.sortOrder : s.sortOrder }) });
      }
      toast.success("Reset to default");
      fetchSettings();
    }
  };

  const initHistory = (items: any[]) => {
    if (items.length > 0 && history.length === 0) {
      setHistory([JSON.parse(JSON.stringify(items))]);
      setHistoryIdx(0);
      defaultRef.current = JSON.parse(JSON.stringify(items));
    }
  };

  if (loading) return <LoadingState />;

  const activeItem = MASTER_DATA_TYPES.find((t) => t.key === activeKey);
  const currentItems = settings[activeKey] || [];
  if (isFormField && currentItems.length > 0 && history.length === 0) initHistory(currentItems);

  const getDisplayItems = (type: string, items: Array<{ id: string; value: string; sortOrder: number; isActive: boolean }>) => {
    const materialFormTypes = ["fdm_form_field", "sla_form_field", "tank_form_field", "ipa_form_field"];
    if (type === "case_form_field") return items.map((item) => ({ ...item, displayValue: CASE_FIELD_REGISTRY[item.value]?.label || item.value, displaySection: CASE_FIELD_REGISTRY[item.value]?.section || "" }));
    if (materialFormTypes.includes(type)) return items.map((item) => ({ ...item, displayValue: MATERIAL_FIELD_REGISTRY[item.value]?.label || item.value, displaySection: MATERIAL_FIELD_REGISTRY[item.value]?.section || "" }));
    if (type === "apply_form_field") return items.map((item) => ({ ...item, displayValue: APPLY_FIELD_REGISTRY[item.value]?.label || item.value, displaySection: APPLY_FIELD_REGISTRY[item.value]?.section || "" }));
    return items.map((item) => ({ ...item, displayValue: item.value, displaySection: "" }));
  };

  // Filter groups by search
  const filteredGroups = search
    ? GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((key) => {
          const item = MASTER_DATA_TYPES.find((t) => t.key === key);
          return item && item.title.toLowerCase().includes(search.toLowerCase());
        }),
      })).filter((group) => group.items.length > 0)
    : GROUPS;

  const rawItems = settings[activeKey] || [];
  const materialFormTypes = ["fdm_form_field", "sla_form_field", "tank_form_field", "ipa_form_field"];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage dropdown options and form fields</p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search settings..."
          className="pl-9 pr-8 h-10 bg-white"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Group cards — left */}
        <div className="lg:col-span-2 space-y-4">
          {filteredGroups.map((group) => (
            <Card key={group.label} className="border border-0">
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50/50 rounded-t-xl transition-colors"
              >
                {expandedGroups[group.label] ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                <div className="text-left flex-1">
                  <h3 className="text-sm font-semibold text-slate-800">{group.label}</h3>
                  <p className="text-[12px] text-slate-500">{group.desc}</p>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">{group.items.length} types</span>
              </button>
              {expandedGroups[group.label] && (
                <div className="px-5 pb-5 pt-1">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {group.items.map((key) => {
                      const item = MASTER_DATA_TYPES.find((t) => t.key === key);
                      if (!item) return null;
                      const count = (settings[key] || []).filter((s) => s.isActive).length;
                      const total = (settings[key] || []).length;
                      return (
                        <button
                          key={key}
                          onClick={() => { setActiveKey(key); setHistory([]); setHistoryIdx(-1); }}
                          className={cn(
                            "text-left px-3 py-2.5 rounded-lg transition-all duration-150 border",
                            activeKey === key
                              ? "bg-accent border-primary/20 text-primary shadow-sm"
                              : "bg-white border-slate-100 text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          <p className="text-[13px] font-medium truncate">{item.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {count} active{total !== count ? ` / ${total} total` : ""}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Editor panel — right */}
        <div className="lg:col-span-3">
          {activeItem && (
            <Card className="border border-0 sticky top-8">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{activeItem.title}</CardTitle>
                  {isFormField && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleUndo} disabled={historyIdx <= 0}>↶</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleRedo} disabled={historyIdx >= history.length - 1}>↷</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={handleReset}>↺</Button>
                    </div>
                  )}
                </div>
                {isFormField && activeItem.key === "case_form_field" && (
                  <p className="text-[11px] text-slate-400 mt-1">Format for custom: <code className="bg-slate-100 px-1 rounded text-[10px]">custom::Label::type::Section</code></p>
                )}
                {materialFormTypes.includes(activeItem.key) && (
                  <p className="text-[11px] text-slate-400 mt-1">Each material category has its own field config</p>
                )}
                {activeItem.key === "apply_form_field" && (
                  <p className="text-[11px] text-slate-400 mt-1">Controls the public <strong>/apply</strong> form</p>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <MasterDataTable
                  title={activeItem.title}
                  type={activeItem.key}
                  items={rawItems}
                  onRefresh={() => { if (isFormField) pushHistory(rawItems); fetchSettings(); }}
                  showReorder={true}
                  displayMap={isFormField
                    ? Object.fromEntries(
                        Object.entries(
                          activeItem.key === "case_form_field" ? CASE_FIELD_REGISTRY :
                          activeItem.key === "apply_form_field" ? APPLY_FIELD_REGISTRY :
                          MATERIAL_FIELD_REGISTRY
                        ).map(([k, v]) => [k, `${v.label} (${v.section})`])
                      )
                    : undefined}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
