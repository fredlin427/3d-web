"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, X, Check, ChevronDown } from "lucide-react";
import { MaterialInfoPopover } from "@/components/materials/material-info-popover";
import { formatDate } from "@/lib/utils";
import { DataTable, Column } from "@/components/shared/data-table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [materialPopOpen, setMaterialPopOpen] = useState(false);
  const selectedMat = materials.find((m) => m.id === formMaterialId);

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
    } catch (e) { console.error(e);
      toast.error("Failed to record usage");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this material usage record? Quantity will be returned to stock.")) return;
    try {
      const res = await fetch(`/api/material-usage/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Record deleted, quantity returned");
        onRefresh();
      } else {
        toast.error("Failed to delete record");
      }
    } catch (e) { console.error(e);
      toast.error("Failed to delete record");
    }
  };

  const [loadingMats, setLoadingMats] = useState(false);

  const loadMaterials = async () => {
    setLoadingMats(true);
    const res = await fetch("/api/materials");
    const json = await res.json();
    if (json.success) {
      const active = (json.data || []).filter((m: any) => m.status !== "Disposed" && m.status !== "Expired");
      setMaterials(active);
    }
    setLoadingMats(false);
  };

  const columns: Column<MaterialUsage>[] = [
    { key: "material", header: "Material", render: (u) => u.material ? <MaterialInfoPopover materialId={u.material.id} name={u.material.materialName} /> : <span className="text-sm">—</span> },
    { key: "category", header: "Category", render: (u) => <Badge variant="secondary" className="text-xs">{u.material?.category || "—"}</Badge> },
    { key: "batch", header: "Batch", render: (u) => <span className="text-xs font-mono">{u.material?.batchNumber || "—"}</span> },
    { key: "quantity", header: "Qty", render: (u) => <span className="text-sm font-medium tabular-nums">{u.quantityUsed}</span> },
    { key: "unit", header: "Unit", render: (u) => <span className="text-xs text-slate-500">{u.unit}</span> },
    { key: "printer", header: "Printer/Tank", render: (u) => <span className="text-xs">{u.printerOrTank || "—"}</span> },
    { key: "usageDate", header: "Date", render: (u) => <span className="text-xs text-slate-500">{formatDate(u.usageDate)}</span> },
    { key: "staffName", header: "Staff", render: (u) => <span className="text-xs">{u.staffName || "—"}</span> },
    { key: "actions", header: "", className: "w-10 text-right",
      render: (u) => (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(u.id)}>
          <Trash2 className="h-3.5 w-3.5 text-red-400" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Material Usage
          {usageRecords.length > 0 && <span className="ml-2 text-xs font-normal text-slate-400">({usageRecords.length} record{usageRecords.length > 1 ? "s" : ""})</span>}
        </h3>
        <Button variant="outline" size="sm" onClick={() => { if (!showForm) loadMaterials(); setShowForm(!showForm); }}>
          {showForm ? <><X className="mr-1 h-3.5 w-3.5" />Cancel</> : <><Plus className="mr-1 h-3.5 w-3.5" />Add Usage</>}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-slate-50/50 p-4 space-y-3">
          <p className="text-xs font-medium text-slate-500">Record material usage for this case</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Popover open={materialPopOpen} onOpenChange={(open) => { if (open) loadMaterials(); setMaterialPopOpen(open); }}>
              <PopoverTrigger className="flex items-center justify-between h-9 w-full rounded-md border border-input bg-white px-3 text-sm">
                <span className={selectedMat ? "text-slate-900 truncate" : "text-slate-400"}>
                  {loadingMats ? "Loading..." : selectedMat ? `${selectedMat.materialName} (${selectedMat.currentQuantity} ${selectedMat.unit})` : "Select material..."}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
              </PopoverTrigger>
              <PopoverContent className="w-[480px] p-0" align="start">
                <div className="max-h-[320px] overflow-y-auto">
                  {materials.length === 0 && !loadingMats && <p className="text-xs text-slate-400 px-3 py-8 text-center">No materials available</p>}
                  {materials.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setFormMaterialId(m.id); setMaterialPopOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between gap-3 ${formMaterialId === m.id ? "bg-accent" : ""}`}
                    >
                      <span className="font-medium text-slate-700 truncate flex-1">{m.materialName}</span>
                      <span className="text-xs text-slate-500 shrink-0 tabular-nums">{m.currentQuantity} {m.unit} left</span>
                      {formMaterialId === m.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Input type="number" step="0.01" placeholder="Quantity used" value={formQuantity} onChange={(e) => setFormQuantity(e.target.value)} className="h-9 bg-white" />
            <Input placeholder="Staff name" value={formStaff} onChange={(e) => setFormStaff(e.target.value)} className="h-9 bg-white" />
            <Input placeholder="Printer / Tank" value={formPrinter} onChange={(e) => setFormPrinter(e.target.value)} className="h-9 bg-white" />
          </div>
          <div className="flex gap-2">
            <Input placeholder="Notes (optional)" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="h-9 flex-1 bg-white" />
            <Button size="sm" onClick={handleAdd} disabled={saving || !formMaterialId || !formQuantity}>
              {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Record
            </Button>
          </div>
        </div>
      )}

      {usageRecords.length === 0 && !showForm ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg border-slate-200">
          <p className="text-sm text-slate-400">No material usage recorded</p>
          <p className="text-xs text-slate-300 mt-1">Click "Add Usage" to record material consumption</p>
        </div>
      ) : usageRecords.length > 0 ? (
        <DataTable data={usageRecords} columns={columns} keyField="id" pageSize={10} />
      ) : null}
    </div>
  );
}
