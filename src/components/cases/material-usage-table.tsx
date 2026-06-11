"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, X } from "lucide-react";
import { MaterialInfoPopover } from "@/components/materials/material-info-popover";
import { formatDate } from "@/lib/utils";
import { DataTable, Column } from "@/components/shared/data-table";

interface MaterialUsage {
  id: string;
  caseId: string;
  materialId: string;
  usageDate: string;
  quantityUsed: number;
  unit: string;
  staffName: string | null;
  printerOrTank: string | null;
  notes: string | null;
  material?: {
    id: string;
    materialName: string;
    category: string;
    batchNumber: string;
    currentQuantity: number;
    unit: string;
  };
}

interface MaterialOption {
  id: string;
  materialName: string;
  category: string;
  batchNumber: string;
  currentQuantity: number;
  unit: string;
}

interface MaterialUsageTableProps {
  caseId: string;
  usageRecords: MaterialUsage[];
  onRefresh: () => void;
}

export function MaterialUsageTable({ caseId, usageRecords, onRefresh }: MaterialUsageTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [formMaterialId, setFormMaterialId] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formStaff, setFormStaff] = useState("");
  const [formPrinter, setFormPrinter] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadMaterials = async () => {
    const res = await fetch("/api/materials");
    const json = await res.json();
    if (json.success) setMaterials(json.data);
  };

  const resetForm = () => {
    setFormMaterialId("");
    setFormQuantity("");
    setFormStaff("");
    setFormPrinter("");
    setFormNotes("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!formMaterialId || !formQuantity) return;
    setSaving(true);
    try {
      const selected = materials.find((m) => m.id === formMaterialId);
      const res = await fetch("/api/material-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          materialId: formMaterialId,
          usageDate: new Date().toISOString(),
          quantityUsed: parseFloat(formQuantity),
          unit: selected?.unit || "unit",
          staffName: formStaff,
          printerOrTank: formPrinter,
          notes: formNotes,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Material usage recorded");
        resetForm();
        onRefresh();
      } else {
        toast.error(json.error || "Failed to record usage");
      }
    } catch {
      toast.error("Failed to record usage");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this material usage record? Quantity will be returned to stock.")) return;
    try {
      const res = await fetch(`/api/material-usage/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Record deleted, quantity returned");
        onRefresh();
      } else {
        toast.error("Failed to delete record");
      }
    } catch {
      toast.error("Failed to delete record");
    }
  };

  const columns: Column<MaterialUsage>[] = [
    { key: "material", header: "Material", render: (u) => u.material ? <MaterialInfoPopover materialId={u.material.id} name={u.material.materialName} /> : <span className="text-sm">—</span> },
    { key: "category", header: "Category", render: (u) => <Badge variant="secondary" className="text-xs">{u.material?.category || "—"}</Badge> },
    { key: "batch", header: "Batch", render: (u) => <span className="text-xs font-mono">{u.material?.batchNumber || "—"}</span> },
    {
      key: "quantity",
      header: "Qty",
      render: (u) => <span className="text-sm font-medium">{u.quantityUsed}</span>,
    },
    { key: "unit", header: "Unit", render: (u) => <span className="text-xs">{u.unit}</span> },
    { key: "printer", header: "Printer/Tank", render: (u) => <span className="text-xs">{u.printerOrTank || "—"}</span> },
    { key: "usageDate", header: "Date", render: (u) => <span className="text-xs">{formatDate(u.usageDate)}</span> },
    { key: "staffName", header: "Staff", render: (u) => <span className="text-xs">{u.staffName || "—"}</span> },
    {
      key: "actions",
      header: "",
      className: "w-12 text-right",
      render: (u) => (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(u.id)}>
          <Trash2 className="h-3.5 w-3.5 text-red-400" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Material Usage</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { resetForm(); loadMaterials(); setShowForm(!showForm); }}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Material Usage
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-slate-50 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select value={formMaterialId} onValueChange={(v) => { if (v) setFormMaterialId(v); }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select material" /></SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.materialName} ({m.currentQuantity} {m.unit} available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              step="0.01"
              placeholder="Quantity used"
              value={formQuantity}
              onChange={(e) => setFormQuantity(e.target.value)}
              className="h-9"
            />
            <Input
              placeholder="Staff name"
              value={formStaff}
              onChange={(e) => setFormStaff(e.target.value)}
              className="h-9"
            />
            <Input
              placeholder="Printer / Tank"
              value={formPrinter}
              onChange={(e) => setFormPrinter(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <Input
              placeholder="Notes"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="h-9 flex-1"
            />
            <Button size="sm" onClick={handleAdd} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
              Record Usage
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      )}

      {usageRecords.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">No material usage recorded for this case.</p>
      ) : (
        <DataTable data={usageRecords} columns={columns} keyField="id" pageSize={10} />
      )}
    </div>
  );
}
