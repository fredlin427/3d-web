"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, Circle, Loader2, CheckCircle2, CircleDot } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ProgressStep {
  id: string;
  caseId: string;
  stepName: string;
  stepOrder: number;
  status: string;
  completedDate: string | null;
  staffName: string | null;
  notes: string | null;
}

interface ProgressTimelineProps {
  caseId: string;
  steps: ProgressStep[];
  onRefresh: () => void;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  "Not started": <Circle className="h-4 w-4 text-slate-300" />,
  "In progress": <CircleDot className="h-4 w-4 text-blue-500" />,
  "Completed": <CheckCircle2 className="h-4 w-4 text-green-500" />,
  "Skipped": <Circle className="h-4 w-4 text-slate-400 line-through" />,
};

export function ProgressTimeline({ caseId, steps, onRefresh }: ProgressTimelineProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formStepName, setFormStepName] = useState("");
  const [formStatus, setFormStatus] = useState("Not started");
  const [formStaff, setFormStaff] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const resetForm = () => {
    setFormStepName("");
    setFormStatus("Not started");
    setFormStaff("");
    setFormNotes("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!formStepName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepName: formStepName,
          stepOrder: steps.length + 1,
          status: formStatus,
          completedDate: formStatus === "Completed" ? new Date().toISOString() : null,
          staffName: formStaff,
          notes: formNotes,
        }),
      });
      if (res.ok) {
        toast.success("Progress step added");
        resetForm();
        onRefresh();
      } else {
        toast.error("Failed to add step");
      }
    } catch (e) { console.error(e);
      toast.error("Failed to add step");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (step: ProgressStep) => {
    setEditingId(step.id);
    setFormStepName(step.stepName);
    setFormStatus(step.status);
    setFormStaff(step.staffName || "");
    setFormNotes(step.notes || "");
    setShowForm(true);
  };

  const handleUpdate = async () => {
    if (!editingId || !formStepName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/progress/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepName: formStepName,
          status: formStatus,
          completedDate: formStatus === "Completed" ? new Date().toISOString() : null,
          staffName: formStaff,
          notes: formNotes,
        }),
      });
      if (res.ok) {
        toast.success("Progress step updated");
        resetForm();
        onRefresh();
      } else {
        toast.error("Failed to update step");
      }
    } catch (e) { console.error(e);
      toast.error("Failed to update step");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this progress step?")) return;
    try {
      const res = await fetch(`/api/progress/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Step deleted");
        onRefresh();
      } else {
        toast.error("Failed to delete step");
      }
    } catch (e) { console.error(e);
      toast.error("Failed to delete step");
    }
  };

  const handleMarkComplete = async (step: ProgressStep) => {
    try {
      const res = await fetch(`/api/progress/${step.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...step,
          status: "Completed",
          completedDate: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        toast.success(`"${step.stepName}" marked as completed`);
        onRefresh();
      }
    } catch (e) { console.error(e);
      toast.error("Failed to update step");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Progress Timeline</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { resetForm(); setShowForm(!showForm); }}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Step
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="Step name"
              value={formStepName}
              onChange={(e) => setFormStepName(e.target.value)}
              className="h-9"
            />
            <Select value={formStatus} onValueChange={(v) => { if (v) setFormStatus(v); }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Not started">Not started</SelectItem>
                <SelectItem value="In progress">In progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Staff name"
              value={formStaff}
              onChange={(e) => setFormStaff(e.target.value)}
              className="h-9"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={editingId ? handleUpdate : handleAdd} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingId ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                <span className="ml-1">{editingId ? "Update" : "Add"}</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={resetForm}><X className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
          <Textarea
            placeholder="Notes (optional)"
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            rows={1}
            className="text-sm"
          />
        </div>
      )}

      {/* Timeline */}
      {steps.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">No progress steps yet. Add your first step above.</p>
      ) : (
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={step.id} className="flex gap-4">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div className="mt-1.5">{STATUS_ICONS[step.status] || STATUS_ICONS["Not started"]}</div>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-[24px] my-1",
                      step.status === "Completed" ? "bg-green-300" : "bg-slate-200"
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className={cn(
                "flex-1 pb-4 pl-2 pt-0.5",
                step.status === "Skipped" && "opacity-60"
              )}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      step.status === "Completed" && "text-green-700",
                      step.status === "Skipped" && "line-through text-slate-400"
                    )}>
                      {step.stepName}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                      <Badge variant="outline" className="text-[10px] h-5">{step.status}</Badge>
                      {step.staffName && <span>{step.staffName}</span>}
                      {step.completedDate && <span>Completed: {formatDate(step.completedDate)}</span>}
                    </div>
                    {step.notes && <p className="text-xs text-slate-500 mt-1">{step.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {step.status !== "Completed" && step.status !== "Skipped" && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMarkComplete(step)} title="Mark complete">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(step)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(step.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
