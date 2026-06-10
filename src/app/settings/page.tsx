"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MasterDataTable } from "@/components/settings/master-data-table";
import { LoadingState } from "@/components/shared/loading-state";

const MASTER_DATA_TYPES = [
  { key: "department", title: "Departments" },
  { key: "use_type", title: "Use Types" },
  { key: "priority", title: "Priorities" },
  { key: "case_status", title: "Case Statuses" },
  { key: "material_category", title: "Material Categories" },
  { key: "material_unit", title: "Material Units" },
  { key: "progress_step", title: "Default Progress Steps" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, Array<{ id: string; value: string; sortOrder: number; isActive: boolean }>>>({});
  const [loading, setLoading] = useState(true);

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
          grouped[key].sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder);
        }
        setSettings(grouped);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage master data and default values</p>
      </div>

      <Tabs defaultValue="department" className="w-full">
        <TabsList className="w-full max-w-3xl justify-start overflow-x-auto">
          {MASTER_DATA_TYPES.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="text-sm">
              {t.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {MASTER_DATA_TYPES.map((t) => (
          <TabsContent key={t.key} value={t.key}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <MasterDataTable
                  title={t.title}
                  type={t.key}
                  items={settings[t.key] || []}
                  onRefresh={fetchSettings}
                  showReorder={t.key === "progress_step"}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
