import React, { useEffect } from "react";
import { useGetConfig, useUpdateConfig, getGetConfigQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Clock, Euro, Key } from "lucide-react";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useGetConfig();
  const updateConfig = useUpdateConfig();

  const form = useForm({
    defaultValues: {
      horario_abertura: "08:00",
      horario_fecho: "22:00",
      taxa_noturna: 0,
      idade_minima: 21,
      taxa_condutor_jovem: 0,
      stripe_secret_key: "",
      stripe_webhook_secret: ""
    }
  });

  useEffect(() => {
    if (config) {
      form.reset({
        horario_abertura: config.horario_abertura,
        horario_fecho: config.horario_fecho,
        taxa_noturna: config.taxa_noturna,
        idade_minima: config.idade_minima,
        taxa_condutor_jovem: config.taxa_condutor_jovem,
        stripe_secret_key: config.stripe_secret_key || "",
        stripe_webhook_secret: config.stripe_webhook_secret || ""
      });
    }
  }, [config, form]);

  const onSubmit = (data: any) => {
    const formattedData = {
      ...data,
      taxa_noturna: Number(data.taxa_noturna),
      idade_minima: Number(data.idade_minima),
      taxa_condutor_jovem: Number(data.taxa_condutor_jovem)
    };
    
    updateConfig.mutate({ data: formattedData }, {
      onSuccess: () => {
        toast.success("Configurações guardadas com sucesso.");
        queryClient.invalidateQueries({ queryKey: getGetConfigQueryKey() });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
          <p className="text-muted-foreground mt-1">Gira as regras de negócio e integrações.</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Horários de Operação
              </CardTitle>
              <CardDescription>Defina o horário normal de funcionamento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Horário de Abertura</Label>
                <Input type="time" {...form.register("horario_abertura")} required />
              </div>
              <div className="grid gap-2">
                <Label>Horário de Fecho</Label>
                <Input type="time" {...form.register("horario_fecho")} required />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Euro className="h-5 w-5 text-primary" />
                Taxas e Condições
              </CardTitle>
              <CardDescription>Valores extra aplicados automaticamente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Taxa Noturna (Fora de horas) (€)</Label>
                <Input type="number" step="0.01" {...form.register("taxa_noturna")} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Idade Mínima</Label>
                  <Input type="number" {...form.register("idade_minima")} required />
                </div>
                <div className="grid gap-2">
                  <Label>Taxa Jovem (€)</Label>
                  <Input type="number" step="0.01" {...form.register("taxa_condutor_jovem")} required />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-md md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="h-5 w-5 text-primary" />
                Integração Stripe (Pagamentos)
              </CardTitle>
              <CardDescription>Credenciais da API de pagamentos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Secret Key</Label>
                <Input type="password" {...form.register("stripe_secret_key")} placeholder="sk_test_..." />
              </div>
              <div className="grid gap-2">
                <Label>Webhook Secret</Label>
                <Input type="password" {...form.register("stripe_webhook_secret")} placeholder="whsec_..." />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={updateConfig.isPending}>
            <Save className="mr-2 h-5 w-5" />
            {updateConfig.isPending ? "A Guardar..." : "Guardar Configurações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
