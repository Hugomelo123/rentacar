import React, { useState } from "react";
import { 
  useGetDashboardStats, 
  useGetTodayActivity, 
  useListSosAlerts, 
  useResolveSosAlert,
  useGetReservation,
  useSimulatePayment,
  useUpdateReservation,
  getGetDashboardStatsQueryKey,
  getListSosAlertsQueryKey,
  getGetTodayActivityQueryKey,
  getGetReservationQueryKey
} from "@workspace/api-client-react";
import { AlertTriangle, Car, Users, TrendingUp, BellRing, Navigation, CheckCircle2, ShieldAlert, CreditCard, Camera, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [selectedResId, setSelectedResId] = useState<number | null>(null);
  const [statusToUpdate, setStatusToUpdate] = useState<string>("");
  
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { refetchInterval: 5000, queryKey: getGetDashboardStatsQueryKey() }
  });
  
  const { data: activities, isLoading: activityLoading } = useGetTodayActivity({
    query: { refetchInterval: 5000, queryKey: getGetTodayActivityQueryKey() }
  });
  
  const { data: sosAlerts, isLoading: sosLoading } = useListSosAlerts(
    { status: "ativo" },
    { query: { refetchInterval: 5000, queryKey: getListSosAlertsQueryKey({ status: "ativo" }) } }
  );

  const resolveSos = useResolveSosAlert();

  const handleResolveSos = (id: number) => {
    resolveSos.mutate({ id }, {
      onSuccess: () => {
        toast.success("SOS resolvido com sucesso");
        queryClient.invalidateQueries({ queryKey: getListSosAlertsQueryKey({ status: "ativo" }) });
      }
    });
  };

  const overdueCount = stats?.overdue_returns || 0;

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Centro de Controlo</h1>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Sistema Ativo</span>
        </div>
      </div>

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
          <Button variant="outline" className="border-yellow-500/50 hover:bg-yellow-500/20 text-yellow-500">
            Ver Clientes
          </Button>
        </motion.div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Reservas Hoje" value={stats?.total_reservations_today} icon={Users} loading={statsLoading} />
        <StatCard title="Na Estrada" value={stats?.cars_on_road} icon={Car} loading={statsLoading} />
        <StatCard title="Pagamentos Pend." value={stats?.pending_payment} icon={AlertTriangle} loading={statsLoading} color="text-amber-500" />
        <StatCard title="SOS Ativos" value={stats?.active_sos} icon={ShieldAlert} loading={statsLoading} color={stats?.active_sos ? "text-destructive" : "text-muted-foreground"} />
        <StatCard title="Receita Hoje" value={stats?.revenue_today ? `€${stats.revenue_today}` : "€0"} icon={TrendingUp} loading={statsLoading} color="text-green-500" />
        <StatCard title="Ocupação" value={stats?.occupancy_rate ? `${stats.occupancy_rate}%` : "0%"} icon={TrendingUp} loading={statsLoading} />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[600px]">
        
        {/* Left Col: Today's Reservations */}
        <Card className="lg:col-span-2 flex flex-col border-border/50 shadow-md h-full">
          <CardHeader className="pb-3 border-b border-border/50 shrink-0">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              Atividade de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {activityLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : activities?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Sem atividade registada hoje.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {activities?.map(activity => (
                  <div 
                    key={activity.id} 
                    className="p-4 hover:bg-secondary/50 transition-colors flex items-center justify-between cursor-pointer group"
                    onClick={() => setSelectedResId(activity.id)}
                  >
                    <div>
                      <div className="font-semibold group-hover:text-primary transition-colors">{activity.cliente_nome}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{activity.veiculo}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{activity.hora}</div>
                      <StatusBadge status={activity.status_reserva} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Col: SOS Zone */}
        <Card className={cn(
          "flex flex-col border-border/50 shadow-md transition-all duration-300 h-full overflow-hidden",
          (sosAlerts && sosAlerts.length > 0) ? "animate-flash-red border-destructive/50" : ""
        )}>
          <CardHeader className="pb-3 border-b border-border/50 shrink-0">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BellRing className={cn("h-5 w-5", (sosAlerts && sosAlerts.length > 0) ? "text-destructive animate-bounce" : "text-muted-foreground")} />
              Alerta SOS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto">
            {sosLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (sosAlerts && sosAlerts.length > 0) ? (
              <div className="space-y-4">
                {sosAlerts.map(alert => (
                  <div key={alert.id} className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="destructive" className="animate-pulse">URGENTE</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleTimeString()}</span>
                    </div>
                    
                    <div>
                      <div className="font-semibold text-lg">{alert.reservation?.cliente_nome}</div>
                      <div className="text-sm opacity-80">{alert.reservation?.vehicle?.marca_modelo}</div>
                    </div>

                    {alert.foto_problema_url && (
                      <div className="h-32 w-full rounded-md bg-secondary overflow-hidden border border-border/50">
                        <img src={alert.foto_problema_url} alt="Problema" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="pt-2 flex flex-col gap-2">
                      <a 
                        href={`https://maps.google.com/?q=${alert.localizacao_latitude},${alert.localizacao_longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full"
                      >
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-none">
                          <Navigation className="mr-2 h-4 w-4" />
                          Abrir no Google Maps
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
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-green-500/80">
                <CheckCircle2 className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="font-semibold text-lg">Sistema Normal</h3>
                <p className="text-sm opacity-80">Nenhum alerta SOS ativo na frota.</p>
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
      />
    </div>
  );
}

function ReservationModal({ id, onClose, statusToUpdate, setStatusToUpdate }: any) {
  const queryClient = useQueryClient();
  const { data: res, isLoading } = useGetReservation(id, { 
    query: { enabled: !!id, queryKey: getGetReservationQueryKey(id) } 
  });
  const simulatePayment = useSimulatePayment();
  const updateReservation = useUpdateReservation();

  if (!id) return null;

  const handleSimulatePayment = () => {
    simulatePayment.mutate({ id }, {
      onSuccess: () => {
        toast.success("Pagamento processado com sucesso!");
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTodayActivityQueryKey() });
      }
    });
  };

  const handleUpdateStatus = () => {
    if (!statusToUpdate) return;
    updateReservation.mutate({ 
      id, 
      data: { status_reserva: statusToUpdate as any } 
    }, {
      onSuccess: () => {
        toast.success("Estado atualizado com sucesso!");
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTodayActivityQueryKey() });
        onClose();
      }
    });
  };

  const docs = res?.docs_checkin_url as Record<string, string> | undefined;
  const fotos = res?.fotos_estado_carro as Record<string, string> | undefined;

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl">Detalhes da Reserva #{id}</DialogTitle>
          <DialogDescription>
            {res?.cliente_nome} • {res?.vehicle?.marca_modelo}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex justify-center"><Skeleton className="h-48 w-full" /></div>
        ) : res ? (
          <div className="grid grid-cols-2 gap-6 mt-4">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Detalhes Financeiros</h4>
                <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Total</span>
                    <span className="font-medium">€{res.valor_total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Estado Pagamento</span>
                    <Badge variant={res.status_pagamento === 'pago_sinal' ? 'default' : 'secondary'}>{res.status_pagamento}</Badge>
                  </div>
                  {res.status_pagamento !== 'pago_sinal' && (
                    <Button onClick={handleSimulatePayment} className="w-full mt-2" variant="outline">
                      <CreditCard className="mr-2 h-4 w-4" /> Simular Pagamento
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Atualizar Estado</h4>
                <div className="flex gap-2">
                  <Select value={statusToUpdate} onValueChange={setStatusToUpdate}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o estado..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="criada">Sinal Pendente</SelectItem>
                      <SelectItem value="checkin_feito">Docs Enviados</SelectItem>
                      <SelectItem value="carro_na_estrada">Na Estrada</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleUpdateStatus} disabled={!statusToUpdate || statusToUpdate === res.status_reserva}>
                    Atualizar
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4"/> Documentos Check-in
                </h4>
                {docs && Object.keys(docs).length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(docs).map(([key, url]) => (
                      <div key={key} className="relative group rounded-md overflow-hidden bg-secondary aspect-video">
                        <img src={url} alt={key} className="object-cover w-full h-full opacity-80" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 text-xs p-1 text-center truncate text-white">
                          {key}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">Sem documentos.</div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Camera className="h-4 w-4"/> Fotos do Veículo
                </h4>
                {fotos && Object.keys(fotos).length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(fotos).map(([key, url]) => (
                      <div key={key} className="relative group rounded-md overflow-hidden bg-secondary aspect-video">
                        <img src={url} alt={key} className="object-cover w-full h-full opacity-80" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 text-xs p-1 text-center truncate text-white">
                          {key}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">Sem fotos do veículo.</div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ title, value, icon: Icon, loading, color }: any) {
  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
      <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
        <Icon className={cn("h-6 w-6 mb-2 opacity-70", color)} />
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value !== undefined ? value : '--'}</div>
        )}
        <div className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">{title}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getProps = () => {
    switch(status) {
      case 'criada': return { className: 'bg-amber-500/20 text-amber-500 border-amber-500/30', label: 'Sinal Pendente' };
      case 'checkin_feito': return { className: 'bg-blue-500/20 text-blue-500 border-blue-500/30', label: 'Docs Enviados' };
      case 'carro_na_estrada': return { className: 'bg-green-500/20 text-green-500 border-green-500/30', label: 'Na Estrada' };
      case 'devolucao_atraso': return { className: 'bg-destructive/20 text-destructive border-destructive/30 text-pulse-red', label: 'Atraso' };
      case 'concluida': return { className: 'bg-muted text-muted-foreground border-border', label: 'Concluída' };
      default: return { className: 'bg-secondary text-foreground', label: status };
    }
  }
  
  const props = getProps();
  return <Badge variant="outline" className={cn("mt-1", props.className)}>{props.label}</Badge>;
}
