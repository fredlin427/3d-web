"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getStatusBadgeVariant } from "@/lib/utils";
import { MATERIAL_FIELD_REGISTRY, MATERIAL_CATEGORY_SETTINGS_TYPE, MATERIAL_CATEGORY_SECTION_ORDERS } from "@/lib/field-registry";
import type { FieldDef } from "@/lib/field-registry";

/** Renders material detail fields dynamically from settings (same as edit form) */
export function MaterialDetailFields({ material }: { material: Record<string, any> }) {
  const [sections, setSections] = useState<{ name: string; fields: (FieldDef & { displayValue: string })[] }[]>([]);

  useEffect(() => {
    const cat = material.category || "";
    const settingsType = MATERIAL_CATEGORY_SETTINGS_TYPE[cat];
    if (!settingsType) return;

    fetch(`/api/settings?type=${settingsType}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.success || !j.data?.length) return;
        const active = j.data.filter((s: any) => s.isActive).sort((a: any, b: any) => a.sortOrder - b.sortOrder);

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
          } else if (MATERIAL_FIELD_REGISTRY[val]) {
            field = { ...MATERIAL_FIELD_REGISTRY[val] };
          }
          if (!field) continue;

          // Get display value from material data
          let displayValue = material[field.key] ?? "";
          if (field.type === "date" && displayValue) displayValue = formatDate(displayValue);
          else if (field.type === "number" && displayValue !== "") displayValue = `${displayValue} ${material.unit || ""}`;
          else if (displayValue === "" || displayValue === null || displayValue === undefined) displayValue = "—";

          fields.push({ ...field, displayValue: String(displayValue) });
        }

        const sectionOrder = MATERIAL_CATEGORY_SECTION_ORDERS[cat] ||
          [...new Set(fields.map((f) => f.section))];
        const grouped = sectionOrder
          .map((name) => ({ name, fields: fields.filter((f) => f.section === name) }))
          .filter((s) => s.fields.length > 0);
        setSections(grouped);
      })
      .catch(() => {});
  }, [material.category, material]);

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
                  {f.key === "status" ? (
                    <Badge variant={getStatusBadgeVariant(material.status)}>{material.status}</Badge>
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
