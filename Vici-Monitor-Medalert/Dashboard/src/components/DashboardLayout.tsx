import { useState, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";

export function DashboardLayout() {
  const [soundEnabled, setSoundEnabled] = useState(true);

  const toggleSound = useCallback(() => setSoundEnabled(prev => !prev), []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar soundEnabled={soundEnabled} onToggleSound={toggleSound} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 px-2">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet context={{ soundEnabled }} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
