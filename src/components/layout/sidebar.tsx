"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  Package,
  ClipboardCheck,
  BarChart3,
  Settings,
  ChevronLeft,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Cases", href: "/cases", icon: FolderOpen },
  { name: "Materials", href: "/materials", icon: Package },
  { name: "Stock Take", href: "/stock-take", icon: ClipboardCheck },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-slate-50/50 transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
          <Printer className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-slate-900">QEH 3D Print</span>
            <span className="text-[10px] text-slate-500">Office Manager</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("ml-auto h-7 w-7", collapsed && "ml-0")}
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="grid gap-1 px-2">
          {navigation.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {!collapsed && (
        <div className="border-t p-4">
          <Separator className="mb-3" />
          <p className="text-[10px] text-slate-400">© {new Date().getFullYear()} QEH 3D Printing Office</p>
          <p className="text-[10px] text-slate-400">Internal use only</p>
        </div>
      )}
    </aside>
  );
}
