"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl p-8">{children}</div>
          {/* Footer */}
          <footer className="border-t border-[var(--border)] bg-white mt-8">
            <div className="max-w-7xl mx-auto px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-slate-500">
              <div>
                <p className="font-semibold text-slate-700 mb-2">QEH 3D Printing Office</p>
                <p>Room 401, 4/F, Block F</p>
                <p>Queen Elizabeth Hospital</p>
                <p>30 Gascoigne Road, Kowloon</p>
                <p>Hong Kong S.A.R.</p>
                <p className="mt-2 text-xs text-slate-400">Mon–Thu 09:00–18:00 · Fri 09:00–17:00</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700 mb-2">Staff Contacts</p>
                <p>Ms. Madeleine Lam — (852) 3506 5184</p>
                <p className="text-xs text-slate-400">lly156@ha.org.hk</p>
                <p className="mt-1">Ms. Tiffany Chung — (852) 3506 5187</p>
                <p className="text-xs text-slate-400">cct757@ha.org.hk</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800 text-lg tracking-tight">QEH 3D Print</p>
                <p className="text-xs text-slate-400">Office Manager</p>
                <p className="text-xs text-slate-300 mt-4">&copy; 2026 QEH 3D Printing Office</p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
