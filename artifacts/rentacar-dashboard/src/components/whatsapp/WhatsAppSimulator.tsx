import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  useListFleet,
  useCreateReservation,
  useUploadDocs,
  useUploadCarPhotos,
  useCreateSosAlert,
  useUpdateReservation,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Phone, MoreVertical, Paperclip, Camera, Car, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type MessageType =
  | "text"
  | "options"
  | "fleet"
  | "quote"
  | "payment"
  | "docs"
  | "photos"
  | "sos_confirm"
  | "done";

type Message = {
  id: string;
  sender: "bot" | "user";
  text: string;
  type?: MessageType;
  options?: string[];
  vehicles?: any[];
  quoteData?: QuoteData;
};

type QuoteData = {
  vehicle: any;
  days: number;
  pickupDate: string;
  returnDate: string;
  baseTotal: number;
  protectionLabel: string;
  protectionTotal: number;
  grandTotal: number;
  sinal: number;
};

type Step =
  | "GREETING"
  | "ASK_PICKUP"
  | "ASK_RETURN"
  | "ASK_GROUP"
  | "SHOW_FLEET"
  | "ASK_PROTECTION"
  | "SHOW_QUOTE"
  | "PAYMENT"
  | "DOCS"
  | "PHOTOS"
  | "ACTIVE"
  | "SOS_CONFIRM"
  | "DONE";

const QUICK_DATES = [
  { label: "Hoje", days: 0 },
  { label: "Amanhã", days: 1 },
  { label: "Próxima semana", days: 7 },
];

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmt(d: Date) {
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function parseDateInput(text: string, base: Date): Date | null {
  const lower = text.toLowerCase();
  if (lower === "hoje") return new Date(base);
  if (lower === "amanhã" || lower === "amanha") return addDays(base, 1);
  if (lower.includes("semana")) return addDays(base, 7);
  const parts = text.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
  if (parts) {
    const year = parts[3] ? parseInt(parts[3]) : base.getFullYear();
    const d = new Date(year < 100 ? year + 2000 : year, parseInt(parts[2]) - 1, parseInt(parts[1]));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export function WhatsAppSimulator({ hideHeader }: { hideHeader?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState<Step>("GREETING");
  const scrollRef = useRef<HTMLDivElement>(null);
  const botTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [clienteName, setClienteName] = useState("");
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [protection, setProtection] = useState<"franquia_zero" | "standard_com_caucao">("standard_com_caucao");
  const [reservationId, setReservationId] = useState<number | null>(null);

  const listFleet = useListFleet({ status: "disponivel" });
  const createReservation = useCreateReservation();
  const uploadDocs = useUploadDocs();
  const uploadPhotos = useUploadCarPhotos();
  const createSos = useCreateSosAlert();
  const updateReservation = useUpdateReservation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const clearTimers = () => {
    botTimers.current.forEach(clearTimeout);
    botTimers.current = [];
  };

  const botSay = useCallback(
    (msg: Omit<Message, "id" | "sender">, delayMs = 1000) => {
      setIsTyping(true);
      const t = setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { ...msg, id: `${Date.now()}-${Math.random()}`, sender: "bot" },
        ]);
      }, delayMs);
      botTimers.current.push(t);
    },
    []
  );

  const userSay = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, sender: "user", text, type: "text" },
    ]);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      botSay(
        {
          text: "Olá! 👋 Bem-vindo à *RentaCar Madeira*.\nSou o vosso assistente digital.\n\nQual é o seu nome, por favor?",
          type: "text",
        },
        800
      );
    }, 300);
    return () => {
      clearTimeout(t);
      clearTimers();
    };
  }, []);

  const askPickup = useCallback(
    (name: string) => {
      botSay(
        {
          text: `Olá, *${name}*! 😊\n\nPara quando precisa do carro?\n_(Escolha uma opção ou escreva a data)_`,
          type: "options",
          options: QUICK_DATES.map((d) => d.label),
        },
        1200
      );
    },
    [botSay]
  );

  const askReturn = useCallback(
    (pickup: Date) => {
      botSay(
        {
          text: `Levantamento: *${fmt(pickup)}* ✅\n\nAté quando precisa do carro?\n_(Mínimo 1 dia após levantamento)_`,
          type: "options",
          options: [
            `${fmt(addDays(pickup, 3))} (3 dias)`,
            `${fmt(addDays(pickup, 7))} (7 dias)`,
            `${fmt(addDays(pickup, 14))} (14 dias)`,
          ],
        },
        1200
      );
    },
    [botSay]
  );

  const askGroup = useCallback(
    (ret: Date, pickup: Date) => {
      const days = Math.max(1, Math.round((ret.getTime() - pickup.getTime()) / 86400000));
      botSay(
        {
          text: `Devolução: *${fmt(ret)}* ✅  →  *${days} dia${days > 1 ? "s" : ""}* de aluguer.\n\nQuantas pessoas viajam e quanta bagagem têm?`,
          type: "options",
          options: [
            "1 pessoa — 1 mala pequena",
            "2 pessoas — 2 malas médias",
            "3-4 pessoas — 3-4 malas",
            "5+ pessoas / muita bagagem",
          ],
        },
        1300
      );
    },
    [botSay]
  );

  const showFleet = useCallback(
    (days: number) => {
      botSay({ text: "A carregar frota disponível...", type: "text" }, 1000);
      const t = setTimeout(() => {
        setIsTyping(false);
        const vehicles = listFleet.data || [];
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-fleet`,
            sender: "bot",
            text: `Temos *${vehicles.length} veículos disponíveis* para ${days} dia${days > 1 ? "s" : ""}. Escolha o que mais gosta:`,
            type: "fleet",
            vehicles,
          },
        ]);
      }, 2000);
      botTimers.current.push(t);
    },
    [botSay, listFleet.data]
  );

  const askProtection = useCallback(
    (vehicle: any) => {
      botSay(
        {
          text: `*${vehicle.marca_modelo}* selecionado! 🚗\n\nComo prefere proteger a sua viagem?`,
          type: "options",
          options: [
            `🛡️ Franquia ZERO — +€${vehicle.extra_franquia_zero || 15}/dia (sem caução, sem stress)`,
            `💳 Standard — Caução de €${vehicle.valor_caucao || 1200} bloqueada no cartão`,
          ],
        },
        1300
      );
    },
    [botSay]
  );

  const buildQuote = useCallback(
    (vehicle: any, prot: "franquia_zero" | "standard_com_caucao", pickup: Date, ret: Date): QuoteData => {
      const days = Math.max(1, Math.round((ret.getTime() - pickup.getTime()) / 86400000));
      const baseTotal = vehicle.preco_base_dia * days;
      const protPerDay = prot === "franquia_zero" ? (vehicle.extra_franquia_zero || 15) : 0;
      const protectionTotal = protPerDay * days;
      const grandTotal = baseTotal + protectionTotal;
      const sinal = 50;
      return {
        vehicle,
        days,
        pickupDate: fmt(pickup),
        returnDate: fmt(ret),
        baseTotal,
        protectionLabel: prot === "franquia_zero" ? "Franquia ZERO" : "Standard (com caução)",
        protectionTotal,
        grandTotal,
        sinal,
      };
    },
    []
  );

  const showQuote = useCallback(
    (quote: QuoteData) => {
      botSay(
        {
          text: "Aqui está o seu orçamento:",
          type: "quote",
          quoteData: quote,
        },
        1400
      );
    },
    [botSay]
  );

  const processTextInput = useCallback(
    (text: string) => {
      const now = new Date();
      if (step === "GREETING") {
        const name = text.trim();
        setClienteName(name);
        setStep("ASK_PICKUP");
        askPickup(name);
      } else if (step === "ASK_PICKUP") {
        const d = parseDateInput(text, now);
        if (!d) {
          botSay({ text: "Não consegui perceber a data. Tente com o formato DD/MM ou escolha uma das opções." }, 800);
          return;
        }
        setPickupDate(d);
        setStep("ASK_RETURN");
        askReturn(d);
      } else if (step === "ASK_RETURN") {
        const base = pickupDate || now;
        const d = parseDateInput(text, base);
        if (!d || d <= base) {
          botSay({ text: "A data de devolução tem de ser posterior ao levantamento. Tente novamente." }, 800);
          return;
        }
        setReturnDate(d);
        setStep("ASK_GROUP");
        askGroup(d, base);
      } else if (step === "ACTIVE") {
        botSay({ text: "Obrigado pela mensagem! A nossa equipa está disponível 24/7. Em caso de emergência use o botão *SOS PÂNICO*." }, 900);
      }
    },
    [step, pickupDate, botSay, askPickup, askReturn, askGroup]
  );

  const handleOptionClick = useCallback(
    (opt: string) => {
      userSay(opt);
      const now = new Date();

      if (step === "ASK_PICKUP") {
        const match = QUICK_DATES.find((d) => d.label === opt);
        const d = match ? addDays(now, match.days) : parseDateInput(opt, now);
        if (!d) return;
        setPickupDate(d);
        setStep("ASK_RETURN");
        askReturn(d);
      } else if (step === "ASK_RETURN") {
        const base = pickupDate || now;
        const dateMatch = opt.match(/(\d{2}\/\d{2}\/\d{4})/);
        const d = dateMatch ? parseDateInput(dateMatch[1], base) : null;
        if (!d) return;
        setReturnDate(d);
        setStep("ASK_GROUP");
        askGroup(d, base);
      } else if (step === "ASK_GROUP") {
        const pickup = pickupDate || now;
        const ret = returnDate || addDays(now, 3);
        const days = Math.max(1, Math.round((ret.getTime() - pickup.getTime()) / 86400000));
        setStep("SHOW_FLEET");
        showFleet(days);
      } else if (step === "ASK_PROTECTION") {
        const prot: "franquia_zero" | "standard_com_caucao" = opt.includes("ZERO")
          ? "franquia_zero"
          : "standard_com_caucao";
        setProtection(prot);
        const pickup = pickupDate || now;
        const ret = returnDate || addDays(now, 3);
        const quote = buildQuote(selectedVehicle, prot, pickup, ret);
        setStep("SHOW_QUOTE");
        showQuote(quote);
      } else if (step === "SHOW_QUOTE") {
        if (opt.includes("Aceitar")) {
          setStep("PAYMENT");
          botSay(
            {
              text: "Ótimo! Para confirmar a sua reserva precisamos de um *sinal de €50* (descontado no valor final).\n\nPague com segurança clicando abaixo:",
              type: "payment",
            },
            1000
          );
        } else if (opt.includes("Alterar")) {
          setStep("ASK_PROTECTION");
          askProtection(selectedVehicle);
        }
      } else if (step === "SOS_CONFIRM") {
        if (opt.includes("Confirmar") && reservationId) {
          createSos.mutate(
            {
              data: {
                reserva_id: reservationId,
                localizacao_latitude: 32.6669,
                localizacao_longitude: -16.9241,
                foto_problema_url: "https://via.placeholder.com/400x300?text=Avaria+Reportada",
              },
            },
            {
              onSuccess: () => {
                botSay(
                  {
                    text: "🚨 *ALERTA ENVIADO!*\nA nossa equipa de apoio foi notificada e está a caminho. Mantenha-se em segurança.\n\nTempo estimado de resposta: 20-30 minutos.",
                  },
                  800
                );
                setStep("DONE");
              },
            }
          );
        }
      }
    },
    [step, pickupDate, returnDate, selectedVehicle, reservationId, askReturn, askGroup, showFleet, buildQuote, showQuote, askProtection, botSay, createSos]
  );

  const handleSelectVehicle = useCallback(
    (v: any) => {
      userSay(`Quero o *${v.marca_modelo}*`);
      setSelectedVehicle(v);
      setStep("ASK_PROTECTION");
      askProtection(v);
    },
    [askProtection]
  );

  const handlePayment = useCallback(() => {
    userSay("✅ Confirmar Pagamento de €50");
    botSay({ text: "A processar pagamento..." }, 600);

    const pickup = pickupDate || new Date();
    const ret = returnDate || addDays(new Date(), 3);

    createReservation.mutate(
      {
        data: {
          cliente_nome: clienteName || "Cliente",
          veiculo_id: selectedVehicle?.id || 1,
          tipo_protecao: protection,
          data_levantamento: pickup.toISOString(),
          data_devolucao: ret.toISOString(),
          cliente_telefone: "+351912345678",
        },
      },
      {
        onSuccess: (res) => {
          const id = res.reservation?.id;
          setReservationId(id || null);
          setStep("DOCS");
          botSay(
            {
              text: `✅ *Pagamento confirmado!*\n\n🎉 Reserva *#${id}* criada com sucesso!\n\nAgora precisamos dos seus documentos para pré-check-in. Envie:\n• 📄 Foto do Passaporte\n• 🚗 Foto da Carta de Condução`,
              type: "docs",
            },
            1500
          );
        },
        onError: () => {
          botSay({ text: "Erro ao processar o pagamento. Tente novamente." }, 800);
        },
      }
    );
  }, [pickupDate, returnDate, clienteName, selectedVehicle, protection, botSay, createReservation]);

  const handleUploadDocs = useCallback(() => {
    userSay("📎 Documentos enviados");
    if (reservationId) {
      uploadDocs.mutate(
        {
          id: reservationId,
          data: { docs: { passaporte: "https://via.placeholder.com/300x200?text=Passaporte", carta_conducao: "https://via.placeholder.com/300x200?text=Carta+Conducao" } },
        },
        {
          onSuccess: () => {
            updateReservation.mutate({ id: reservationId, data: { status_reserva: "checkin_feito" } });
            setStep("PHOTOS");
            botSay(
              {
                text: `✅ *Documentos recebidos e verificados!*\n\nCheck-in antecipado concluído.\n\n📸 *Importante:* No dia do levantamento, tire 4 fotos do veículo *antes de arrancar* (frente, traseira, lado esquerdo e direito) e envie aqui para registo de estado.`,
                type: "photos",
              },
              1400
            );
          },
        }
      );
    }
  }, [reservationId, uploadDocs, updateReservation, botSay]);

  const handleUploadPhotos = useCallback(() => {
    userSay("📷 Fotos do veículo enviadas");
    if (reservationId) {
      uploadPhotos.mutate(
        {
          id: reservationId,
          data: {
            fotos: {
              frente: "https://via.placeholder.com/400x300?text=Frente",
              traseira: "https://via.placeholder.com/400x300?text=Traseira",
              esquerda: "https://via.placeholder.com/400x300?text=Esquerda",
              direita: "https://via.placeholder.com/400x300?text=Direita",
            },
          },
        },
        {
          onSuccess: () => {
            updateReservation.mutate({ id: reservationId, data: { status_reserva: "carro_na_estrada" } });
            setStep("ACTIVE");
            botSay(
              {
                text: `✅ *Fotos registadas!* Estado do veículo documentado.\n\n🚗 *Boa viagem!* Está tudo em ordem.\n\nLembre-se:\n• Devolução: ${returnDate ? fmt(returnDate) : "—"}\n• Em caso de acidente ou avaria, use o botão *SOS PÂNICO*\n• Estamos disponíveis 24/7`,
              },
              1600
            );
          },
        }
      );
    }
  }, [reservationId, uploadPhotos, updateReservation, botSay, returnDate]);

  const handleSos = useCallback(() => {
    if (step === "ACTIVE" || step === "DONE") {
      userSay("🆘 SOS PÂNICO");
      setStep("SOS_CONFIRM");
      botSay(
        {
          text: "🚨 *ALERTA SOS RECEBIDO!*\n\nCalma, estamos aqui para ajudar!\n\nVamos enviar a sua localização GPS para a nossa equipa. Confirme para ativar o alerta:",
          type: "options",
          options: ["✅ Confirmar SOS + Enviar Localização GPS", "❌ Cancelar (foi engano)"],
        },
        700
      );
    } else {
      userSay("SOS PÂNICO");
      botSay({ text: "O SOS estará disponível quando o carro estiver na estrada. Complete primeiro o processo de reserva." }, 800);
    }
  }, [step, botSay]);

  const handleVooAtrasou = useCallback(() => {
    userSay("✈️ Voo Atrasou");
    botSay(
      {
        text: "Sem problema! Acontece muitas vezes.\n\nÀ que horas estima chegar ao aeroporto agora?",
        type: "options",
        options: ["1-2 horas de atraso", "3-4 horas de atraso", "Mais de 4 horas de atraso"],
      },
      900
    );
  }, [botSay]);

  const handleSegundoCondutor = useCallback(() => {
    userSay("👤 2º Condutor");
    botSay(
      {
        text: "Adicionar um segundo condutor é simples!\n\n*Custo:* Gratuito (incluído no seguro)\n\nPrecisamos apenas:\n• Nome completo do 2º condutor\n• Número da carta de condução\n• Validade da carta\n\nEnvie os dados em texto ou foto da carta.",
      },
      1000
    );
  }, [botSay]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    userSay(text);
    processTextInput(text);
  };

  const handleReset = () => {
    clearTimers();
    setMessages([]);
    setStep("GREETING");
    setClienteName("");
    setPickupDate(null);
    setReturnDate(null);
    setSelectedVehicle(null);
    setProtection("standard_com_caucao");
    setReservationId(null);
    setIsTyping(false);
    setTimeout(() => {
      botSay(
        {
          text: "Olá! 👋 Bem-vindo à *RentaCar Madeira*.\nSou o vosso assistente digital.\n\nQual é o seu nome, por favor?",
          type: "text",
        },
        800
      );
    }, 300);
  };

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] text-black">
      {/* Header */}
      {!hideHeader && (
        <div className="bg-[#075E54] text-white p-3 flex items-center shadow-md z-10 shrink-0">
          <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center mr-3 shrink-0">
            <Car className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base leading-tight">RentaCar Bot</h3>
            <p className="text-xs text-white/80">em linha</p>
          </div>
          <div className="flex items-center gap-3 text-white">
            <Phone className="h-5 w-5" />
            <button onClick={handleReset} title="Reiniciar conversa" className="hover:opacity-70 transition-opacity">
              <RefreshCw className="h-4 w-4" />
            </button>
            <MoreVertical className="h-5 w-5" />
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
        style={{
          background: "repeating-linear-gradient(45deg,#e2d9c8,#e2d9c8 10px,#ddd5c3 10px,#ddd5c3 20px)",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col",
              msg.sender === "user" ? "items-end" : "items-start"
            )}
          >
            <div
              className={cn(
                "max-w-[88%] px-3 py-2 rounded-lg shadow-sm text-sm leading-relaxed",
                msg.sender === "user"
                  ? "bg-[#dcf8c6] rounded-tr-none text-black"
                  : "bg-white rounded-tl-none text-black"
              )}
            >
              <WhatsAppText text={msg.text} />

              {/* Options */}
              {msg.type === "options" && msg.options && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {msg.options.map((opt) => (
                    <Button
                      key={opt}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs justify-start border-[#25D366]/60 text-[#075E54] hover:bg-[#dcf8c6] h-auto py-2 whitespace-normal text-left"
                      onClick={() => handleOptionClick(opt)}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              )}

              {/* Fleet Cards */}
              {msg.type === "fleet" && msg.vehicles && (
                <div className="mt-2 flex overflow-x-auto gap-2 pb-1" style={{ maxWidth: "280px" }}>
                  {(msg.vehicles || []).map((v: any) => (
                    <div
                      key={v.id}
                      className="min-w-[130px] border border-gray-200 rounded-lg p-2 bg-gray-50 flex flex-col items-center shrink-0"
                    >
                      {v.foto_url ? (
                        <img
                          src={v.foto_url}
                          alt={v.marca_modelo}
                          className="h-16 w-full object-cover rounded mb-1"
                        />
                      ) : (
                        <div className="h-16 w-full bg-gray-200 rounded mb-1 flex items-center justify-center">
                          <Car className="h-7 w-7 text-gray-400" />
                        </div>
                      )}
                      <span className="text-[11px] font-bold truncate w-full text-center leading-tight">{v.marca_modelo}</span>
                      <span className="text-[11px] text-[#128C7E] font-semibold mt-0.5">€{v.preco_base_dia}/dia</span>
                      <span className="text-[10px] text-gray-400">{v.categoria}</span>
                      <Button
                        size="sm"
                        className="w-full h-7 mt-2 text-[11px] bg-[#25D366] hover:bg-[#128C7E] text-white border-none"
                        onClick={() => handleSelectVehicle(v)}
                      >
                        Escolher
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Quote */}
              {msg.type === "quote" && msg.quoteData && (
                <QuoteCard quote={msg.quoteData} onAccept={() => handleOptionClick("✅ Aceitar Orçamento")} onAlter={() => handleOptionClick("🔄 Alterar Proteção")} />
              )}

              {/* Payment */}
              {msg.type === "payment" && (
                <Button
                  className="mt-3 w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold"
                  onClick={handlePayment}
                  disabled={createReservation.isPending}
                >
                  {createReservation.isPending ? "A processar..." : "💳 Pagar Sinal de €50"}
                </Button>
              )}

              {/* Docs */}
              {msg.type === "docs" && (
                <Button
                  className="mt-3 w-full bg-[#25D366] hover:bg-[#128C7E] text-white"
                  onClick={handleUploadDocs}
                  disabled={uploadDocs.isPending}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  {uploadDocs.isPending ? "A enviar..." : "Enviar Documentos"}
                </Button>
              )}

              {/* Photos */}
              {msg.type === "photos" && (
                <Button
                  className="mt-3 w-full bg-[#25D366] hover:bg-[#128C7E] text-white"
                  onClick={handleUploadPhotos}
                  disabled={uploadPhotos.isPending}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {uploadPhotos.isPending ? "A enviar..." : "Enviar 4 Fotos do Carro"}
                </Button>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="bg-white px-4 py-3 rounded-lg rounded-tl-none shadow-sm w-16 flex justify-center items-center gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>

      {/* Quick Action Chips */}
      <div className="px-2 py-1.5 bg-gray-50 border-t border-gray-200 flex gap-1.5 overflow-x-auto shrink-0">
        <button
          onClick={handleVooAtrasou}
          className="whitespace-nowrap text-[11px] font-medium px-3 py-1 rounded-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
        >
          ✈️ Voo Atrasou
        </button>
        <button
          onClick={handleSegundoCondutor}
          className="whitespace-nowrap text-[11px] font-medium px-3 py-1 rounded-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
        >
          👤 2º Condutor
        </button>
        <button
          onClick={handleSos}
          className="whitespace-nowrap text-[11px] font-medium px-3 py-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shrink-0"
        >
          🆘 SOS PÂNICO
        </button>
        <button
          onClick={handleReset}
          className="whitespace-nowrap text-[11px] font-medium px-3 py-1 rounded-full bg-white border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors shrink-0 ml-auto"
        >
          ↺ Reiniciar
        </button>
      </div>

      {/* Input */}
      <div className="bg-[#f0f0f0] p-2 flex items-center gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Mensagem..."
          className="rounded-full bg-white border-none focus-visible:ring-0 text-black h-10 text-sm"
        />
        <Button
          size="icon"
          className="rounded-full h-10 w-10 shrink-0 bg-[#075E54] hover:bg-[#128C7E]"
          onClick={handleSend}
        >
          <Send className="h-4 w-4 text-white ml-0.5" />
        </Button>
      </div>
    </div>
  );
}

function WhatsAppText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith("*") && part.endsWith("*") ? (
          <strong key={i}>{part.slice(1, -1)}</strong>
        ) : (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>
        )
      )}
    </span>
  );
}

function QuoteCard({ quote, onAccept, onAlter }: { quote: QuoteData; onAccept: () => void; onAlter: () => void }) {
  return (
    <div className="mt-2 rounded-lg border border-gray-200 overflow-hidden text-xs">
      <div className="bg-[#075E54] text-white px-3 py-2 font-bold text-sm">
        🧾 Orçamento de Aluguer
      </div>
      <div className="bg-white divide-y divide-gray-100">
        <Row label="🚗 Veículo" value={quote.vehicle.marca_modelo} />
        <Row label="📅 Levantamento" value={quote.pickupDate} />
        <Row label="📅 Devolução" value={quote.returnDate} />
        <Row label="📆 Duração" value={`${quote.days} dia${quote.days > 1 ? "s" : ""}`} />
        <Row label={`💰 Preço base (€${quote.vehicle.preco_base_dia}/dia)`} value={`€${quote.baseTotal}`} />
        {quote.protectionTotal > 0 && (
          <Row label={`🛡️ ${quote.protectionLabel}`} value={`€${quote.protectionTotal}`} />
        )}
        {quote.protectionTotal === 0 && (
          <Row label={`💳 ${quote.protectionLabel}`} value="Caução bloqueada" />
        )}
        <div className="px-3 py-2 bg-[#dcf8c6] flex justify-between items-center font-bold">
          <span className="text-sm">TOTAL</span>
          <span className="text-base text-[#075E54]">€{quote.grandTotal}</span>
        </div>
        <div className="px-3 py-2 bg-amber-50 flex justify-between items-center text-amber-800">
          <span>Sinal de confirmação</span>
          <span className="font-bold">€{quote.sinal}</span>
        </div>
      </div>
      <div className="bg-white px-2 pb-2 pt-1 flex flex-col gap-1.5">
        <Button
          size="sm"
          className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-semibold"
          onClick={onAccept}
        >
          ✅ Aceitar e Pagar Sinal de €{quote.sinal}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs border-gray-300 text-gray-600"
          onClick={onAlter}
        >
          🔄 Alterar Proteção
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1.5 flex justify-between items-center gap-2">
      <span className="text-gray-500 text-[11px]">{label}</span>
      <span className="font-medium text-[11px] text-right">{value}</span>
    </div>
  );
}
