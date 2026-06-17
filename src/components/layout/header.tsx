"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "Dashboard", "/cases": "Cases", "/cases/new": "New Case",
  "/materials": "Materials", "/materials/new": "New Material",
  "/stock-take": "Stock Take", "/reports": "Reports", "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.match(/^\/cases\/[^/]+\/edit$/)) return "Edit Case";
  if (pathname.match(/^\/cases\/[^/]+$/)) return "Case Details";
  if (pathname.match(/^\/materials\/[^/]+\/edit$/)) return "Edit Material";
  if (pathname.match(/^\/materials\/[^/]+$/)) return "Material Details";
  return "QEH 3D Printing Office";
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-white px-8">
      <div className="flex items-center gap-4">
        {/* QEH 3D Logo */}
        <img
          src="/logo.png"
          alt="QEH 3D Printing Office"
          className="h-10 w-auto object-contain max-w-[200px]"
        />
        <div>
          <h1 className="text-base font-semibold tracking-tight text-slate-800">{title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">QEH 3D Printing Office</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-[13px] font-medium text-slate-700">3D Printing Office</p>
          <p className="text-[11px] text-slate-400">Internal Portal</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)] text-xs font-bold text-white">3D</div>
      </div>
    </header>
  );
}
