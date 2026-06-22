"use client";

import { useState } from "react";
import { X } from "lucide-react";

// Type grid items grouped by category (E-form style)
const TYPE_CATEGORIES = [
  {
    label: "Basic",
    types: [
      { type: "text",     label: "Short text", icon: "Aa", desc: "Single line input" },
      { type: "textarea", label: "Long text",  icon: "≡", desc: "Multi-line text area" },
      { type: "number",   label: "Number",     icon: "#", desc: "Numeric value" },
      { type: "date",     label: "Date",       icon: "📅", desc: "Date picker" },
    ],
  },
  {
    label: "Choice",
    types: [
      { type: "combobox",   label: "Dropdown",   icon: "☰", desc: "Single select from list" },
      { type: "multiselect",label: "Multi-select",icon: "⊞", desc: "Check multiple options" },
      { type: "checkbox",   label: "Checkbox",   icon: "☑", desc: "Yes/No toggle" },
    ],
  },
  {
    label: "Media",
    types: [
      { type: "image", label: "Image", icon: "🖼", desc: "Image upload" },
    ],
  },
];

interface AddFieldModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (label: string, type: string, section: string) => void;
  sections: { name: string }[];
  defaultSection?: string;
}

export function AddFieldModal({ open, onClose, onAdd, sections, defaultSection }: AddFieldModalProps) {
  const [selType, setSelType] = useState("text");
  const [label, setLabel] = useState("");
  const [section, setSection] = useState(defaultSection || sections[0]?.name || "");

  if (!open) return null;

  // Reset on open
  const handleClose = () => {
    setSelType("text");
    setLabel("");
    onClose();
  };

  const handleAdd = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onAdd(trimmed, selType, section || sections[0]?.name || "");
    setLabel("");
    setSelType("text");
    onClose();
  };

  // Build flat type list for rendering
  const allTypes = TYPE_CATEGORIES.flatMap((c) => c.types.map((t) => ({ ...t, category: c.label })));
  // Group for category headers
  const grouped: Record<string, typeof allTypes> = {};
  for (const t of allTypes) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/30 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">Add a field</h3>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Type grid with categories */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2 block">
              Choose a type
            </label>
            {Object.entries(grouped).map(([cat, types]) => (
              <div key={cat} className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">
                  {cat}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {types.map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setSelType(t.type)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all ${
                        selType === t.type
                          ? "border-blue-500 bg-blue-50/50 shadow-sm"
                          : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xl">{t.icon}</span>
                      <span className="text-[11px] font-semibold text-slate-700">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Label input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Field label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="e.g., Expiry Date"
              autoFocus
            />
          </div>

          {/* Section selector (only if multiple sections) */}
          {sections.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                {sections.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!label.trim()}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Add field
          </button>
        </div>
      </div>
    </div>
  );
}
