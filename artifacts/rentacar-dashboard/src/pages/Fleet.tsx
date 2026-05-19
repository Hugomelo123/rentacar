import React, { useState } from "react";
import { 
  useListFleet,
  useCreateVehicle,
  useDeleteVehicle,
  useToggleVehicleStatus,
  useGetFleetSummary,
  useGetVehicleDamageHistory,
  getListFleetQueryKey,
  getGetFleetSummaryQueryKey,
  getGetVehicleDamageHistoryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Car, Wrench, Ban, CheckCircle2, History, Trash2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Fleet() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDamageId, setSelectedDamageId] = useState<number | null>(null);
  
  const { data: summary, isLoading: summaryLoading } = useGetFleetSummary();
  const { data: fleet, isLoading: fleetLoading } = useListFleet();
  
  const toggleStatus = useToggleVehicleStatus();
  const deleteVehicle = useDeleteVehicle();

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'manutencao' ? 'disponivel' : 'manutencao';
    toggleStatus.mutate({ id, data: { status: newStatus as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFleetQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFleetSummaryQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem a certeza que deseja eliminar este veículo?")) {
      deleteVehicle.mutate({ id }, {
        onSuccess: () => {
          toast.success("Veículo eliminado.");
          queryClient.invalidateQueries({ queryKey: getListFleetQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetFleetSummaryQueryKey() });
        }
      });
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Frota</h1>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Veículo
        </Button>
      </div>

      {/* Summary Bar */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        <SummaryChip label="Disponível" value={summary?.disponivel} color="bg-green-500/20 text-green-500 border-green-500/30" loading={summaryLoading} />
        <SummaryChip label="Alugado" value={summary?.alugado} color="bg-blue-500/20 text-blue-500 border-blue-500/30" loading={summaryLoading} />
        <SummaryChip label="Manutenção" value={summary?.manutencao} color="bg-orange-500/20 text-orange-500 border-orange-500/30" loading={summaryLoading} />
        <SummaryChip label="Reservado" value={summary?.reservado_temporario} color="bg-yellow-500/20 text-yellow-500 border-yellow-500/30" loading={summaryLoading} />
        <SummaryChip label="Total" value={summary?.total} color="bg-secondary text-foreground" loading={summaryLoading} />
      </div>

      {/* Grid */}
      {fleetLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[350px] w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {fleet?.map((vehicle) => (
            <Card key={vehicle.id} className="overflow-hidden flex flex-col bg-card border-border/50">
              <div className="h-48 bg-secondary relative">
                {vehicle.foto_url ? (
                  <img src={vehicle.foto_url} alt={vehicle.marca_modelo} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Car className="h-16 w-16 opacity-20" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge className="bg-black/80 backdrop-blur-sm">{vehicle.categoria}</Badge>
                </div>
                <div className="absolute bottom-2 left-2">
                  <StatusBadge status={vehicle.status} />
                </div>
              </div>
              
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-xl">{vehicle.marca_modelo}</CardTitle>
                <div className="text-lg font-semibold text-primary mt-1">€{vehicle.preco_base_dia}<span className="text-sm font-normal text-muted-foreground">/dia</span></div>
              </CardHeader>
              
              <CardContent className="p-4 flex-1">
                <div className="flex items-center justify-between mt-4 bg-secondary/50 rounded-lg p-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Oficina</span>
                    <span className="text-sm font-medium">{vehicle.status === 'manutencao' ? 'Em Manutenção' : 'Disponível'}</span>
                  </div>
                  <Switch 
                    checked={vehicle.status === 'manutencao'}
                    onCheckedChange={() => handleToggleStatus(vehicle.id, vehicle.status)}
                    disabled={vehicle.status === 'alugado' || vehicle.status === 'reservado_temporario'}
                  />
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-0 gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedDamageId(vehicle.id)}>
                  <History className="mr-2 h-4 w-4" /> Danos
                </Button>
                <Button variant="destructive" size="icon" onClick={() => handleDelete(vehicle.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AddVehicleModal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <DamageHistoryModal vehicleId={selectedDamageId} onClose={() => setSelectedDamageId(null)} />
    </div>
  );
}

function SummaryChip({ label, value, color, loading }: any) {
  return (
    <div className={cn("px-4 py-2 rounded-full border flex items-center gap-2 whitespace-nowrap", color)}>
      <span className="font-semibold text-sm uppercase tracking-wider">{label}</span>
      {loading ? <Skeleton className="h-5 w-8 rounded-full" /> : <span className="font-bold text-lg leading-none">{value !== undefined ? value : 0}</span>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getProps = () => {
    switch(status) {
      case 'disponivel': return { className: 'bg-green-500/80 text-white backdrop-blur-sm border-none', label: 'Disponível', icon: CheckCircle2 };
      case 'alugado': return { className: 'bg-blue-500/80 text-white backdrop-blur-sm border-none', label: 'Alugado', icon: Car };
      case 'manutencao': return { className: 'bg-orange-500/80 text-white backdrop-blur-sm border-none', label: 'Manutenção', icon: Wrench };
      case 'reservado_temporario': return { className: 'bg-yellow-500/80 text-white backdrop-blur-sm border-none', label: 'Reservado', icon: Ban };
      default: return { className: 'bg-secondary text-foreground', label: status, icon: Car };
    }
  }
  const props = getProps();
  const Icon = props.icon;
  return (
    <Badge variant="outline" className={cn("flex items-center gap-1", props.className)}>
      <Icon className="h-3 w-3" /> {props.label}
    </Badge>
  );
}

function AddVehicleModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const queryClient = useQueryClient();
  const createVehicle = useCreateVehicle();
  const [formData, setFormData] = useState({
    marca_modelo: "",
    categoria: "Economico",
    foto_url: "",
    preco_base_dia: 0,
    valor_caucao: 0,
    extra_franquia_zero: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createVehicle.mutate({ data: formData as any }, {
      onSuccess: () => {
        toast.success("Veículo adicionado com sucesso!");
        queryClient.invalidateQueries({ queryKey: getListFleetQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFleetSummaryQueryKey() });
        onClose();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Veículo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="marca">Marca e Modelo</Label>
            <Input id="marca" value={formData.marca_modelo} onChange={e => setFormData({...formData, marca_modelo: e.target.value})} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Select value={formData.categoria} onValueChange={(val) => setFormData({...formData, categoria: val})}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Economico">Económico</SelectItem>
                <SelectItem value="Familiar">Familiar</SelectItem>
                <SelectItem value="SUV">SUV</SelectItem>
                <SelectItem value="Premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="preco">Preço / Dia (€)</Label>
              <Input id="preco" type="number" value={formData.preco_base_dia || ""} onChange={e => setFormData({...formData, preco_base_dia: Number(e.target.value)})} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="caucao">Caução (€)</Label>
              <Input id="caucao" type="number" value={formData.valor_caucao || ""} onChange={e => setFormData({...formData, valor_caucao: Number(e.target.value)})} required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="franquia">Extra Franquia Zero (€)</Label>
            <Input id="franquia" type="number" value={formData.extra_franquia_zero || ""} onChange={e => setFormData({...formData, extra_franquia_zero: Number(e.target.value)})} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="foto">URL da Foto</Label>
            <Input id="foto" type="url" value={formData.foto_url} onChange={e => setFormData({...formData, foto_url: e.target.value})} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={createVehicle.isPending}>
              {createVehicle.isPending ? "A Guardar..." : "Adicionar Veículo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DamageHistoryModal({ vehicleId, onClose }: { vehicleId: number | null, onClose: () => void }) {
  const { data: history, isLoading } = useGetVehicleDamageHistory(vehicleId as number, { query: { enabled: !!vehicleId, queryKey: getGetVehicleDamageHistoryQueryKey(vehicleId as number) } });

  return (
    <Dialog open={!!vehicleId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Histórico de Danos</DialogTitle>
          <DialogDescription>
            Registo de fotos de devolução para análise.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : history && history.length > 0 ? (
            history.map((entry, idx) => (
              <div key={idx} className="border border-border rounded-lg p-4 bg-secondary/30">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold">{entry.cliente_nome}</span>
                  <span className="text-sm text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {entry.fotos && Array.isArray(entry.fotos) && entry.fotos.map((foto: string, fidx: number) => (
                    <div key={fidx} className="aspect-square bg-secondary rounded overflow-hidden">
                      <img src={foto} alt="Dano" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum registo de danos encontrado.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
