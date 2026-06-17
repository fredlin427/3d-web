import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { RootWrapper } from "@/components/layout/root-wrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "QEH 3D Printing Office Manager",
  description: "Internal web application for QEH 3D Printing Office management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" style={{ fontFamily: '-apple-system, "Segoe UI", Arial, "Microsoft YaHei", sans-serif' }}>
      <body className="h-full">
        <TooltipProvider>
          <RootWrapper>{children}</RootWrapper>
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}
