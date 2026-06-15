"use client";
import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { Navbar } from "../Navbar";
import { MobileSidebarProvider } from "./MobileSidebarContext";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <MobileSidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
}