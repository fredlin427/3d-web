import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "QEH 3D Printing — Application Form",
  description: "Submit a 3D printing service application to QEH 3D Printing Office",
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">QEH 3D Printing Office</h1>
            <p className="text-xs text-slate-500">3D Printing Service Application Form</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent0 text-sm font-bold text-white shadow-sm">3D</div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      <footer className="border-t bg-white py-6 text-center text-xs text-slate-400">
        QEH 3D Printing Office — Internal Use Only
      </footer>
      <Toaster position="top-center" richColors />
    </div>
  );
}
