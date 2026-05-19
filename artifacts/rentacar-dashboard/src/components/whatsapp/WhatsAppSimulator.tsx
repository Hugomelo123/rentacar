import React, { useState, useEffect, useRef } from "react";
import { 
  useListFleet, 
  useCreateReservation,
  useUploadDocs,
  useUploadCarPhotos,
  useCreateSosAlert,
  useUpdateReservation
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Phone, MoreVertical, Paperclip, Camera, Navigation, Car } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  type?: 'text' | 'options' | 'fleet' | 'payment' | 'docs' | 'photos';
  options?: string[];
  vehicles?: any[];
};

export function WhatsAppSimulator({ hideHeader }: { hideHeader?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // State for flow
  const [step, setStep] = useState('A');
  const [reservationData, setReservationData] = useState<any>({});
  const [reservationId, setReservationId] = useState<number | null>(null);

  const listFleet = useListFleet({ status: 'disponivel' });
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

  const addBotMessage = (msg: Omit<Message, 'id' | 'sender'>, delay = 1000) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { ...msg, id: Date.now().toString(), sender: 'bot' }]);
    }, delay);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text, type: 'text' }]);
  };

  // Initial Greeting
  useEffect(() => {
    addBotMessage({ text: "Olá! Bem-vindo à nossa rent-a-car. Já aterrou ou está a planear as suas férias? Diga-me só o seu nome para começarmos!" });
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    const text = input.trim();
    addUserMessage(text);
    setInput("");
    processFlow(text);
  };

  const processFlow = (text: string) => {
    if (step === 'A') {
      setReservationData({ ...reservationData, cliente_nome: text });
      setStep('B');
      addBotMessage({ 
        text: `Perfeito, ${text}! Quantas pessoas viajam e quantas malas trazem?`,
        type: 'options',
        options: ["Apenas eu (0-1 mala)", "Casal (2 malas)", "Família/Grupo (3+ malas)"]
      });
    } else if (step === 'D_DATES') {
      setReservationData({ ...reservationData, data_levantamento: '2025-06-01', data_devolucao: '2025-06-10' });
      setStep('F');
      addBotMessage({
        text: "Tudo pronto! Sinal de reserva: 50EUR.",
        type: 'payment'
      });
    }
  };

  const handleOptionClick = (opt: string) => {
    addUserMessage(opt);
    
    if (step === 'B') {
      setStep('C');
      addBotMessage({ text: "Deixe-me ver a frota disponível..." });
      
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          sender: 'bot', 
          text: "Aqui estão as opções:",
          type: 'fleet',
          vehicles: listFleet.data || []
        }]);
      }, 1500);
    } else if (step === 'D') {
      const tipo = opt === 'Franquia ZERO' ? 'franquia_zero' : 'standard_com_caucao';
      setReservationData({ ...reservationData, tipo_protecao: tipo });
      setStep('D_DATES');
      addBotMessage({ text: "Por favor indique as datas de levantamento e devolução (ex: 1 a 10 de Junho)" });
    }
  };

  const handleSelectVehicle = (v: any) => {
    addUserMessage(`Quero o ${v.marca_modelo}`);
    setReservationData({ ...reservationData, veiculo_id: v.id });
    setStep('D');
    addBotMessage({
      text: "Como deseja proteger a viagem? Opção 1: Franquia ZERO (sem caução). Opção 2: Standard (caução de 1200EUR em cartão de crédito).",
      type: 'options',
      options: ["Franquia ZERO", "Standard"]
    });
  };

  const handlePayment = () => {
    addUserMessage("Pagar Sinal");
    addBotMessage({ text: "A processar pagamento..." });
    
    createReservation.mutate({
      data: {
        cliente_nome: reservationData.cliente_nome || "Cliente",
        veiculo_id: reservationData.veiculo_id || 1,
        tipo_protecao: reservationData.tipo_protecao || "franquia_zero",
        data_levantamento: new Date().toISOString(),
        data_devolucao: new Date(Date.now() + 86400000).toISOString(),
        cliente_telefone: "+351999000000"
      }
    }, {
      onSuccess: (res) => {
        setReservationId(res.reservation.id);
        setStep('G');
        addBotMessage({ 
          text: "Pagamento Confirmado! Envie uma foto da Carta de Condução e Passaporte para pré-check-in.",
          type: 'docs'
        });
      }
    });
  };

  const handleUploadDocs = () => {
    addUserMessage("Enviado Documentos");
    if (reservationId) {
      uploadDocs.mutate({
        id: reservationId,
        data: { docs: { passaporte: 'url', carta_conducao: 'url' } }
      }, {
        onSuccess: () => {
          updateReservation.mutate({ id: reservationId, data: { status_reserva: 'checkin_feito' } });
          setStep('H');
          addBotMessage({
            text: "Tire 4 fotos aos 4 lados do veículo antes de partir!",
            type: 'photos'
          });
        }
      });
    }
  };

  const handleUploadPhotos = () => {
    addUserMessage("Enviado Fotos");
    if (reservationId) {
      uploadPhotos.mutate({
        id: reservationId,
        data: { fotos: { frente: 'url', traseira: 'url', esq: 'url', dir: 'url' } }
      }, {
        onSuccess: () => {
          updateReservation.mutate({ id: reservationId, data: { status_reserva: 'carro_na_estrada' } });
          addBotMessage({ text: "Tudo pronto! Boa viagem! Qualquer problema, use os botões rápidos." });
        }
      });
    }
  };

  const handleSos = () => {
    addUserMessage("SOS PÂNICO");
    addBotMessage({ 
      text: "Calma! Estamos aqui. Envie a sua localização e foto do problema.",
      type: 'options',
      options: ["Enviar GPS de Teste"]
    });
    setStep('SOS_GPS');
  };

  if (step === 'SOS_GPS' && messages[messages.length-1]?.text === "Enviar GPS de Teste") {
    // Actually handle SOS GPS send
    if (reservationId) {
       createSos.mutate({
         data: {
           reserva_id: reservationId,
           localizacao_latitude: 38.7169,
           localizacao_longitude: -9.1395,
           foto_problema_url: 'https://via.placeholder.com/400x300?text=Avaria'
         }
       }, {
         onSuccess: () => {
            updateReservation.mutate({ id: reservationId, data: { status_reserva: 'carro_na_estrada' }});
            addBotMessage({ text: "Alerta enviado! A equipa de apoio já foi notificada no painel central." });
            setStep('DONE');
         }
       })
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] text-black">
      {/* Header */}
      {!hideHeader && (
        <div className="bg-[#075E54] text-white p-3 flex items-center shadow-md z-10">
          <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
            <Car className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-base leading-tight">RentaCar Bot</h3>
            <p className="text-xs text-white/80">em linha</p>
          </div>
          <div className="flex items-center gap-4 text-white">
            <Phone className="h-5 w-5" />
            <MoreVertical className="h-5 w-5" />
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ backgroundImage: "url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')", backgroundSize: 'cover', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(229,221,213,0.85)' }}
      >
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex flex-col max-w-[85%]", msg.sender === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
            <div className={cn(
              "px-3 py-2 rounded-lg shadow-sm relative text-sm",
              msg.sender === 'user' ? "bg-[#dcf8c6] rounded-tr-none text-black" : "bg-white rounded-tl-none text-black"
            )}>
              {msg.text}
              
              {/* Specialized Renderers */}
              {msg.type === 'options' && msg.options && (
                <div className="mt-2 flex flex-col gap-2">
                  {msg.options.map(opt => (
                    <Button key={opt} variant="outline" size="sm" className="w-full text-xs justify-start border-[#25D366] text-[#128C7E] hover:bg-[#dcf8c6]" onClick={() => handleOptionClick(opt)}>
                      {opt}
                    </Button>
                  ))}
                </div>
              )}

              {msg.type === 'fleet' && msg.vehicles && (
                <div className="mt-2 flex overflow-x-auto gap-2 pb-2 w-64">
                  {msg.vehicles.slice(0, 3).map((v: any) => (
                    <div key={v.id} className="min-w-[140px] border border-gray-200 rounded-md p-2 bg-gray-50 flex flex-col items-center">
                      <div className="h-16 w-full bg-gray-200 rounded mb-2 flex items-center justify-center"><Car className="h-6 w-6 text-gray-400" /></div>
                      <span className="text-xs font-bold truncate w-full text-center">{v.marca_modelo}</span>
                      <span className="text-xs text-[#128C7E]">€{v.preco_base_dia}/dia</span>
                      <Button size="sm" className="w-full h-7 mt-2 text-[10px] bg-[#25D366] hover:bg-[#128C7E]" onClick={() => handleSelectVehicle(v)}>Selecionar</Button>
                    </div>
                  ))}
                </div>
              )}

              {msg.type === 'payment' && (
                <Button className="mt-2 w-full bg-[#25D366] hover:bg-[#128C7E]" onClick={handlePayment}>Pagar Sinal</Button>
              )}

              {msg.type === 'docs' && (
                <Button className="mt-2 w-full bg-[#25D366] hover:bg-[#128C7E]" onClick={handleUploadDocs}><Paperclip className="h-4 w-4 mr-2"/> Simular Envio Docs</Button>
              )}

              {msg.type === 'photos' && (
                <Button className="mt-2 w-full bg-[#25D366] hover:bg-[#128C7E]" onClick={handleUploadPhotos}><Camera className="h-4 w-4 mr-2"/> Simular Envio Fotos</Button>
              )}

            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="bg-white px-4 py-3 rounded-lg rounded-tl-none shadow-sm mr-auto w-16 flex justify-center items-center gap-1">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-2 py-2 bg-gray-100 flex gap-2 overflow-x-auto border-t border-gray-200">
        <Button size="sm" variant="secondary" className="whitespace-nowrap rounded-full h-8 text-xs font-medium" onClick={() => addUserMessage("Voo Atrasou")}>Voo Atrasou</Button>
        <Button size="sm" variant="secondary" className="whitespace-nowrap rounded-full h-8 text-xs font-medium" onClick={() => addUserMessage("2º Condutor")}>2º Condutor</Button>
        <Button size="sm" variant="destructive" className="whitespace-nowrap rounded-full h-8 text-xs font-medium bg-red-500" onClick={handleSos}>SOS PÂNICO</Button>
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f0f0] p-2 flex items-center gap-2">
        <Input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Mensagem..." 
          className="rounded-full bg-white border-none focus-visible:ring-0 text-black h-10"
        />
        <Button size="icon" className="rounded-full h-10 w-10 shrink-0 bg-[#075E54] hover:bg-[#128C7E]" onClick={handleSend}>
          <Send className="h-4 w-4 text-white ml-0.5" />
        </Button>
      </div>
    </div>
  );
}
