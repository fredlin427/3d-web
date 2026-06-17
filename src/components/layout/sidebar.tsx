"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FolderOpen, Package, BarChart3, Settings, Box, FileText, PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Cases", href: "/cases", icon: FolderOpen },
  { name: "Materials", href: "/materials", icon: Package },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Chart Builder", href: "/chart-builder", icon: PieChart },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Apply Form", href: "/apply-manage", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r-0 transition-[width] duration-300 ease-in-out",
        "bg-[var(--sidebar)]",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-white/[0.06] overflow-hidden",
        collapsed ? "h-16 justify-center px-3" : "h-16 px-5 gap-3"
      )}>
        {collapsed ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <Box className="h-5 w-5 text-white" />
          </div>
        ) : (
          <>
            <img
              src="/logo.png"
              alt="QEH 3D Printing Office"
              className="h-7 object-contain shrink-0"
            />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[14px] font-semibold text-white tracking-tight">QEH 3D Print</span>
              <span className="text-[11px] text-white/50 font-medium">Office Manager</span>
            </div>
          </>
        )}
        <Button
          variant="ghost" size="icon"
          className={cn(
            "h-7 w-7 shrink-0 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg",
            collapsed && "ml-auto"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          <svg className={cn("h-3.5 w-3.5 transition-transform duration-300", collapsed && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7"/></svg>
        </Button>
      </div>

      <ScrollArea className="flex-1 py-5">
        <nav className="grid gap-1 px-3">
          {navigation.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-white/12 text-white ring-1 ring-white/10"
                    : "text-white/55 hover:text-white/85 hover:bg-white/[0.06]"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-white")} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {!collapsed && (
        <div className="border-t border-white/[0.06] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/70">3D</div>
            <div className="text-xs"><p className="font-medium text-white/70">3DP Office</p><p className="text-white/35">Internal Portal</p></div>
          </div>
        </div>
      )}
    </aside>
  );
}
