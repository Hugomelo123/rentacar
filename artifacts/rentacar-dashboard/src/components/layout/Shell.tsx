import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Car, Settings, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { WhatsAppSimulator } from "@/components/whatsapp/WhatsAppSimulator";

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Live Feed" },
    { href: "/fleet", icon: Car, label: "Gestão de Frota" },
    { href: "/settings", icon: Settings, label: "Configurações" },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground dark">
      {/* Sidebar - Narrow */}
      <aside className="w-16 md:w-20 border-r border-border bg-card flex flex-col items-center py-6 shrink-0">
        <div className="h-10 w-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-bold text-xl mb-8 shadow-lg shadow-primary/20">
          R
        </div>
        
        <nav className="flex flex-col gap-4 w-full px-2 md:px-3">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 cursor-pointer group",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  title={item.label}
                >
                  <item.icon className="h-6 w-6 mb-1" />
                  <span className="text-[10px] font-medium hidden md:block text-center">{item.label.split(' ')[0]}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </main>

      {/* Fixed Right Panel - WhatsApp Simulator */}
      <aside className="w-[380px] border-l border-border bg-white flex flex-col shrink-0 relative z-10 shadow-2xl">
        <WhatsAppSimulator />
      </aside>
    </div>
  );
}
