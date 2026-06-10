"use client";

import { MaterialForm } from "@/components/materials/material-form";

export default function NewMaterialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">New Material</h2>
        <p className="text-sm text-slate-500 mt-1">Add a new material stock record</p>
      </div>
      <MaterialForm />
    </div>
  );
}
