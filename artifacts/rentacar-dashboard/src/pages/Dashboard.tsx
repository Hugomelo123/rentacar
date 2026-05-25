import React, { useState, useEffect, useRef } from "react";
import {
  useGetDashboardStats,
  useGetTodayActivity,
  useListSosAlerts,
  useResolveSosAlert,
  useGetReservation,
  useSimulatePayment,
  useUpdateReservation,
  useUploadDocs,
  getGetDashboardStatsQueryKey,
  getListSosAlertsQueryKey,
  getGetTodayActivityQueryKey,
  getGetReservationQueryKey,
} from "@workspace/api-client-react";
import {
  AlertTriangle,
  Car,
  Users,
  TrendingUp,
  BellRing,
  Navigation,
  CheckCircle2,
  ShieldAlert,
  CreditCard,
  Camera,
  FileText,
  Clock,
  Sparkles,
  Phone,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { langBadge } from "@/lib/chat-i18n";

const POLL_MS = 2500;

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [selectedResId, setSelectedResId] = useState<number | null>(null);
  const [statusToUpdate, setStatusToUpdate] = useState<string>("");
  const prevSosCount = useRef(0);
  const [sosBanner, setSosBanner] = useState<{
    cliente: string;
    veiculo: string;
    lat: number;
    lng: number;
  } | null>(null);

  const pollOpts = { refetchInterval: POLL_MS };

  const { data: stats, isLoading: statsLoading, isFetching: statsFetching } = useGetDashboardStats({
    query: { ...pollOpts, queryKey: getGetDashboardStatsQueryKey() },
  });

  const { data: activities, isLoading: activityLoading, isFetching: activityFetching } = useGetTodayActivity({
    query: { ...pollOpts, queryKey: getGetTodayActivityQueryKey() },
  });

  const { data: sosAlerts, isLoading: sosLoading } = useListSosAlerts(
    { status: "ativo" },
    { query: { ...pollOpts, queryKey: getListSosAlertsQueryKey({ status: "ativo" }) } },
  );

  const resolveSos = useResolveSosAlert();

  useEffect(() => {
    const count = sosAlerts?.length ?? 0;
    if (count > prevSosCount.current && sosAlerts?.[0]) {
      const alert = sosAlerts[0];
      const cliente = alert.reservation?.cliente_nome ?? "Cliente";
      const veiculo = alert.reservation?.vehicle?.marca_modelo ?? "Veículo";
      setSosBanner({
        cliente,
        veiculo,
        lat: alert.localizacao_latitude ?? 32.6485,
        lng: alert.localizacao_longitude ?? -16.908,
      });
      toast.error("🚨 EMERGÊNCIA SOS — Cliente em apuros!", {
        description: `${cliente} • ${veiculo}`,
        duration: 12000,
      });
    }
    prevSosCount.current = count;
  }, [sosAlerts]);

  const handleResolveSos = (id: number) => {
    resolveSos.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("SOS resolvido com sucesso");
          setSosBanner(null);
          queryClient.invalidateQueries({ queryKey: getListSosAlertsQueryKey({ status: "ativo" }) });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        },
      },
    );
  };

  const overdueCount = stats?.overdue_returns || 0;
  const activeSos = stats?.active_sos ?? sosAlerts?.length ?? 0;

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Centro de Controlo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Autocunha Rent-a-Car • Operações em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
            {statsFetching || activityFetching ? "A sincronizar…" : "Sistema Ativo"}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {sosBanner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-destructive/15 border-2 border-destructive rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          >
            <ShieldAlert className="h-10 w-10 text-destructive shrink-0 animate-pulse" />
            <div className="flex-1">
              <h3 className="font-bold text-lg text-destructive">Cliente em Apuros — SOS Ativo</h3>
              <p className="text-sm">
                <strong>{sosBanner.cliente}</strong> • {sosBanner.veiculo}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                GPS: {sosBanner.lat.toFixed(4)}, {sosBanner.lng.toFixed(4)}
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <a
                href={`https://maps.google.com/?q=${sosBanner.lat},${sosBanner.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none"
              >
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <Navigation className="mr-2 h-4 w-4" />
                  Abrir Maps
                </Button>
              </a>
              <a href="tel:+351291000000" className="flex-1 sm:flex-none">
                <Button variant="outline" className="w-full border-destructive text-destructive">
                  <Phone className="mr-2 h-4 w-4" />
                  Contactar
                </Button>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {overdueCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-center gap-3 text-yellow-500"
        >
          <AlertTriangle className="h-6 w-6" />
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{overdueCount} cliente(s) em atraso</h3>
            <p className="text-sm opacity-80">Telefonar imediatamente para confirmar estado da devolução.</p>
          </div>
        </motion.div>
      )}

      {/* KPIs Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumKpiCard
          title="Tempo de Balcão Poupado"
          value={statsLoading ? undefined : `${stats?.counter_time_saved_minutes ?? 145} min`}
          subtitle="este mês (IA pré-check-in)"
          icon={Clock}
          accent="text-blue-400"
          loading={statsLoading}
        />
        <PremiumKpiCard
          title="Taxa Pré-Check-in"
          value={statsLoading ? undefined : `${stats?.pre_checkin_completion_rate ?? 82}%`}
          subtitle="documentos lidos pela IA"
          icon={Sparkles}
          accent="text-violet-400"
          loading={statsLoading}
        />
        <PremiumKpiCard
          title="Alertas SOS Ativos"
          value={statsLoading ? undefined : activeSos}
          subtitle={activeSos > 0 ? "ação imediata necessária" : "frota segura"}
          icon={ShieldAlert}
          accent={activeSos > 0 ? "text-destructive" : "text-green-500"}
          loading={statsLoading}
          pulse={activeSos > 0}
        />
        <PremiumKpiCard
          title="Receita Hoje"
          value={statsLoading ? undefined : `€${stats?.revenue_today ?? 0}`}
          subtitle={`${stats?.occupancy_rate ?? 0}% ocupação`}
          icon={TrendingUp}
          accent="text-emerald-400"
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Reservas Hoje" value={stats?.total_reservations_today} icon={Users} loading={statsLoading} />
        <StatCard title="Na Estrada" value={stats?.cars_on_road} icon={Car} loading={statsLoading} />
        <StatCard
          title="Pagamentos Pend."
          value={stats?.pending_payment}
          icon={AlertTriangle}
          loading={statsLoading}
          color="text-amber-500"
        />
        <StatCard title="Check-ins IA" value={stats?.checkin_done} icon={CheckCircle2} loading={statsLoading} color="text-blue-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:min-h-[560px]">
        <Card className="lg:col-span-2 flex flex-col border-border/50 shadow-lg h-full overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/50 shrink-0 bg-card/80">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              Pré-Check-ins & Reservas de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto relative">
            <AnimatePresence mode="wait">
              {activityLoading ? (
                <motion.div
                  key="skel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 space-y-3"
                >
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
                  ))}
                </motion.div>
              ) : activities?.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-8 text-center text-muted-foreground"
                >
                  Sem atividade registada hoje. Use o simulador WhatsApp para criar uma reserva de demonstração.
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="divide-y divide-border/40"
                >
                  {activities?.map((activity) => (
                    <motion.div
                      key={`${activity.id}-${activity.tipo}`}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-4 hover:bg-secondary/40 transition-all duration-300 flex items-center justify-between cursor-pointer group",
                        activityFetching && "opacity-90",
                      )}
                      onClick={() => setSelectedResId(activity.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <LangBadge code={activity.cliente_idioma} />
                        <div className="min-w-0">
                          <div className="font-semibold group-hover:text-primary transition-colors truncate">
                            {activity.cliente_nome}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">{activity.veiculo}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-sm font-medium">{activity.hora}</div>
                        <OperationalBadge
                          statusReserva={activity.status_reserva}
                          statusPagamento={activity.status_pagamento}
                        />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {activityFetching && !activityLoading && (
              <div className="absolute top-2 right-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          className={cn(
            "flex flex-col border-border/50 shadow-lg h-full overflow-hidden transition-all duration-300",
            (sosAlerts?.length ?? 0) > 0 && "animate-flash-red border-destructive/60",
          )}
        >
          <CardHeader className="pb-3 border-b border-border/50 shrink-0">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BellRing
                className={cn(
                  "h-5 w-5",
                  (sosAlerts?.length ?? 0) > 0 ? "text-destructive animate-bounce" : "text-muted-foreground",
                )}
              />
              Zona SOS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto">
            {sosLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ) : (sosAlerts?.length ?? 0) > 0 ? (
              <div className="space-y-4">
                {sosAlerts?.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-destructive/10 border border-destructive/40 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="destructive" className="animate-pulse">
                        CLIENTE EM APUROS
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleTimeString("pt-PT")}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{alert.reservation?.cliente_nome}</div>
                      <div className="text-sm opacity-80">{alert.reservation?.vehicle?.marca_modelo}</div>
                      {alert.reservation?.cliente_idioma && (
                        <LangBadge code={alert.reservation.cliente_idioma} className="mt-2" />
                      )}
                    </div>
                    {alert.foto_problema_url && (
                      <div className="h-28 w-full rounded-lg overflow-hidden border border-border/50">
                        <img src={alert.foto_problema_url} alt="Problema" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <a
                        href={`https://maps.google.com/?q=${alert.localizacao_latitude},${alert.localizacao_longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                          <Navigation className="mr-2 h-4 w-4" />
                          Abrir no Google Maps
                        </Button>
                      </a>
                      <a href={`tel:${alert.reservation?.cliente_telefone ?? "+351291000000"}`}>
                        <Button variant="outline" className="w-full">
                          <Phone className="mr-2 h-4 w-4" />
                          Ligar ao Cliente
                        </Button>
                      </a>
                      <Button
                        variant="outline"
                        className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
                        onClick={() => handleResolveSos(alert.id)}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Marcar Resolvido
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-green-500/80 min-h-[200px]">
                <CheckCircle2 className="h-14 w-14 mb-3 opacity-50" />
                <h3 className="font-semibold text-lg">Sistema Normal</h3>
                <p className="text-sm opacity-80">Nenhum alerta SOS ativo.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ReservationModal
        id={selectedResId}
        onClose={() => setSelectedResId(null)}
        statusToUpdate={statusToUpdate}
        setStatusToUpdate={setStatusToUpdate}
        pollMs={POLL_MS}
      />
    </div>
  );
}

function LangBadge({ code, className }: { code?: string | null; className?: string }) {
  const label = langBadge(code ?? "pt");
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center h-7 w-7 rounded-md text-[10px] font-bold bg-primary/15 text-primary border border-primary/30 shrink-0",
        className,
      )}
      title={`Idioma do cliente: ${label}`}
    >
      {label}
    </span>
  );
}

function PremiumKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  loading,
  pulse,
}: {
  title: string;
  value?: string | number;
  subtitle: string;
  icon: React.ElementType;
  accent: string;
  loading?: boolean;
  pulse?: boolean;
}) {
  return (
    <Card className="bg-gradient-to-br from-card to-card/60 border-border/60 shadow-md overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <Icon className={cn("h-8 w-8 opacity-80", accent, pulse && "animate-pulse")} />
        </div>
        {loading ? (
          <Skeleton className="h-9 w-24 mt-3" />
        ) : (
          <div className={cn("text-3xl font-bold mt-3 tracking-tight", accent)}>{value ?? "—"}</div>
        )}
        <div className="text-sm font-medium mt-1">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

function ReservationModal({
  id,
  onClose,
  statusToUpdate,
  setStatusToUpdate,
  pollMs,
}: {
  id: number | null;
  onClose: () => void;
  statusToUpdate: string;
  setStatusToUpdate: (v: string) => void;
  pollMs: number;
}) {
  const queryClient = useQueryClient();
  const [retainingDeposit, setRetainingDeposit] = useState(false);
  const [depositRetained, setDepositRetained] = useState(false);

  const { data: res, isLoading } = useGetReservation(id!, {
    query: {
      enabled: !!id,
      refetchInterval: pollMs,
      queryKey: getGetReservationQueryKey(id!),
    },
  });

  const simulatePayment = useSimulatePayment();
  const updateReservation = useUpdateReservation();
  const uploadDocs = useUploadDocs();

  useEffect(() => {
    setDepositRetained(false);
    setRetainingDeposit(false);
  }, [id]);

  useEffect(() => {
    const docs = res?.docs_checkin_url as Record<string, unknown> | undefined;
    if (docs?.caucao_retida === true) setDepositRetained(true);
  }, [res?.docs_checkin_url]);

  if (!id) return null;

  const handleSimulatePayment = () => {
    simulatePayment.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Pagamento processado com sucesso!");
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTodayActivityQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetReservationQueryKey(id) });
        },
      },
    );
  };

  const handleRetainDeposit = () => {
    setRetainingDeposit(true);
    setTimeout(() => {
      const docs = (res?.docs_checkin_url as Record<string, unknown>) ?? {};
      uploadDocs.mutate(
        {
          id,
          data: {
            docs: {
              ...docs,
              caucao_retida: true,
              caucao_valor: res?.vehicle?.valor_caucao ?? 1200,
              caucao_processador: "Stripe/Revolut (simulado)",
              caucao_data: new Date().toISOString(),
            },
          },
        },
        {
          onSuccess: () => {
            setRetainingDeposit(false);
            setDepositRetained(true);
            toast.success("Caução retida com sucesso", {
              description: "Bloqueio simulado via Stripe/Revolut.",
            });
            queryClient.invalidateQueries({ queryKey: getGetReservationQueryKey(id) });
            queryClient.invalidateQueries({ queryKey: getGetTodayActivityQueryKey() });
          },
          onError: () => setRetainingDeposit(false),
        },
      );
    }, 2200);
  };

  const handleUpdateStatus = () => {
    if (!statusToUpdate) return;
    updateReservation.mutate(
      { id, data: { status_reserva: statusToUpdate as "criada" | "checkin_feito" | "carro_na_estrada" | "concluida" } },
      {
        onSuccess: () => {
          toast.success("Estado atualizado com sucesso!");
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTodayActivityQueryKey() });
          onClose();
        },
      },
    );
  };

  const docs = res?.docs_checkin_url as Record<string, unknown> | undefined;
  const ocr = docs?.ocr as Record<string, string> | undefined;
  const docUrls = docs
    ? Object.entries(docs).filter(([k]) => !["ocr", "ia_verificado", "caucao_retida", "caucao_valor", "caucao_processador", "caucao_data"].includes(k))
    : [];
  const fotos = res?.fotos_estado_carro as Record<string, string> | undefined;
  const showDeposit =
    res?.tipo_protecao === "standard_com_caucao" && res?.status_pagamento === "pago_sinal";

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2 flex-wrap">
            Reserva #{id}
            {res?.cliente_idioma && <LangBadge code={res.cliente_idioma} />}
          </DialogTitle>
          <DialogDescription>
            {isLoading
              ? "A carregar detalhes da reserva…"
              : res
                ? `${res.cliente_nome} • ${res.vehicle?.marca_modelo ?? "Veículo"}`
                : "Detalhes da reserva"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : res ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Detalhes Financeiros
                </h4>
                <div className="bg-secondary/50 rounded-xl p-4 space-y-3 border border-border/50">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Total</span>
                    <span className="font-semibold">€{res.valor_total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pagamento</span>
                    <OperationalBadge statusReserva={res.status_reserva} statusPagamento={res.status_pagamento} />
                  </div>
                  {res.status_pagamento !== "pago_sinal" && (
                    <Button onClick={handleSimulatePayment} className="w-full" variant="outline" size="sm">
                      <CreditCard className="mr-2 h-4 w-4" /> Simular Pagamento
                    </Button>
                  )}
                  {showDeposit && (
                    <div className="pt-2 border-t border-border/50">
                      {depositRetained ? (
                        <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          Caução Retida com Sucesso
                        </div>
                      ) : (
                        <Button
                          onClick={handleRetainDeposit}
                          disabled={retainingDeposit}
                          className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
                        >
                          {retainingDeposit ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              A processar bloqueio…
                            </>
                          ) : (
                            <>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Reter Caução (Stripe/Revolut)
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {ocr && (
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-violet-300 mb-2">
                    <Sparkles className="h-4 w-4" /> Dados extraídos pela IA
                  </h4>
                  <dl className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Nome</dt>
                      <dd className="font-medium">{ocr.nome}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Documento</dt>
                      <dd className="font-mono text-xs">{ocr.numero_documento}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Validade</dt>
                      <dd>{ocr.validade}</dd>
                    </div>
                    {ocr.nacionalidade && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Nacionalidade</dt>
                        <dd>{ocr.nacionalidade}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Atualizar Estado
                </h4>
                <div className="flex gap-2">
                  <Select value={statusToUpdate} onValueChange={setStatusToUpdate}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="criada">Pendente</SelectItem>
                      <SelectItem value="checkin_feito">Documentos Lidos (IA)</SelectItem>
                      <SelectItem value="carro_na_estrada">Check-in Concluído</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleUpdateStatus} disabled={!statusToUpdate || statusToUpdate === res.status_reserva}>
                    Atualizar
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Documentos Check-in
                </h4>
                {docUrls.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {docUrls.map(([key, url]) =>
                      typeof url === "string" ? (
                        <div key={key} className="relative rounded-lg overflow-hidden bg-secondary aspect-video border border-border/50">
                          <img src={url} alt={key} className="object-cover w-full h-full" />
                          <div className="absolute inset-x-0 bottom-0 bg-black/70 text-[10px] p-1 text-center text-white truncate">
                            {key}
                          </div>
                        </div>
                      ) : null,
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Aguardar envio via WhatsApp…</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Camera className="h-4 w-4" /> Fotos do Veículo
                </h4>
                {fotos && Object.keys(fotos).length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(fotos).map(([key, url]) => (
                      <div key={key} className="relative rounded-lg overflow-hidden bg-secondary aspect-video border border-border/50">
                        <img src={url} alt={key} className="object-cover w-full h-full" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 text-[10px] p-1 text-center text-white">{key}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sem fotos registadas.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ title, value, icon: Icon, loading, color }: {
  title: string;
  value?: number | string;
  icon: React.ElementType;
  loading?: boolean;
  color?: string;
}) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={cn("h-5 w-5 opacity-70 shrink-0", color)} />
        <div>
          {loading ? <Skeleton className="h-6 w-10" /> : <div className="text-xl font-bold">{value ?? "—"}</div>}
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{title}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function OperationalBadge({
  statusReserva,
  statusPagamento,
}: {
  statusReserva: string;
  statusPagamento: string;
}) {
  const props = (() => {
    if (statusPagamento === "pendente") {
      return { className: "bg-amber-500/20 text-amber-400 border-amber-500/40", label: "Pendente" };
    }
    if (statusReserva === "criada" && statusPagamento === "pago_sinal") {
      return { className: "bg-orange-500/20 text-orange-400 border-orange-500/40", label: "Aguardar Caução" };
    }
    if (statusReserva === "checkin_feito") {
      return { className: "bg-violet-500/20 text-violet-300 border-violet-500/40", label: "Documentos Lidos (IA)" };
    }
    if (statusReserva === "carro_na_estrada") {
      return { className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40", label: "Check-in Concluído" };
    }
    if (statusReserva === "concluida") {
      return { className: "bg-muted text-muted-foreground border-border", label: "Concluída" };
    }
    return { className: "bg-secondary text-foreground", label: statusReserva };
  })();

  return (
    <Badge variant="outline" className={cn("mt-1 text-[10px] font-medium", props.className)}>
      {props.label}
    </Badge>
  );
}
