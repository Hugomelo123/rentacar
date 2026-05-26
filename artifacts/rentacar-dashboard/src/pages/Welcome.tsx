import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Car,
  LayoutDashboard,
  MessageCircle,
  FileCheck,
  MapPin,
  Shield,
  Plane,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { requestWhatsAppFocus, setSkipIntro, shouldSkipIntro } from "@/lib/intro";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function fadeDelay(i: number) {
  return { delay: 0.08 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };
}

const pillars = [
  {
    icon: MessageCircle,
    title: "Reserva no WhatsApp",
    desc: "A Sofia trata de datas, viatura, caução e contrato — tudo por mensagem.",
    accent: "text-[#25D366]",
    bg: "bg-[#25D366]/10 border-[#25D366]/25",
  },
  {
    icon: LayoutDashboard,
    title: "Painel da loja",
    desc: "Reservas, frota, pagamentos e alertas SOS visíveis em tempo real.",
    accent: "text-primary",
    bg: "bg-primary/10 border-primary/25",
  },
  {
    icon: FileCheck,
    title: "Pré-check-in",
    desc: "Documentos enviados antes da chegada — menos tempo de espera no balcão.",
    accent: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/25",
  },
] as const;

export default function Welcome() {
  const [, navigate] = useLocation();
  const [ready, setReady] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (shouldSkipIntro()) {
      navigate("/dashboard", { replace: true });
      return;
    }
    setReady(true);
  }, [navigate]);

  const enter = (mode: "full" | "whatsapp") => {
    if (dontShowAgain) setSkipIntro(true);
    if (mode === "whatsapp") requestWhatsAppFocus();
    navigate("/dashboard", { replace: true });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && ready) enter("full");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          className="h-12 w-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-xl text-primary"
          animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
        >
          A
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground dark">
      {/* Ambiente */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[900px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[500px] rounded-full bg-[#25D366]/15 blur-[100px]" />
        <div className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-[80px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border) / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.4) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        {/* Topo */}
        <motion.header
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={fadeDelay(0)}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold shadow-lg shadow-primary/30">
              A
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Autocunha</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Madeira
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
            <Car className="h-3 w-3 text-primary" />
            Versão demonstração
          </span>
        </motion.header>

        {/* Hero */}
        <div className="flex flex-1 flex-col items-center justify-center py-10 sm:py-14">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={fadeDelay(1)}
            className="mb-8 flex flex-col items-center text-center"
          >
            <div className="relative mb-6">
              <motion.div
                className="absolute inset-0 rounded-3xl bg-primary/30 blur-2xl"
                animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.95, 1.05, 0.95] }}
                transition={{ repeat: Infinity, duration: 4 }}
              />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/30 bg-gradient-to-br from-primary to-primary/70 text-3xl font-bold text-primary-foreground shadow-2xl shadow-primary/25">
                A
              </div>
            </div>

            <h1 className="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Autocunha Rent-a-Car
            </h1>
            <p className="mt-3 max-w-lg text-base text-muted-foreground sm:text-lg leading-relaxed">
              Aluguer de carros na Madeira — reserve pelo{" "}
              <span className="text-[#25D366] font-medium">WhatsApp</span>, levante no{" "}
              <span className="text-primary font-medium">balcão</span> com menos filas.
            </p>
            <p className="mt-2 text-sm text-muted-foreground/80">
              Aeroporto do Funchal · Frota local · Atendimento em PT, EN, FR, ES
            </p>
          </motion.div>

          {/* Fluxo visual */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={fadeDelay(2)}
            className="mb-10 flex w-full max-w-md items-center justify-center gap-2 sm:gap-4"
          >
            <FlowNode icon={MessageCircle} label="Cliente" sub="WhatsApp" green />
            <FlowPulse />
            <FlowNode icon={FileCheck} label="Sofia" sub="Reserva & docs" emerald />
            <FlowPulse />
            <FlowNode icon={LayoutDashboard} label="Loja" sub="Painel" blue />
          </motion.div>

          {/* Pilares */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={fadeDelay(3)}
            className="mb-10 grid w-full max-w-3xl gap-3 sm:grid-cols-3 sm:gap-4"
          >
            {pillars.map((p) => (
              <div
                key={p.title}
                className={cn(
                  "rounded-2xl border p-4 backdrop-blur-sm transition-colors",
                  p.bg,
                )}
              >
                <p.icon className={cn("h-5 w-5 mb-2", p.accent)} />
                <h2 className="text-sm font-semibold">{p.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={fadeDelay(4)}
            className="flex w-full max-w-md flex-col gap-3 sm:max-w-lg"
          >
            <Button
              size="lg"
              className="h-12 w-full rounded-xl text-base shadow-lg shadow-primary/20"
              onClick={() => enter("full")}
            >
              <LayoutDashboard className="h-5 w-5" />
              Ver demonstração completa
              <ArrowRight className="h-4 w-4 ml-auto opacity-70" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-xl text-base border-[#25D366]/40 hover:bg-[#25D366]/10 hover:text-[#25D366]"
              onClick={() => enter("whatsapp")}
            >
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
              Começar pelo WhatsApp com a Sofia
            </Button>

            <label className="flex cursor-pointer items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
              <Checkbox
                checked={dontShowAgain}
                onCheckedChange={(v) => setDontShowAgain(v === true)}
                id="skip-intro"
              />
              <span>Não mostrar este ecrã novamente</span>
            </label>

            <p className="text-center text-[11px] text-muted-foreground/80">
              Pressione <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> para entrar · dados de demonstração
            </p>
          </motion.div>
        </div>

        {/* Rodapé */}
        <motion.footer
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={fadeDelay(5)}
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border/60 pt-6 text-[11px] text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1">
            <Plane className="h-3 w-3" />
            Levantamento no aeroporto
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span className="inline-flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Dados fictícios — ambiente de demo
          </span>
        </motion.footer>
      </div>
    </div>
  );
}

function FlowNode({
  icon: Icon,
  label,
  sub,
  green,
  emerald,
  blue,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  green?: boolean;
  emerald?: boolean;
  blue?: boolean;
}) {
  const ring = green
    ? "border-[#25D366]/40 bg-[#25D366]/10"
    : emerald
      ? "border-emerald-400/40 bg-emerald-400/10"
      : "border-primary/40 bg-primary/10";
  const iconCls = green ? "text-[#25D366]" : emerald ? "text-emerald-400" : "text-primary";

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1">
      <div className={cn("flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border", ring)}>
        <Icon className={cn("h-5 w-5", iconCls)} />
      </div>
      <span className="text-[10px] sm:text-xs font-semibold truncate max-w-full">{label}</span>
      <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate max-w-full">{sub}</span>
    </div>
  );
}

function FlowPulse() {
  return (
    <div className="flex shrink-0 items-center px-0.5" aria-hidden>
      <AnimatePresence mode="wait">
        <motion.div
          className="flex gap-1"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        >
          <span className="h-1 w-1 rounded-full bg-muted-foreground" />
          <span className="h-1 w-1 rounded-full bg-muted-foreground" />
          <span className="h-1 w-1 rounded-full bg-muted-foreground" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
