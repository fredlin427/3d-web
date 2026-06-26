"use client";

/**
 * Stacked legend — rendered below the chart, NOT as an overlay.
 * Shows primary groups (bold) with sub-items (indented).
 * Clickable — clicking a group opens the FocusCard.
 */
interface LegendEntry {
  label: string;
  color: string;
  bold?: boolean;
  onClick?: () => void;
}

export function ChartLegend({ items }: { items: LegendEntry[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] px-2 pt-2">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={item.onClick}
          className={item.bold
            ? "font-bold text-slate-700 flex items-center gap-1 mt-1 w-full cursor-pointer hover:text-blue-600 transition-colors"
            : "text-slate-500 ml-5 flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors"
          }
        >
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: item.color, opacity: item.bold ? 1 : 0.7 }}
          />
          {item.label}
        </button>
      ))}
    </div>
  );
}
