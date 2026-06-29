"use client";

interface LegendEntry {
  label: string;
  color: string;
  bold?: boolean;
  onClick?: () => void;
}

export function ChartLegend({ items }: { items: LegendEntry[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm px-2 pt-2">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={item.onClick}
          className={item.bold
            ? "font-bold text-slate-700 flex items-center gap-1.5 mt-1.5 w-full cursor-pointer hover:text-blue-600 transition-colors"
            : "text-slate-500 ml-6 flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition-colors"
          }
        >
          <span
            className="inline-block w-3 h-3 rounded-sm shrink-0"
            style={{ backgroundColor: item.color, opacity: item.bold ? 1 : 0.7 }}
          />
          {item.label}
        </button>
      ))}
    </div>
  );
}
