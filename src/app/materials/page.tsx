"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, AlertTriangle, Clock } from "lucide-react";
import { formatDate, getStockAlertStatus, getStatusBadgeVariant } from "@/lib/utils";

interface MaterialItem {
  id: string;
  category: string;
  materialName: string;
  brand: string | null;
  materialType: string | null;
  colour: string | null;
  batchNumber: string;
  currentQuantity: number;
  unit: string;
  reorderThreshold: number;
  openDate: string | null;
  expiryDate: string | null;
  disposalDate: string | null;
  storageLocation: string | null;
  status: string;
  _count: { materialUsage: number; stockTransactions: number };
}

export default function MaterialsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");

  const [categories, setCategories] = useState<string[]>([]);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (catFilter !== "all") params.set("category", catFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/materials?${params}`);
      const json = await res.json();
      if (json.success) setMaterials(json.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search, catFilter, statusFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/settings?type=material_category");
      const json = await res.json();
      if (json.success) {
        setCategories(json.data.filter((s: { isActive: boolean }) => s.isActive).map((s: { value: string }) => s.value));
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/materials/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Material deleted");
        setDeleteId(null);
        fetchMaterials();
      } else {
        toast.error("Failed to delete material");
      }
    } catch {
      toast.error("Failed to delete material");
    }
  };

  const columns: Column<MaterialItem>[] = [
    {
      key: "alerts",
      header: "",
      className: "w-8",
      render: (m) => {
        const alert = getStockAlertStatus(m);
        if (!alert || alert.type === "ok") return null;
        return (
          <div title={alert.message}>
            {alert.type === "danger" ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <Clock className="h-4 w-4 text-amber-500" />
            )}
          </div>
        );
      },
    },
    { key: "category", header: "Category", sortable: true, render: (m) => <Badge variant="secondary" className="text-xs">{m.category}</Badge> },
    { key: "materialName", header: "Material", sortable: true, render: (m) => <span className="font-medium text-sm">{m.materialName}</span> },
    { key: "brand", header: "Brand", render: (m) => <span className="text-sm">{m.brand || "—"}</span> },
    { key: "materialType", header: "Type", render: (m) => <span className="text-sm">{m.materialType || "—"}</span> },
    { key: "colour", header: "Colour", render: (m) => <span className="text-sm">{m.colour || "—"}</span> },
    { key: "batchNumber", header: "Batch #", render: (m) => <span className="text-xs font-mono">{m.batchNumber}</span> },
    {
      key: "currentQuantity",
      header: "Qty",
      sortable: true,
      render: (m) => (
        <span className="text-sm font-medium">
          {m.currentQuantity} <span className="text-slate-400 font-normal">{m.unit}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (m) => <Badge variant={getStatusBadgeVariant(m.status)}>{m.status}</Badge>,
    },
    { key: "storageLocation", header: "Location", render: (m) => <span className="text-xs">{m.storageLocation || "—"}</span> },
    { key: "expiryDate", header: "Expires", render: (m) => <span className="text-xs">{formatDate(m.expiryDate)}</span> },
    {
      key: "actions",
      header: "",
      className: "w-16 text-right",
      render: (m) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md p-2 hover:bg-slate-100">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/materials/${m.id}`)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/materials/${m.id}/edit`)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => { setDeleteId(m.id); setDeleteName(m.materialName); }}
            >
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Materials</h2>
          <p className="text-sm text-slate-500 mt-1">Manage material stock records</p>
        </div>
        <Link href="/materials/new">
          <Button className="bg-teal-600 hover:bg-teal-700"><Plus className="mr-2 h-4 w-4" />New Material</Button>
        </Link>
      </div>

      <DataTable
        data={materials}
        columns={columns}
        keyField="id"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, batch, brand..."
        isLoading={loading}
        emptyTitle="No materials found"
        emptyDescription="Add a new material stock record to get started."
        toolbar={
          <div className="flex gap-2">
            <Select value={catFilter} onValueChange={(v) => v && setCatFilter(v)}>
              <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="In stock">In Stock</SelectItem>
                <SelectItem value="Opened">Opened</SelectItem>
                <SelectItem value="Low stock">Low Stock</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Disposed">Disposed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="Delete Material"
        description={`Delete "${deleteName}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
