"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/cases": "Cases",
  "/cases/new": "New Case",
  "/materials": "Materials",
  "/materials/new": "New Material",
  "/stock-take": "Stock Take",
  "/reports": "Reports",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  // Check exact match first
  if (pageTitles[pathname]) return pageTitles[pathname];

  // Check patterns
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
    <header className="flex h-16 items-center border-b bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-500">3D Printing Office Management</p>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-700">3D Printing Office</p>
          <p className="text-xs text-slate-400">Internal Staff Portal</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
          3D
        </div>
      </div>
    </header>
  );
}
