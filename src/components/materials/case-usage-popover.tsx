"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useAPI } from "@/lib/swr-config";

interface CaseInfo {
  id: string;
  caseNumber: string;
  projectTitle: string;
  department: string;
  usageDate: string;
  quantityUsed: number;
  unit: string;
}

export function CaseUsagePopover({ materialId, count }: { materialId: string; count: number }) {
  const [open, setOpen] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLSpanElement>(null);

  // SWR dedupes parallel requests to same materialId
  const { data: swrData, isLoading } = useAPI<{ success: boolean; data: any }>(
    hasFetched ? `/api/materials/${materialId}` : null,
    { revalidateOnFocus: false }
  );
  const materialData = swrData as { success: boolean; data: any } | undefined;
  const cases: CaseInfo[] = materialData?.success ? (materialData.data?.materialUsage || []).map((u: any) => ({
    id: u.case?.id || "", caseNumber: u.case?.caseNumber || "",
    projectTitle: u.case?.projectTitle || "", department: u.case?.department || "",
    usageDate: u.usageDate, quantityUsed: u.quantityUsed, unit: u.unit,
  })) : [];

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => { setOpen(true); setHasFetched(true); }, 300);
  };
  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 1000);
  };

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, []);

  if (count === 0) return null;

  return (
    <span ref={containerRef} className="relative inline-flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <span
        className="inline-flex items-center gap-0.5 text-xs text-primary font-semibold bg-accent rounded-full px-2 py-0.5 cursor-pointer hover:bg-primary/10"
        onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); setOpen(!open); setHasFetched(true); }}
      >
        {count} case{count > 1 ? "s" : ""}
      </span>

      {open && (
        <div
          className="absolute z-50 left-0 top-full mt-2 w-80 rounded-xl border bg-white shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
          onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="p-3 border-b">
            <p className="text-xs font-semibold text-slate-700">Cases using this material</p>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
            ) : cases.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No usage records</p>
            ) : (
              <div className="space-y-1">
                {cases.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-primary group-hover:text-primary/80 group-hover:underline truncate">{c.caseNumber} →</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{c.projectTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{c.department}</Badge>
                        <span className="text-[10px] text-slate-400">{formatDate(c.usageDate)}</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 shrink-0 ml-3">{c.quantityUsed} {c.unit}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
