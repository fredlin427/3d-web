"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getStatusBadgeVariant } from "@/lib/utils";
import { CASE_FIELD_REGISTRY, CASE_SECTION_ORDER } from "@/lib/field-registry";
import type { FieldDef } from "@/lib/field-registry";

export function CaseDetailFields({ caseData }: { caseData: Record<string, any> }) {
  const [sections, setSections] = useState<{ name: string; fields: (FieldDef & { displayValue: string })[] }[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/settings?type=case_form_field")
        .then((r) => r.json())
        .then((j) => {
          if (cancelled || !j.success) return;
          // Fallback: if no settings exist yet, use registry defaults
          let active;
          if (!j.data?.length) {
            active = Object.keys(CASE_FIELD_REGISTRY).map((key, i) => ({ id: `fallback-${key}`, type: "case_form_field", value: key, sortOrder: i, isActive: true }));
          } else {
            active = j.data.filter((s: any) => s.isActive).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
          }
          const fields: (FieldDef & { displayValue: string })[] = [];
          const seen = new Set<string>();
          for (const item of active) {
            const val = item.value.trim();
            if (seen.has(val)) continue;
            seen.add(val);
            let field: FieldDef | null = null;
            if (val.startsWith("custom::")) {
              const parts = val.split("::");
              field = { key: val, label: parts[1] || "Custom", section: parts[3] || "Additional", type: (parts[2] || "text") as FieldDef["type"] };
            } else if (CASE_FIELD_REGISTRY[val]) {
              field = { ...CASE_FIELD_REGISTRY[val] };
            }
            if (!field) continue;
            let dv = caseData[field.key] ?? "";
            if (field.type === "date" && dv) dv = formatDate(dv);
            else if (dv === "" || dv === null || dv === undefined) dv = "—";
            fields.push({ ...field, displayValue: String(dv) });
          }
          const grouped = CASE_SECTION_ORDER
            .map((name) => ({ name, fields: fields.filter((f) => f.section === name) }))
            .filter((s) => s.fields.length > 0);
          if (!cancelled) setSections(grouped);
        })
        .catch(() => {});
    };
    load();
    window.addEventListener("form-fields-changed", load);
    return () => { cancelled = true; window.removeEventListener("form-fields-changed", load); };
  }, [caseData]);

  if (sections.length === 0) return null;

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <Card key={section.name}>
          <CardHeader><CardTitle className="text-sm font-semibold">{section.name}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {section.fields.map((f) => (
                <div key={f.key}>
                  <p className="text-xs text-slate-400">{f.label}</p>
                  {f.key === "currentStatus" ? (
                    <Badge variant={getStatusBadgeVariant(caseData.currentStatus)}>{caseData.currentStatus}</Badge>
                  ) : f.key === "modelImageUrl" && caseData.modelImageUrl ? (
                    <img src={caseData.modelImageUrl} alt="" className="h-16 rounded object-cover" />
                  ) : (
                    <p className="font-medium">{f.displayValue}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
