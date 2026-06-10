"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const materialSchema = z.object({
  category: z.string().min(1, "Category is required"),
  materialName: z.string().min(1, "Material name is required"),
  brand: z.string().optional(),
  materialType: z.string().optional(),
  colour: z.string().optional(),
  batchNumber: z.string().min(1, "Batch number is required"),
  supplier: z.string().optional(),
  purchaseDate: z.string().optional(),
  receivedDate: z.string().optional(),
  openDate: z.string().optional(),
  expiryDate: z.string().optional(),
  disposalDate: z.string().optional(),
  initialQuantity: z.coerce.number().min(0),
  currentQuantity: z.coerce.number().min(0),
  unit: z.string().default("unit"),
  reorderThreshold: z.coerce.number().min(0).default(0),
  storageLocation: z.string().optional(),
  status: z.string().default("In stock"),
  remarks: z.string().optional(),
  staffName: z.string().optional(),
});

type MaterialFormData = z.infer<typeof materialSchema>;

interface MaterialFormProps {
  defaultValues?: Partial<MaterialFormData>;
  isEditing?: boolean;
  materialId?: string;
}

export function MaterialForm({ defaultValues, isEditing, materialId }: MaterialFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<MaterialFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(materialSchema) as any,
    defaultValues: defaultValues || {
      status: "In stock",
      unit: "unit",
      initialQuantity: 0,
      currentQuantity: 0,
      reorderThreshold: 0,
    },
  });

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success) {
        const data = json.data as Array<{ type: string; value: string; isActive: boolean }>;
        setCategories(data.filter((s) => s.type === "material_category" && s.isActive).map((s) => s.value));
        setUnits(data.filter((s) => s.type === "material_unit" && s.isActive).map((s) => s.value));
      }
    }
    load();
  }, []);

  const list = (items: string[], fallback: string[]) => items.length > 0 ? items : fallback;

  const onSubmit = async (data: MaterialFormData) => {
    setSaving(true);
    try {
      const url = isEditing ? `/api/materials/${materialId}` : "/api/materials";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const json = await res.json();
        toast.success(isEditing ? "Material updated" : "Material created");
        if (isEditing) {
          router.push(`/materials/${materialId}`);
        } else {
          router.push(`/materials/${json.data.id}`);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save material");
      }
    } catch {
      toast.error("Failed to save material");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Material Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select onValueChange={(v) => { if (v) setValue("category", v); }} value={watch("category")}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {list(categories, ["FDM Filaments", "SLA Resins", "Resin Tanks", "IPA"]).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="materialName">Material Name *</Label>
            <Input id="materialName" {...register("materialName")} />
            {errors.materialName && <p className="text-xs text-red-500">{errors.materialName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" {...register("brand")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="materialType">Material Type</Label>
            <Input id="materialType" {...register("materialType")} placeholder="e.g., PLA, ABS, Tough, Flexible" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="colour">Colour</Label>
            <Input id="colour" {...register("colour")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="batchNumber">Batch Number *</Label>
            <Input id="batchNumber" {...register("batchNumber")} />
            {errors.batchNumber && <p className="text-xs text-red-500">{errors.batchNumber.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Input id="supplier" {...register("supplier")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Stock & Quantities</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="initialQuantity">Initial Quantity *</Label>
            <Input id="initialQuantity" type="number" step="0.01" {...register("initialQuantity")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentQuantity">Current Quantity *</Label>
            <Input id="currentQuantity" type="number" step="0.01" {...register("currentQuantity")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Select onValueChange={(v) => { if (v) setValue("unit", v); }} value={watch("unit")}>
              <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
              <SelectContent>
                {list(units, ["roll", "bottle", "cartridge", "litre", "ml", "kg", "g", "unit"]).map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reorderThreshold">Reorder Threshold</Label>
            <Input id="reorderThreshold" type="number" step="0.01" {...register("reorderThreshold")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storageLocation">Storage Location</Label>
            <Input id="storageLocation" {...register("storageLocation")} placeholder="e.g., Shelf A, Cabinet 1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={(v) => { if (v) setValue("status", v); }} value={watch("status")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["In stock", "Opened", "Low stock", "Expired", "Disposed"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Dates</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="receivedDate">Received Date</Label>
            <Input id="receivedDate" type="date" {...register("receivedDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="openDate">Open Date</Label>
            <Input id="openDate" type="date" {...register("openDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input id="expiryDate" type="date" {...register("expiryDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="disposalDate">Disposal Date</Label>
            <Input id="disposalDate" type="date" {...register("disposalDate")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Additional</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" {...register("remarks")} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staffName">Staff Name (for audit)</Label>
            <Input id="staffName" {...register("staffName")} placeholder="Your name" />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Material" : "Create Material"}
        </Button>
      </div>
    </form>
  );
}
