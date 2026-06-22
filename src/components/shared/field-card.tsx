"use client";

import { useState, useRef, type ReactNode } from "react";
import { GripVertical, ChevronUp, ChevronDown, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldDef } from "@/lib/field-registry";

// ─── Type badge color mapping (matches Google Forms + E-form aesthetic) ───
const TYPE_STYLE: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  text:       { bg: "bg-blue-50",  text: "text-blue-700",  label: "Text",       icon: "Aa" },
  combobox:   { bg: "bg-purple-50", text: "text-purple-700", label: "Dropdown",  icon: "☰" },
  checkbox:   { bg: "bg-amber-50", text: "text-amber-700",  label: "Checkbox",   icon: "☑" },
  date:       { bg: "bg-emerald-50", text: "text-emerald-700", label: "Date",    icon: "📅" },
  number:     { bg: "bg-teal-50",  text: "text-teal-700",   label: "Number",     icon: "#" },
  textarea:   { bg: "bg-pink-50",  text: "text-pink-700",   label: "Long text",  icon: "≡" },
  multiselect: { bg: "bg-cyan-50", text: "text-cyan-700",   label: "Multi-select", icon: "⊞" },
  image:      { bg: "bg-indigo-50", text: "text-indigo-700", label: "Image",     icon: "🖼" },
};

const FIELD_TYPES: FieldDef["type"][] = ["text", "combobox", "checkbox", "date", "number", "textarea", "multiselect", "image"];

interface FieldCardProps {
  field: FieldDef;
  index: number;
  totalInSection: number;
  isExpanded: boolean;
  onExpand: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => Promise<void>;
  onLabelChange: (newLabel: string) => Promise<void>;
  onTypeChange: (newType: FieldDef["type"]) => Promise<void>;
  /** The actual form field to render inside the card */
  children: ReactNode;
}

export function FieldCard({
  field, index, totalInSection,
  isExpanded, onExpand, onRemove, onMove,
  onLabelChange, onTypeChange,
  children,
}: FieldCardProps) {
  const [labelDraft, setLabelDraft] = useState(field.label);
  const gripRef = useRef<HTMLDivElement>(null);
  const isTouchDevice = useRef(false);
  if (!isTouchDevice.current && typeof window !== "undefined") {
    isTouchDevice.current = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  const style = TYPE_STYLE[field.type] || TYPE_STYLE.text;

  // ─── HTML5 Drag-and-drop ────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
    gripRef.current?.closest(".field-card")?.classList.add("opacity-50");
  };
  const handleDragEnd = () => {
    gripRef.current?.closest(".field-card")?.classList.remove("opacity-50");
  };

  const handleSaveLabel = async () => {
    const trimmed = labelDraft.trim();
    if (trimmed && trimmed !== field.label) {
      await onLabelChange(trimmed);
    } else {
      setLabelDraft(field.label);
    }
  };

  return (
    <div
      className={cn(
        "field-card group relative rounded-xl bg-white transition-all duration-150",
        "ring-1 ring-slate-200",
        isExpanded
          ? "ring-2 ring-blue-500 shadow-sm"
          : "hover:ring-2 hover:ring-blue-300 hover:shadow-sm"
      )}
    >
      {/* ─── Header row ─────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          // Don't toggle if clicking buttons or inputs
          if (target.closest("button:not(.field-header-btn), input, select")) return;
          onExpand();
        }}
        className="field-header-btn w-full flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer"
      >
        {/* Grip handle — hidden on touch, fade-in on hover */}
        <div
          ref={gripRef}
          className={cn(
            "shrink-0 transition-opacity duration-150",
            isTouchDevice.current ? "opacity-30" : "opacity-0 group-hover:opacity-100",
            isExpanded && "opacity-100"
          )}
          draggable={!isTouchDevice.current}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-slate-300 cursor-grab active:cursor-grabbing" />
        </div>

        {/* Type badge */}
        <span className={cn(
          "shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
          style.bg, style.text
        )}>
          {style.icon} {style.label}
        </span>

        {/* Label preview */}
        <span className="flex-1 text-[13px] font-medium text-slate-700 truncate min-w-0">
          {field.label || "(no label)"}
        </span>

        {/* Required toggle pill */}
        <div
          className={cn(
            "shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border-2 transition-all cursor-pointer select-none",
            field.required
              ? "bg-red-500 text-white border-red-500"
              : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onTypeChange(field.type); // This is a no-op for type, but we need a callback for required
          }}
          title={field.required ? "Required" : "Click to set required"}
        >
          {field.required ? "Required ✓" : "Required?"}
        </div>

        {/* Action buttons — fade-in on hover */}
        <div className={cn(
          "shrink-0 flex items-center gap-0.5 transition-opacity duration-150",
          isTouchDevice.current ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          isExpanded && "opacity-100"
        )}>
          {/* Move up */}
          <button
            type="button"
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed"
            disabled={index === 0}
            onClick={(e) => { e.stopPropagation(); onMove(-1); }}
            title="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          {/* Move down */}
          <button
            type="button"
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed"
            disabled={index >= totalInSection - 1}
            onClick={(e) => { e.stopPropagation(); onMove(1); }}
            title="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {/* Delete */}
          <button
            type="button"
            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            title="Remove field"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </button>

      {/* ─── Expandable body ────────────────────────────────────────── */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {/* Label editor */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Label</label>
              <input
                type="text"
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={handleSaveLabel}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveLabel(); } }}
                className="w-full text-[13px] border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                placeholder="Field label"
              />
            </div>

            {/* Type selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Type</label>
              <select
                value={field.type}
                onChange={(e) => onTypeChange(e.target.value as FieldDef["type"])}
                className="w-full text-[13px] border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white"
              >
                {FIELD_TYPES.map((t) => {
                  const st = TYPE_STYLE[t] || TYPE_STYLE.text;
                  return <option key={t} value={t}>{st.icon} {st.label}</option>;
                })}
              </select>
            </div>
          </div>

          {/* Rendered form field preview */}
          <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
