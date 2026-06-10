"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export default function StockTakePage() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    totalRows: number;
    updatedItems: number;
    errors: { row: number; message: string }[];
    importedAt: string;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleExport = () => {
    window.open("/api/stock-take/export", "_blank");
    toast.success("Stock take list downloaded");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setImportResult(null);

    try {
      const text = await selectedFile.text();
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

      // Parse CSV rows
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || "";
        });

        rows.push({
          materialId: row["Material ID"] || row["materialId"] || row["MaterialID"] || undefined,
          batchNumber: row["Batch Number"] || row["batchNumber"] || row["BatchNumber"] || undefined,
          countedQuantity: parseFloat(
            row["Counted Quantity"] || row["countedQuantity"] || row["CountedQuantity"] || "0"
          ),
          staffName: row["Staff Name"] || row["staffName"] || row["StaffName"] || undefined,
          notes: row["Notes"] || row["notes"] || undefined,
        });
      }

      const res = await fetch("/api/stock-take/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      const json = await res.json();
      if (json.success) {
        setImportResult(json.data);
        toast.success(`Stock take imported: ${json.data.updatedItems} items updated`);
      } else {
        toast.error(json.error || "Import failed");
      }
    } catch {
      toast.error("Failed to parse CSV file");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Stock Take</h2>
        <p className="text-sm text-slate-500 mt-1">Export stock list and import counted quantities</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Export Stock-Taking List</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">
              Download a CSV file with all materials and their current quantities. Use this for physical stock counting.
            </p>
            <p className="text-xs text-slate-400">
              Columns: Material ID, Category, Material Name, Brand, Type, Colour, Batch Number,
              Current Quantity, Unit, Storage Location, Status, Expiry Date, Remarks
            </p>
            <Button onClick={handleExport} className="bg-teal-600 hover:bg-teal-700">
              <Download className="mr-2 h-4 w-4" /> Export Stock List (CSV)
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Import Stock Take Record</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">
              Upload the completed CSV with counted quantities. Expected columns:
            </p>
            <div className="text-xs text-slate-400 space-y-1">
              <p>• <strong>Material ID</strong> or <strong>Batch Number</strong> (required for matching)</p>
              <p>• <strong>Counted Quantity</strong> (required, must be numeric)</p>
              <p>• <strong>Staff Name</strong> (optional)</p>
              <p>• <strong>Notes</strong> (optional)</p>
            </div>
            <Separator />
            <div className="space-y-3">
              <Input type="file" accept=".csv" onChange={handleFileChange} />
              <Button
                onClick={handleImport}
                disabled={!selectedFile || importing}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Import Stock Take
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Result */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Import Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-700">{importResult.totalRows}</p>
                <p className="text-xs text-slate-500">Total Rows</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{importResult.updatedItems}</p>
                <p className="text-xs text-slate-500">Updated Items</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{importResult.errors.length}</p>
                <p className="text-xs text-slate-500">Errors</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-700 mb-2">Row Errors:</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="text-xs text-red-600 flex gap-2">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>Row {err.row}: {err.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400 mt-4">
              Imported at: {new Date(importResult.importedAt).toLocaleString("en-GB")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
