import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Car, Settings, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WhatsAppSimulator } from "@/components/whatsapp/WhatsAppSimulator";
import { consumeWhatsAppFocus } from "@/lib/intro";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Live Feed" },
  { href: "/fleet", icon: Car, label: "Frota" },
  { href: "/settings", icon: Settings, label: "Config" },
];

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    setIsDesktop(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [whatsappOpen, setWhatsappOpen] = useState<boolean>(
    () => consumeWhatsAppFocus() || true,
  );
  const isDesktop = useIsDesktop();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground dark">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-16 xl:w-20 border-r border-border bg-card flex-col items-center py-6 shrink-0">
        <div className="h-10 w-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-bold text-xl mb-8 shadow-lg shadow-primary/20" title="Autocunha">
          A
        </div>
        <nav className="flex flex-col gap-4 w-full px-2 xl:px-3">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 cursor-pointer",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  title={item.label}
                >
                  <item.icon className="h-6 w-6 mb-1" />
                  <span className="text-[10px] font-medium hidden xl:block text-center">
                    {item.label.split(" ")[0]}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-2 xl:px-3 w-full">
          <button
            onClick={() => setWhatsappOpen((v) => !v)}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 cursor-pointer w-full",
              whatsappOpen
                ? "bg-[#25D366]/10 text-[#25D366]"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            title="WhatsApp"
          >
            <MessageCircle className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-medium hidden xl:block">WhatsApp</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="h-8 w-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-sm">
            A
          </div>
          <span className="font-semibold text-sm">Autocunha · Painel</span>
          <button
            onClick={() => setWhatsappOpen(true)}
            className="relative p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#25D366]" />
          </button>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 xl:p-8 pb-20 lg:pb-6">
          {children}
        </div>

        {/* ── Bottom nav — mobile only ── */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border flex z-40">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <div
                  className={cn(
                    "flex flex-col items-center justify-center py-2 gap-0.5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
          <button
            onClick={() => setWhatsappOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground hover:text-[#25D366] transition-colors relative"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-[10px] font-medium">WhatsApp</span>
            <span className="absolute top-2 right-[calc(50%-10px)] h-2 w-2 rounded-full bg-[#25D366]" />
          </button>
        </nav>
      </main>

      {/* ── WhatsApp — desktop inline panel ── */}
      {isDesktop && (
        <aside
          className={cn(
            "border-l border-border bg-white flex flex-col shrink-0 relative z-10 shadow-2xl transition-all duration-300 overflow-hidden",
            whatsappOpen ? "w-[360px] xl:w-[400px]" : "w-0 border-l-0"
          )}
        >
          {whatsappOpen && (
            <div className="w-[360px] xl:w-[400px] flex flex-col h-full">
              <WhatsAppSimulator />
            </div>
          )}
        </aside>
      )}

      {/* ── WhatsApp — mobile/tablet sheet ── */}
      {!isDesktop && (
        <Sheet open={whatsappOpen} onOpenChange={setWhatsappOpen}>
          <SheetContent
            side="right"
            className="p-0 w-full sm:w-[390px] bg-white border-l border-border flex flex-col [&>button]:hidden"
          >
            <SheetTitle className="sr-only">Simulador WhatsApp Autocunha</SheetTitle>
            <SheetDescription className="sr-only">
              Canal de reserva e pré-check-in com assistente IA
            </SheetDescription>
            <div className="flex items-center justify-between bg-[#128C7E] px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-white" />
                <span className="text-white font-semibold text-sm">RentaCar Bot</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={() => setWhatsappOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <WhatsAppSimulator hideHeader />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
