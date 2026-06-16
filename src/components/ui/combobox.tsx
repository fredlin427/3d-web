"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, PlusCircle } from "lucide-react";

interface ComboBoxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  settingsType?: string;
}

export function ComboBox({ value, onChange, options, placeholder, disabled, className, settingsType }: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync external value only when not focused
  useEffect(() => {
    if (!open) setInputValue(value || "");
  }, [value, open]);

  // Memoized filter
  const { filtered, exactMatch } = useMemo(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return { filtered: options, exactMatch: false };
    const lower = trimmed.toLowerCase();
    const exact = options.some((o) => o.toLowerCase() === lower);
    const list = options.filter((o) => o.toLowerCase().includes(lower));
    return { filtered: list, exactMatch: exact };
  }, [inputValue, options]);

  const showCreateNew = inputValue.trim() && !exactMatch && !!settingsType;
  const totalItems = filtered.length + (showCreateNew ? 1 : 0);

  const handleSelect = useCallback((option: string) => {
    setInputValue(option);
    onChange(option);
    setOpen(false);
    setHighlightedIndex(-1);
  }, [onChange]);

  const handleCreateNew = useCallback(async () => {
    const newValue = inputValue.trim();
    if (!newValue || !settingsType) return;
    try {
      await fetch("/api/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: settingsType, value: newValue, sortOrder: options.length + 1, isActive: true }),
      });
      // Notify all forms to refresh their options
      window.dispatchEvent(new CustomEvent("settings-updated", { detail: { type: settingsType } }));
    } catch (e) { console.error(e); }
    handleSelect(newValue);
  }, [inputValue, settingsType, options.length, handleSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") { setOpen(true); e.preventDefault(); }
      return;
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setHighlightedIndex((p) => Math.min(p + 1, totalItems - 1)); break;
      case "ArrowUp": e.preventDefault(); setHighlightedIndex((p) => Math.max(p - 1, 0)); break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          if (showCreateNew && highlightedIndex === filtered.length) handleCreateNew();
          else if (highlightedIndex < filtered.length) handleSelect(filtered[highlightedIndex]);
        } else if (inputValue) { onChange(inputValue); setOpen(false); }
        break;
      case "Escape": setOpen(false); setHighlightedIndex(-1); break;
      case "Tab": if (inputValue && inputValue !== value) onChange(inputValue); setOpen(false); break;
    }
  }, [open, totalItems, highlightedIndex, showCreateNew, filtered, handleCreateNew, handleSelect, inputValue, onChange, value]);

  // Close on click outside (stable callback)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (inputValue && inputValue !== value) onChange(inputValue);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, inputValue, value, onChange]);

  // Auto-scroll highlighted item
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[highlightedIndex] as HTMLElement;
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => { setInputValue(e.target.value); setOpen(true); setHighlightedIndex(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-8"
      />
      <button type="button" tabIndex={-1} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => { setOpen(!open); inputRef.current?.focus(); }}>
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && totalItems > 0 && (
        <div ref={listRef} className="absolute z-[999] mt-1 max-h-52 w-full overflow-auto rounded-lg border bg-white py-1 shadow-lg animate-in fade-in-0 zoom-in-95 duration-100">
          {filtered.map((option, i) => (
            <div
              key={`${option}-${i}`}
              className={cn(
                "flex items-center px-3 py-2 text-sm cursor-pointer select-none",
                i === highlightedIndex ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50",
                option === value && "font-semibold"
              )}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(option); }}
              onMouseEnter={() => setHighlightedIndex(i)}
            >
              <span className="flex-1">{option}</span>
              {option === value && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0 ml-2" />}
            </div>
          ))}
          {showCreateNew && (
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-t border-slate-100 select-none",
                highlightedIndex === filtered.length ? "bg-indigo-50 text-indigo-700" : "text-indigo-600 hover:bg-indigo-50"
              )}
              onMouseDown={(e) => { e.preventDefault(); handleCreateNew(); }}
              onMouseEnter={() => setHighlightedIndex(filtered.length)}
            >
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span>Add "<strong>{inputValue.trim()}</strong>"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
