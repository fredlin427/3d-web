"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
}

export function ImageUpload({ value, onChange, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Only image files allowed"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        onChange(json.url);
        toast.success("Uploaded");
      } else {
        toast.error(json.error || "Upload failed");
      }
    } catch (e) { console.error(e); toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {value ? (
        <div className="relative group rounded-lg overflow-hidden border bg-slate-50 h-40">
          <Image src={value} alt="Preview" fill sizes="400px" className="object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity gap-1"
              onClick={() => onChange("")}
            >
              <X className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
            dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) upload(file);
          }}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-slate-400" />
              <span className="text-sm text-slate-500 font-medium">Drop image or click to upload</span>
              <span className="text-[11px] text-slate-400">PNG, JPG, GIF up to 10MB</span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file); }}
          />
        </div>
      )}
    </div>
  );
}
