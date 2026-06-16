import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getDaysUntilExpiry(expiryDate: string | Date | null | undefined): number | null {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getStockAlertStatus(material: {
  status: string;
  currentQuantity: number;
  reorderThreshold: number;
  expiryDate: string | Date | null;
  disposalDate: string | Date | null;
}): { type: "ok" | "warning" | "danger"; message: string } | null {
  if (material.status === "Expired") {
    return { type: "danger", message: "Material has expired" };
  }
  if (material.status === "Disposed") {
    return { type: "ok", message: "Disposed" };
  }
  if (material.expiryDate) {
    const daysUntil = getDaysUntilExpiry(material.expiryDate);
    if (daysUntil !== null && daysUntil <= 0 && material.status !== "Expired") {
      return { type: "danger", message: "Expiry date has passed" };
    }
    if (daysUntil !== null && daysUntil <= 30 && daysUntil > 0) {
      return { type: "warning", message: `Expires in ${daysUntil} days` };
    }
  }
  if (material.disposalDate) {
    const now = new Date();
    const disposal = new Date(material.disposalDate);
    if (disposal <= now) {
      return { type: "warning", message: "Disposal date overdue" };
    }
  }
  if (
    material.currentQuantity <= material.reorderThreshold &&
    material.reorderThreshold > 0
  ) {
    return { type: "warning", message: "Low stock — at or below reorder threshold" };
  }
  return null;
}

export function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" | null {
  // Stock statuses — color-coded for inventory visibility
  switch (status) {
    case "In stock": return "default";       // green/success — good
    case "Opened": return "secondary";       // blue/gray — in use
    case "Low stock": return "destructive";  // red — needs attention
    case "Expired": return "destructive";    // red — expired
    case "Disposed": return "outline";       // neutral — gone
  }
  // Case statuses
  switch (status) {
    case "Completed":
    case "Routine":
    case "Approved":
      return "default";
    case "In progress":
    case "Urgent":
      return "secondary";
    case "Draft":
    case "On hold":
    case "Not started":
    case "N/A":
      return "outline";
    case "Cancelled":
    case "Rejected":
      return "destructive";
    case "High priority":
      return "destructive";
    default:
      return null;
  }
}

/** Custom color classes for stock status badges */
export function getStockStatusColor(status: string): string {
  switch (status) {
    case "In stock": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Opened": return "bg-blue-100 text-blue-700 border-blue-200";
    case "Low stock": return "bg-amber-100 text-amber-700 border-amber-200";
    case "Expired": return "bg-red-100 text-red-700 border-red-200";
    case "Disposed": return "bg-slate-100 text-slate-500 border-slate-200";
    default: return "";
  }
}
