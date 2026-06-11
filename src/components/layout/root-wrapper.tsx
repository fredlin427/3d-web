"use client";

import { usePathname } from "next/navigation";
import { Shell } from "./shell";

export function RootWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Public routes — no sidebar (only exact /apply, not /apply-manage etc.)
  if (pathname === "/apply") {
    return <>{children}</>;
  }

  // Internal routes — with sidebar
  return <Shell>{children}</Shell>;
}
