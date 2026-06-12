"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/shared/loading-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, Column } from "@/components/shared/data-table";
import { toast } from "sonner";
import { Pencil, Trash2, AlertTriangle, Clock, Package, ArrowDownUp } from "lucide-react";
import { formatDate, formatDateTime, getStockAlertStatus, getStatusBadgeVariant } from "@/lib/utils";

interface MaterialDetail {
  id: string;
  category: string;
  materialName: string;
  materialId: string | null;
  brand: string | null;
  materialType: string | null;
  colour: string | null;
  batchNumber: string;
  supplier: string | null;
  purchaseDate: string | null;
  receivedDate: string | null;
  openDate: string | null;
  expiryDate: string | null;
  disposalDate: string | null;
  initialQuantity: number;
  currentQuantity: number;
  unusedQuantity: number;
  openedQuantity: number;
  expiredQuantity: number;
  unit: string;
  reorderThreshold: number;
  storageLocation: string | null;
  status: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  materialUsage?: Array<{
    id: string;
    usageDate: string;
    quantityUsed: number;
    unit: string;
    staffName: string | null;
    case?: { id: string; caseNumber: string };
  }>;
  stockTransactions?: Array<{
    id: string;
    transactionType: string;
    quantityChange: number;
    quantityAfter: number;
    transactionDate: string;
    staffName: string | null;
    notes: string | null;
    relatedCaseId: string | null;
  }>;
  auditLogs?: Array<{
    id: string;
    action: string;
    details: string | null;
    staffName: string;
    createdAt: string;
  }>;
}

export default function MaterialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params.id as string;

  const [material, setMaterial] = useState<MaterialDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchMaterial = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/materials/${materialId}`);
      const json = await res.json();
      if (json.success) {
        setMaterial(json.data);
      } else {
        toast.error("Material not found");
      }
    } catch {
      toast.error("Failed to load material");
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => { fetchMaterial(); }, [fetchMaterial]);

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/materials/${materialId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Material deleted");
        router.push("/materials");
      } else {
        toast.error("Failed to delete material");
      }
    } catch {
      toast.error("Failed to delete material");
    }
  };

  if (loading) return <LoadingState />;
  if (!material) return <p className="text-center py-8 text-slate-500">Material not found.</p>;

  const alert = getStockAlertStatus(material);

  const txColumns: Column<NonNullable<MaterialDetail["stockTransactions"]>[number]>[] = [
    { key: "transactionDate", header: "Date", render: (t) => <span className="text-xs">{formatDate(t.transactionDate)}</span> },
    { key: "transactionType", header: "Type", render: (t) => <Badge variant="outline" className="text-xs">{t.transactionType}</Badge> },
    {
      key: "quantityChange",
      header: "Change",
      render: (t) => (
        <span className={`text-sm font-medium ${t.quantityChange < 0 ? "text-red-600" : "text-green-600"}`}>
          {t.quantityChange > 0 ? "+" : ""}{t.quantityChange}
        </span>
      ),
    },
    { key: "quantityAfter", header: "After", render: (t) => <span className="text-sm">{t.quantityAfter}</span> },
    { key: "staffName", header: "Staff", render: (t) => <span className="text-xs">{t.staffName || "—"}</span> },
    { key: "notes", header: "Notes", render: (t) => <span className="text-xs">{t.notes || "—"}</span> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">{material.materialName}</h2>
            {material.materialId && <span className="text-xs font-mono text-slate-400 bg-slate-100 rounded px-2 py-0.5">{material.materialId}</span>}
            <Badge variant={getStatusBadgeVariant(material.status)}>{material.status}</Badge>
            {alert && alert.type !== "ok" && (
              <Badge variant={alert.type === "danger" ? "destructive" : "secondary"}>
                {alert.type === "danger" ? <AlertTriangle className="mr-1 h-3 w-3 inline" /> : <Clock className="mr-1 h-3 w-3 inline" />}
                {alert.message}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">{material.category} • Batch: {material.batchNumber}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/materials/${materialId}/edit`)}>
            <Pencil className="mr-1.5 h-4 w-4" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="text-red-600" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Material Info */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Material Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><p className="text-xs text-slate-400">Category</p><p className="font-medium">{material.category}</p></div>
                <div><p className="text-xs text-slate-400">Brand</p><p className="font-medium">{material.brand || "—"}</p></div>
                <div><p className="text-xs text-slate-400">Material Type</p><p className="font-medium">{material.materialType || "—"}</p></div>
                <div><p className="text-xs text-slate-400">Colour</p><p className="font-medium">{material.colour || "—"}</p></div>
                <div><p className="text-xs text-slate-400">Batch Number</p><p className="font-mono text-sm">{material.batchNumber}</p></div>
                <div><p className="text-xs text-slate-400">Supplier</p><p className="font-medium">{material.supplier || "—"}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Info */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Stock Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-xs text-slate-400">Total Weight</p><p className="font-medium text-lg">{material.initialQuantity} {material.unit}</p></div>
                <div><p className="text-xs text-slate-400">Used</p><p className="font-medium text-lg text-amber-600">{material.initialQuantity - material.currentQuantity} {material.unit}</p></div>
                <div><p className="text-xs text-slate-400">Remain</p><p className="font-medium text-lg text-emerald-600">{material.currentQuantity} {material.unit}</p></div>
                <div><p className="text-xs text-slate-400">Unit</p><p className="font-medium">{material.unit}</p></div>
                <div><p className="text-xs text-slate-400">Reorder Threshold</p><p className="font-medium">{material.reorderThreshold} {material.unit}</p></div>
                <div><p className="text-xs text-slate-400">Storage</p><p className="font-medium">{material.storageLocation || "—"}</p></div>
                <div><p className="text-xs text-slate-400">Status</p><Badge variant={getStatusBadgeVariant(material.status)}>{material.status}</Badge></div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Transactions */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Stock Transactions</CardTitle></CardHeader>
            <CardContent>
              {material.stockTransactions && material.stockTransactions.length > 0 ? (
                <DataTable data={material.stockTransactions} columns={txColumns} keyField="id" pageSize={10} />
              ) : (
                <p className="text-sm text-slate-400 py-4 text-center">No stock transactions recorded.</p>
              )}
            </CardContent>
          </Card>

          {/* Material Usage */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Usage History</CardTitle></CardHeader>
            <CardContent>
              {material.materialUsage && material.materialUsage.length > 0 ? (
                <div className="space-y-2">
                  {material.materialUsage.map((u) => (
                    <div key={u.id} className="flex items-center justify-between text-sm py-2 border-b last:border-b-0">
                      <div>
                        <span className="font-medium">{u.quantityUsed} {u.unit}</span>
                        <span className="text-slate-400 ml-2">on {formatDate(u.usageDate)}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {u.case?.caseNumber && (
                          <Button variant="link" className="text-xs h-auto p-0" onClick={() => router.push(`/cases/${u.case!.id}`)}>
                            Case: {u.case.caseNumber}
                          </Button>
                        )}
                        {u.staffName && <span className="ml-2">by {u.staffName}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 py-4 text-center">No usage history recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Important Dates</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Purchased:</span><span>{formatDate(material.purchaseDate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Received:</span><span>{formatDate(material.receivedDate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Opened:</span><span>{formatDate(material.openDate)}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-slate-400">Expiry:</span><span>{formatDate(material.expiryDate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Disposal:</span><span>{formatDate(material.disposalDate)}</span></div>
            </CardContent>
          </Card>

          {/* Audit Log */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Audit Log</CardTitle></CardHeader>
            <CardContent>
              {material.auditLogs && material.auditLogs.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {material.auditLogs.map((log) => (
                    <div key={log.id} className="flex gap-2 text-xs">
                      <Clock className="h-3 w-3 mt-0.5 shrink-0 text-slate-300" />
                      <div>
                        <p className="text-slate-500">{formatDateTime(log.createdAt)}</p>
                        <p className="font-medium text-slate-700">{log.action.replace(/_/g, " ")}</p>
                        {log.details && <p className="text-slate-400">{log.details}</p>}
                        <p className="text-slate-400">by {log.staffName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No audit log entries</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Material"
        description={`Delete "${material.materialName}" (${material.batchNumber})? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
