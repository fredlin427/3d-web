"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboBox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
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

export default function ApplyPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [orderedFields, setOrderedFields] = useState<FieldDef[]>([]);
  const [form, setForm] = useState<Record<string, any>>({});
  const [optionsMap, setOptionsMap] = useState<Record<string, string[]>>(BASE_OPTIONS);

  // Load fields from settings (managed by staff in Settings > Application Form Fields)
  useEffect(() => {
    fetch("/api/settings?type=apply_form_field")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const active = j.data.filter((s: any) => s.isActive).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
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
          const defaults: Record<string, any> = {};
          for (const f of fields) defaults[f.key] = f.defaultValue ?? (f.type === "number" ? 1 : "");
          setForm(defaults);
        }
      })
      .catch(() => {});
  }, []);

  // Load dropdown options from settings (synced with Settings page)
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

  const update = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of orderedFields) {
      if (f.required && !form[f.key]) { toast.error(`Please fill in: ${f.label}`); return; }
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (json.success) { setSubmitted(json.data.caseNumber); toast.success("Submitted!"); }
      else toast.error(json.error || "Failed");
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  };

  const sections = APPLY_SECTION_ORDER.map((name) => ({
    name, fields: orderedFields.filter((f) => f.section === name),
  })).filter((s) => s.fields.length > 0);

  if (submitted) {
    return (
      <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 mx-auto mb-5"><CheckCircle2 className="h-8 w-8 text-emerald-600" /></div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted</h2>
        <p className="text-slate-500">Your application has been received.</p>
        <p className="text-lg font-bold text-indigo-600 mt-4">Case Number: {submitted}</p>
        <p className="text-sm text-slate-400 mt-4">Please save this number. The 3D Printing Office will contact you.</p>
        <Button variant="outline" className="mt-6" onClick={() => window.location.reload()}>Submit Another</Button>
      </CardContent></Card>
    );
  }

  const renderField = (field: FieldDef) => {
    const wrapper = (c: React.ReactNode) => (
      <div className="space-y-1.5" key={field.key}>
        <Label className="text-sm font-medium">{field.label}{field.required ? " *" : ""}</Label>{c}
      </div>
    );
    switch (field.type) {
      case "date": return wrapper(<Input type="date" value={form[field.key] || ""} onChange={(e) => update(field.key, e.target.value)} />);
      case "textarea": return wrapper(<Textarea value={form[field.key] || ""} onChange={(e) => update(field.key, e.target.value)} rows={3} />);
      case "number": return wrapper(<Input type="number" value={form[field.key] || ""} onChange={(e) => update(field.key, parseInt(e.target.value) || 1)} min={1} />);
      case "combobox":
        const isPurpose = field.key === "purpose";
        const category = form["category"];
        const opts = isPurpose && category && PURPOSES[category] ? PURPOSES[category] : (field.options ? (optionsMap[field.options] || BASE_OPTIONS[field.options] || []) : []);
        return wrapper(<ComboBox value={form[field.key] || ""} onChange={(v) => update(field.key, v)} options={opts} placeholder={`Select ${field.label.toLowerCase()}`} settingsType={field.options} disabled={isPurpose && !category} />);
      default: return wrapper(<Input value={form[field.key] || ""} onChange={(e) => update(field.key, e.target.value)} placeholder={field.placeholder} />);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">3D Printing Service Application Form</h2>
        <p className="text-sm text-slate-500 mt-2">Please submit at least 1 month before the expected completion date.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {sections.map((section) => (
          <Card key={section.name} className="overflow-visible border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">{section.name}</CardTitle></CardHeader>
            <CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{section.fields.map(renderField)}</div></CardContent>
          </Card>
        ))}
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting} size="lg" className="bg-indigo-600 hover:bg-indigo-700 px-12 text-base">
            {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}Submit Application
          </Button>
        </div>
      </form>
      <p className="text-center text-xs text-slate-400 mt-8">
        By submitting, you consent to use of model photos and information (excluding sensitive data) for publications and promotions.
      </p>
    </div>
  );
}
