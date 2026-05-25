import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFleet,
  useCreateReservation,
  useUploadDocs,
  useUploadCarPhotos,
  useCreateSosAlert,
  useUpdateReservation,
  useSimulatePayment,
  getGetDashboardStatsQueryKey,
  getGetTodayActivityQueryKey,
  getListFleetQueryKey,
  getGetFleetSummaryQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Phone, MoreVertical, Paperclip, Camera, Car, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ChatLang,
  buildDurationOptions,
  detectLanguage,
  generateOcrData,
  getLinkLanguagePrompt,
  getLinkWelcomeIntro,
  parseLanguageFromChoice,
  isCustomDurationOption,
  localeFor,
  horaFromFlightText,
  horaFromPickupSlot,
  isFlightSkip,
  parseDaysFromText,
  parsePhoneFromText,
  pickupTimeOptions,
  quickDates,
  t,
  tList,
} from "@/lib/chat-i18n";
import { AiProcessingBubble } from "./AiProcessingBubble";
import {
  addDays,
  analyzeMessage,
  findVehicleInFleet,
  parseDateInput,
  type FaqTopic,
} from "@/lib/chat-intent";
import { DEMO_FLEET, fleetOptionLabel, resolveFleetVehicle } from "@/lib/demo-fleet";
import {
  ASSISTANT_NAME,
  composeFaqWithBridge,
  getAskDurationHuman,
  getAskPickupHuman,
  getCasualGreetingReply,
  getDurationConfirmedHuman,
  getFleetIntroHuman,
  getGenericQuestionReply,
  getHumanAck,
  isValidDisplayName,
  getStepBridge,
  getHumanInvalid,
  getThanksReply,
  getVehicleChosenHuman,
  humanTypingDelay,
  isThanks,
  type HumanCtx,
} from "@/lib/chat-human";

type MessageType =
  | "text"
  | "options"
  | "fleet"
  | "quote"
  | "payment"
  | "docs"
  | "photos"
  | "terms"
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
  contractRef: string;
  protectionKey: "franquia_zero" | "standard_com_caucao";
};

type Step =
  | "ASK_LANGUAGE"
  | "GREETING"
  | "ASK_PICKUP"
  | "ASK_DURATION"
  | "ASK_RETURN"
  | "ASK_PICKUP_TIME"
  | "ASK_PHONE"
  | "ASK_PICKUP_LOCATION"
  | "ASK_FLIGHT"
  | "ASK_GROUP"
  | "SHOW_FLEET"
  | "ASK_PROTECTION"
  | "SHOW_TERMS"
  | "SHOW_QUOTE"
  | "PAYMENT"
  | "DOCS"
  | "PHOTOS"
  | "ACTIVE"
  | "SOS_CONFIRM"
  | "DONE";

function fmt(d: Date, lang: ChatLang) {
  return d.toLocaleDateString(localeFor(lang), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function toDateString(d: Date) {
  return d.toISOString().split("T")[0];
}

function isZeroProtection(opt: string) {
  return /zero|zéro|cero|ZERO|franquia/i.test(opt);
}

function isAcceptQuote(opt: string) {
  const raw = opt.trim();
  if (/^aceito$/i.test(raw) || /^accept$/i.test(raw)) return true;
  return /aceitar|accept|accepter|aceptar|annehmen|✅/i.test(opt) && !/alterar|change|changer|cambiar|ändern/i.test(opt);
}

function isChangeProtection(opt: string) {
  return /alterar|change|changer|cambiar|ändern|🔄/i.test(opt);
}

function isConfirmSos(opt: string) {
  return /confirmar|confirm|confirmer|bestätigen/i.test(opt) && !/cancel|annul|abbrechen|cancelar/i.test(opt);
}

function isCancelSos(opt: string) {
  return /cancelar|cancel|annul|abbrechen|engano|mistake|erreur|error/i.test(opt);
}

function isAcceptTerms(opt: string) {
  const t = opt.trim();
  if (/^aceito$/i.test(t) || /^accept$/i.test(t) || /^ok$/i.test(t)) return true;
  if (/✅/i.test(opt) && /(aceito|aceitar|accept|accepter|aceptar|annehmen|li e|j'accepte|ich akzeptiere)/i.test(opt)) {
    return true;
  }
  return (
    /(contrato|contrat|agreement|vertrag|aluguer|rental|location|condi)/i.test(opt) &&
    /(aceito|aceitar|accept|accepter|aceptar|annehmen)/i.test(opt)
  );
}

function isPayDeposit(opt: string) {
  return /pagar|pay|payer|zahl|€\s*50|sinal|deposit|depósito|deposito|💳/i.test(opt);
}

function vehicleDayRate(vehicle: { preco_base_dia?: number | string }): number {
  const n = Number(vehicle.preco_base_dia);
  return Number.isFinite(n) ? n : 0;
}

function isAffirmativeFromOpt(opt: string) {
  return /^(sim|yes|ok|okay|claro|oui|ja|sí|aceito|aceitar|✅)/i.test(opt.trim()) || /^✅/i.test(opt);
}

function isTermsQuestion(opt: string) {
  return /dúvida|duvida|doubt|question|frage|duda|help|ajuda/i.test(opt);
}

function contractRefFrom(id?: number | null) {
  const n = id ?? Math.floor(Date.now() / 1000) % 100000;
  return String(n).padStart(5, "0");
}

export function WhatsAppSimulator({ hideHeader }: { hideHeader?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [step, setStep] = useState<Step>("ASK_LANGUAGE");
  const [lang, setLang] = useState<ChatLang>("pt");
  const [langLocked, setLangLocked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const botTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const handlePaymentRef = useRef<() => void>(() => {});
  const handleUploadPhotosRef = useRef<() => void>(() => {});

  const queryClient = useQueryClient();

  const [clienteName, setClienteName] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [flightArrival, setFlightArrival] = useState("");
  const [groupLabel, setGroupLabel] = useState("");
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [protection, setProtection] = useState<"franquia_zero" | "standard_com_caucao">("standard_com_caucao");
  const [reservationId, setReservationId] = useState<number | null>(null);
  const [rentalDays, setRentalDays] = useState(3);
  const [pickupTime, setPickupTime] = useState("");
  const [pendingQuote, setPendingQuote] = useState<QuoteData | null>(null);

  const listFleet = useListFleet({ status: "disponivel" });

  const refreshDashboard = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetTodayActivityQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListFleetQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetFleetSummaryQueryKey() });
  }, [queryClient]);

  useEffect(() => {
    void listFleet.refetch();
  }, []);
  const createReservation = useCreateReservation();
  const simulatePayment = useSimulatePayment();
  const uploadDocs = useUploadDocs();
  const uploadPhotos = useUploadCarPhotos();
  const createSos = useCreateSosAlert();
  const updateReservation = useUpdateReservation();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping, aiProcessing]);

  const clearTimers = () => {
    botTimers.current.forEach(clearTimeout);
    botTimers.current = [];
  };

  const botSay = useCallback((msg: Omit<Message, "id" | "sender">, delayMs?: number) => {
    setIsTyping(true);
    const delay = delayMs ?? humanTypingDelay(msg.text ?? "");
    const timer = setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}`, sender: "bot" }]);
    }, delay);
    botTimers.current.push(timer);
  }, []);

  const humanCtx = useCallback(
    (): HumanCtx => ({
      name: clienteName || undefined,
      pickup: pickupDate ?? undefined,
      returnDate: returnDate ?? undefined,
      days: rentalDays,
      time: pickupTime,
      vehicle: selectedVehicle?.marca_modelo,
      caucao: selectedVehicle?.valor_caucao ?? 1200,
    }),
    [clienteName, pickupDate, returnDate, rentalDays, pickupTime, selectedVehicle],
  );

  const userSay = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, sender: "user", text, type: "text" },
    ]);
  };

  const applyLanguage = useCallback((l: ChatLang) => {
    setLang(l);
    setLangLocked(true);
  }, []);

  const promptLanguageChoice = useCallback(() => {
    botSay({ text: getLinkWelcomeIntro(), type: "text" }, 400);
    botSay({ text: getLinkLanguagePrompt(), type: "text" }, 1100);
  }, [botSay]);

  const confirmLanguageAndAskName = useCallback(
    (l: ChatLang) => {
      botSay({ text: t(l, "langConfirmed") }, 500);
      botSay({ text: t(l, "welcomeIntro") }, 900);
    },
    [botSay],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      promptLanguageChoice();
    }, 300);
    return () => {
      clearTimeout(timer);
      clearTimers();
    };
  }, [promptLanguageChoice]);

  const askPhone = useCallback(
    (name: string, l: ChatLang) => {
      botSay({ text: t(l, "askPhone", { name }), type: "text" });
    },
    [botSay],
  );

  const askPickup = useCallback(
    (name: string, l: ChatLang) => {
      botSay({ text: getAskPickupHuman(l, name), type: "text" });
    },
    [botSay],
  );

  const askPickupLocation = useCallback(
    (l: ChatLang) => {
      botSay({ text: t(l, "askPickupLocation"), type: "text" });
    },
    [botSay],
  );

  const askFlight = useCallback(
    (l: ChatLang) => {
      botSay({ text: t(l, "askFlight"), type: "text" });
    },
    [botSay],
  );

  const applyRentalDays = useCallback((pickup: Date, days: number) => {
    const d = Math.max(1, days);
    setRentalDays(d);
    setReturnDate(addDays(pickup, d));
  }, []);

  const askDuration = useCallback(
    (pickup: Date, l: ChatLang) => {
      botSay({ text: getAskDurationHuman(l, fmt(pickup, l)), type: "text" });
    },
    [botSay],
  );

  const askReturn = useCallback(
    (pickup: Date, l: ChatLang) => {
      botSay({ text: t(l, "askReturn", { pickup: fmt(pickup, l) }), type: "text" }, 1000);
    },
    [botSay],
  );

  const confirmDurationAndAskTime = useCallback(
    (pickup: Date, days: number, l: ChatLang) => {
      const ret = addDays(pickup, days);
      botSay({
        text: getDurationConfirmedHuman(l, days, fmt(pickup, l), fmt(ret, l)),
        type: "text",
      });
    },
    [botSay],
  );

  const askGroup = useCallback(
    (ret: Date, pickup: Date, days: number, time: string, l: ChatLang) => {
      botSay(
        {
          text: t(l, "rentalSummary", {
            return: fmt(ret, l),
            pickup: fmt(pickup, l),
            days,
            time: time || "10:00",
          }),
          type: "text",
        },
        1300,
      );
    },
    [botSay],
  );

  const loadAvailableFleet = useCallback(async (): Promise<any[]> => {
    try {
      const res = await listFleet.refetch();
      const fromApi = (res.data ?? []).filter((v) => v.status === "disponivel");
      if (fromApi.length > 0) return fromApi;
    } catch {
      /* fallback abaixo */
    }
    const cached = (listFleet.data ?? []).filter((v) => v.status === "disponivel");
    if (cached.length > 0) return cached;
    return DEMO_FLEET;
  }, [listFleet]);

  const showIntakeSummary = useCallback(
    (l: ChatLang) => {
      const pickup = pickupDate || new Date();
      const ret = returnDate || addDays(pickup, rentalDays);
      botSay({
        text: t(l, "intakeSummary", {
          name: clienteName || "n/d",
          phone: clienteTelefone || "n/d",
          pickup: fmt(pickup, l),
          return: fmt(ret, l),
          days: rentalDays,
          time: pickupTime || "n/d",
          location: pickupLocation || "n/d",
          flight: flightArrival || (l === "pt" ? "Sem voo" : "No flight"),
          group: groupLabel || "n/d",
        }),
      });
    },
    [botSay, clienteName, clienteTelefone, pickupDate, returnDate, rentalDays, pickupTime, pickupLocation, flightArrival, groupLabel],
  );

  const showFleet = useCallback(
    (days: number, l: ChatLang) => {
      showIntakeSummary(l);
      const loadingMsg: Record<ChatLang, string> = {
        pt: "Deixa-me ver o que temos disponível para essas datas… 🔍",
        en: "Let me check what's available for those dates… 🔍",
        fr: "Je vérifie les véhicules disponibles… 🔍",
        es: "Voy a mirar qué coches hay libres… 🔍",
        de: "Ich schaue, welche Fahrzeuge frei sind… 🔍",
      };
      botSay({ text: loadingMsg[l] ?? loadingMsg.pt, type: "text" });
      setIsTyping(true);

      const timer = setTimeout(async () => {
        const vehicles = await loadAvailableFleet();
        setIsTyping(false);
        const intro =
          vehicles.length > 0
            ? getFleetIntroHuman(l, vehicles.length, days)
            : l === "pt"
              ? "De momento não há viaturas livres na frota. Tente daqui a pouco ou contacte o balcão."
              : "No vehicles available right now. Please try again shortly.";
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-fleet`,
            sender: "bot",
            text: intro,
            type: "fleet",
            vehicles,
          },
        ]);
      }, 1400);
      botTimers.current.push(timer);
    },
    [botSay, loadAvailableFleet, showIntakeSummary],
  );

  const askProtection = useCallback(
    (vehicle: any, l: ChatLang) => {
      botSay({ text: getVehicleChosenHuman(l, vehicle.marca_modelo), type: "text" });
    },
    [botSay],
  );

  const buildQuote = useCallback(
    (vehicle: any, prot: "franquia_zero" | "standard_com_caucao", pickup: Date, ret: Date): QuoteData => {
      const days = Math.max(1, Math.round((ret.getTime() - pickup.getTime()) / 86400000));
      const baseTotal = vehicleDayRate(vehicle) * days;
      const protPerDay =
        prot === "franquia_zero" ? Number(vehicle.extra_franquia_zero) || 15 : 0;
      const protectionTotal = protPerDay * days;
      return {
        vehicle,
        days,
        pickupDate: fmt(pickup, lang),
        returnDate: fmt(ret, lang),
        baseTotal,
        protectionLabel: prot === "franquia_zero" ? "Franquia ZERO" : "Standard (com caução)",
        protectionTotal,
        grandTotal: baseTotal + protectionTotal,
        sinal: 50,
        contractRef: contractRefFrom(reservationId),
        protectionKey: prot,
      };
    },
    [lang, reservationId],
  );

  const showTerms = useCallback(
    (vehicle: any, l: ChatLang) => {
      botSay(
        {
          text: t(l, "rentalTerms", { caucao: vehicle.valor_caucao || 1200 }) + t(l, "termsAcceptHint"),
          type: "text",
        },
        1800,
      );
    },
    [botSay],
  );

  const showQuote = useCallback(
    (quote: QuoteData, l: ChatLang) => {
      setPendingQuote(quote);
      botSay({ text: t(l, "quoteIntro"), type: "quote", quoteData: quote }, 1200);
    },
    [botSay],
  );

  const remindCurrentStep = useCallback(
    (l: ChatLang, delay?: number) => {
      if (["GREETING", "DONE", "SOS_CONFIRM"].includes(step)) return;
      const bridge = getStepBridge(l, step, humanCtx());
      if (bridge) botSay({ text: bridge }, delay);
    },
    [step, botSay, humanCtx],
  );

  const replyFaq = useCallback(
    (topic: FaqTopic, l: ChatLang) => {
      botSay({ text: composeFaqWithBridge(topic, l, step, humanCtx()) });
    },
    [botSay, step, humanCtx],
  );

  const processTextInput = useCallback(
    (text: string) => {
      const now = new Date();
      const analysis = analyzeMessage(text, langLocked ? lang : undefined);
      let l: ChatLang = langLocked ? lang : "pt";

      const { faqTopic, entities, isQuestion, isAffirmative, isGreeting } = analysis;
      const fleet =
        (listFleet.data ?? []).filter((v) => v.status === "disponivel").length > 0
          ? (listFleet.data ?? []).filter((v) => v.status === "disponivel")
          : DEMO_FLEET;
      const caucao = selectedVehicle?.valor_caucao ?? 1200;
      const onlyFaq =
        !!faqTopic &&
        !entities.name &&
        !entities.pickupDate &&
        !entities.days &&
        !entities.pickupTimeLabel &&
        !entities.vehicleCategory &&
        !entities.vehicleModelHint &&
        !entities.protection;

      const ctx = humanCtx();

      if (step === "DOCS") {
        setAiProcessing(true);
        return;
      }

      if (step === "ASK_LANGUAGE") {
        const picked = parseLanguageFromChoice(text) ?? detectLanguage(text);
        applyLanguage(picked);
        l = picked;

        const looksLikeBooking = /\b(carro|rent|alugar|reserv|suv|amanh|tomorrow|dias|days)\b/i.test(text);
        const name =
          analysis.entities.name ??
          (!looksLikeBooking && !analysis.isQuestion && text.trim().length >= 2 ? text.trim() : undefined);

        if (isValidDisplayName(name)) {
          setClienteName(name!);
          setStep("ASK_PHONE");
          botSay({ text: t(picked, "langConfirmed") }, 500);
          const ackCtx: HumanCtx = { ...humanCtx(), name: name! };
          botSay({ text: getHumanAck(picked, "name", ackCtx) }, 900);
          askPhone(name!, picked);
          return;
        }

        setStep("GREETING");
        confirmLanguageAndAskName(picked);
        return;
      }

      l = lang;

      if (isThanks(text)) {
        botSay({ text: getThanksReply(l) });
        remindCurrentStep(l, 1100);
        return;
      }

      if (faqTopic) {
        replyFaq(faqTopic, l);
        if (onlyFaq) return;
      } else if (isQuestion && !["GREETING", "DOCS", "PHOTOS"].includes(step)) {
        botSay({ text: getGenericQuestionReply(l, analysis, step, ctx) });
        if (
          onlyFaq ||
          (!entities.pickupDate &&
            !entities.days &&
            !entities.name &&
            !entities.vehicleCategory &&
            !entities.vehicleModelHint &&
            !entities.protection &&
            !entities.pickupTimeLabel)
        ) {
          return;
        }
      }

      if (step === "SOS_CONFIRM") {
        if (isCancelSos(text)) {
          botSay({ text: l === "pt" ? "SOS cancelado. Estamos aqui se precisar." : "SOS cancelled." }, 600);
          setStep("ACTIVE");
          return;
        }
        if (isConfirmSos(text) && reservationId) {
          createSos.mutate(
            {
              data: {
                reserva_id: reservationId,
                localizacao_latitude: 32.6485 + Math.random() * 0.02,
                localizacao_longitude: -16.908 + Math.random() * 0.02,
                foto_problema_url:
                  "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=300&fit=crop",
              },
            },
            {
              onSuccess: () => {
                botSay({ text: t(l, "sosSent") }, 800);
                setStep("DONE");
              },
            },
          );
          return;
        }
        remindCurrentStep(l);
        return;
      }

      if (step === "ACTIVE" || step === "DONE") {
        if (!faqTopic) botSay({ text: t(l, "activeReply") }, 900);
        else remindCurrentStep(l);
        return;
      }

      if (step === "GREETING") {
        const looksLikeBooking = /\b(carro|rent|alugar|reserv|suv|amanh|tomorrow|dias|days|semana)\b/i.test(
          text,
        );
        const name =
          entities.name ??
          (!onlyFaq && !isQuestion && !isGreeting && !looksLikeBooking && text.trim().length >= 2
            ? text.trim()
            : undefined);
        const guestName = name ?? (entities.pickupDate || entities.days ? "Cliente" : undefined);

        if (isGreeting && !guestName && !entities.pickupDate && !entities.days) {
          botSay({ text: getCasualGreetingReply(l) });
          return;
        }

        if (!guestName) {
          if (!faqTopic && !isQuestion) botSay({ text: getStepBridge(l, "GREETING", ctx) });
          return;
        }

        if (!isValidDisplayName(guestName) && !entities.pickupDate && !entities.days) {
          botSay({
            text:
              l === "pt"
                ? "Não apanhei bem o seu nome. Pode escrever só o nome completo? (ex: _Maria Silva_)"
                : "I didn't catch your name. Please type your full name.",
          });
          return;
        }

        setClienteName(guestName);
        const ackCtx: HumanCtx = { ...ctx, name: guestName };
        botSay({
          text: getHumanAck(l, isValidDisplayName(guestName) ? "name" : "generic", ackCtx),
        });

        if (entities.pickupDate && entities.days) {
          setPickupDate(entities.pickupDate);
          applyRentalDays(entities.pickupDate, entities.days);
          botSay({
            text: getHumanAck(l, "dates", {
              name: guestName,
              days: entities.days,
              pickup: entities.pickupDate,
              returnDate: addDays(entities.pickupDate, entities.days),
            }),
          });
          setStep("ASK_PICKUP_TIME");
          confirmDurationAndAskTime(entities.pickupDate, entities.days, l);
          return;
        }

        if (entities.pickupDate) {
          setPickupDate(entities.pickupDate);
          botSay({
            text: getHumanAck(l, "pickup_only", { name: guestName, pickup: entities.pickupDate }),
          });
          setStep("ASK_DURATION");
          askDuration(entities.pickupDate, l);
          return;
        }

        const phoneEarly = parsePhoneFromText(text);
        if (phoneEarly) setClienteTelefone(phoneEarly);

        if (entities.pickupDate && entities.days && phoneEarly) {
          setPickupDate(entities.pickupDate);
          applyRentalDays(entities.pickupDate, entities.days);
          setStep("ASK_PICKUP_TIME");
          confirmDurationAndAskTime(entities.pickupDate, entities.days, l);
          return;
        }

        setStep("ASK_PHONE");
        askPhone(guestName, l);
        return;
      }

      if (step === "ASK_PHONE") {
        const phone =
          parsePhoneFromText(text) ??
          (tList(l, "phoneQuick").includes(text) ? text.replace(/\s/g, "") : null);
        if (!phone) {
          if (!faqTopic) botSay({ text: t(l, "askPhone", { name: clienteName }) });
          return;
        }
        setClienteTelefone(phone);
        setStep("ASK_PICKUP");
        askPickup(clienteName, l);
        return;
      }

      if (step === "ASK_PICKUP") {
        const d = entities.pickupDate ?? parseDateInput(text, now, l);
        if (!d) {
          if (!faqTopic) botSay({ text: getHumanInvalid(l, "date") });
          else remindCurrentStep(l);
          return;
        }
        setPickupDate(d);
        if (entities.days) {
          applyRentalDays(d, entities.days);
          botSay({
            text: getHumanAck(l, "dates", {
              days: entities.days,
              pickup: d,
              returnDate: addDays(d, entities.days),
            }),
          });
          setStep("ASK_PICKUP_TIME");
          confirmDurationAndAskTime(d, entities.days, l);
          return;
        }
        setStep("ASK_DURATION");
        askDuration(d, l);
        return;
      }

      if (step === "ASK_DURATION") {
        const pickup = pickupDate || now;
        const days = entities.days ?? parseDaysFromText(text);
        if (!days) {
          if (!faqTopic) botSay({ text: getHumanInvalid(l, "duration") });
          else remindCurrentStep(l);
          return;
        }
        applyRentalDays(pickup, days);
        setStep("ASK_PICKUP_TIME");
        confirmDurationAndAskTime(pickup, days, l);
        return;
      }

      if (step === "ASK_RETURN") {
        const base = pickupDate || now;
        const d = entities.returnDate ?? parseDateInput(text, base, l);
        if (!d || d <= base) {
          if (!faqTopic) botSay({ text: getHumanInvalid(l, "return") });
          else remindCurrentStep(l);
          return;
        }
        setReturnDate(d);
        const days = Math.max(1, Math.round((d.getTime() - base.getTime()) / 86400000));
        setRentalDays(days);
        setStep("ASK_PICKUP_TIME");
        confirmDurationAndAskTime(base, days, l);
        return;
      }

      if (step === "ASK_PICKUP_TIME") {
        const time =
          entities.pickupTimeLabel ??
          pickupTimeOptions(l).find((slot) => text.toLowerCase().includes(slot.slice(0, 5).toLowerCase()));
        if (!time) {
          if (!faqTopic) botSay({ text: getHumanInvalid(l, "time") });
          else remindCurrentStep(l);
          return;
        }
        setPickupTime(time);
        setStep("ASK_PICKUP_LOCATION");
        askPickupLocation(l);
        return;
      }

      if (step === "ASK_PICKUP_LOCATION") {
        if (onlyFaq) {
          remindCurrentStep(l);
          return;
        }
        setPickupLocation(text.trim());
        setStep("ASK_FLIGHT");
        askFlight(l);
        return;
      }

      if (step === "ASK_FLIGHT") {
        if (isFlightSkip(text, l)) {
          setFlightArrival("");
        } else {
          const h = horaFromFlightText(text) ?? horaFromPickupSlot(text);
          setFlightArrival(h ?? text.trim());
        }
        const pickup = pickupDate || now;
        const ret = returnDate ?? addDays(pickup, rentalDays);
        setStep("ASK_GROUP");
        askGroup(ret, pickup, rentalDays, pickupTime, l);
        return;
      }

      if (step === "ASK_GROUP") {
        if (onlyFaq) {
          remindCurrentStep(l);
          return;
        }
        setGroupLabel(text.trim());
        if (entities.vehicleCategory || entities.vehicleModelHint) {
          botSay({ text: getHumanAck(l, "generic", ctx) });
        }
        setStep("SHOW_FLEET");
        showFleet(rentalDays, l);
        return;
      }

      if (step === "SHOW_FLEET") {
        const available = fleet.length > 0 ? fleet : DEMO_FLEET;
        const v =
          findVehicleInFleet(available, entities) ??
          resolveFleetVehicle(available, text);
        if (v) {
          botSay({ text: getHumanAck(l, "vehicle", { vehicle: v.marca_modelo }) });
          const timer = setTimeout(() => {
            setSelectedVehicle(v);
            setStep("ASK_PROTECTION");
            askProtection(v, l);
          }, 700);
          botTimers.current.push(timer);
          return;
        }
        if (!faqTopic) botSay({ text: getHumanInvalid(l, "vehicle") });
        else remindCurrentStep(l);
        return;
      }

      if (step === "ASK_PROTECTION") {
        const prot =
          entities.protection ??
          (isZeroProtection(text) ? "franquia_zero" : /standard|com cau/i.test(text) ? "standard_com_caucao" : null);
        if (prot) {
          setProtection(prot);
          botSay({ text: getHumanAck(l, "protection", ctx) });
          setStep("SHOW_TERMS");
          showTerms(selectedVehicle, l);
          return;
        }
        if (!faqTopic) botSay({ text: getHumanInvalid(l, "protection") });
        else remindCurrentStep(l);
        return;
      }

      if (step === "SHOW_TERMS") {
        if (!selectedVehicle) {
          botSay({ text: t(l, "invalidDate") }, 600);
          setStep("SHOW_FLEET");
          showFleet(rentalDays, l);
          return;
        }
        const pickup = pickupDate || now;
        const ret = returnDate ?? addDays(now, rentalDays);
        const quote = buildQuote(selectedVehicle, protection, pickup, ret);
        if (isAffirmative || isAcceptTerms(text)) {
          setStep("SHOW_QUOTE");
          showQuote(quote, l);
          return;
        }
        if (isTermsQuestion(text)) {
          botSay({ text: t(l, "termsReply") }, 900);
          setTimeout(() => {
            setStep("SHOW_QUOTE");
            showQuote(quote, l);
          }, 1200);
          return;
        }
        if (!faqTopic) remindCurrentStep(l);
        return;
      }

      if (step === "SHOW_QUOTE") {
        if (
          isAcceptQuote(text) ||
          isAcceptTerms(text) ||
          isPayDeposit(text) ||
          (isAffirmative && !isChangeProtection(text))
        ) {
          setStep("PAYMENT");
          botSay({ text: t(l, "paymentPrompt"), type: "payment" }, 1000);
          return;
        }
        if (isChangeProtection(text) || entities.protection) {
          if (entities.protection) setProtection(entities.protection);
          setStep("ASK_PROTECTION");
          askProtection(selectedVehicle, l);
          return;
        }
        if (!faqTopic) remindCurrentStep(l);
        return;
      }

      if (step === "PAYMENT") {
        if (isPayDeposit(text) || isAffirmative || isAcceptQuote(text)) {
          handlePaymentRef.current();
          return;
        }
        if (faqTopic || isQuestion) remindCurrentStep(l);
        return;
      }

      if (step === "PHOTOS") {
        if (/foto|photo|enviar|send|📷/i.test(text) || isAffirmative) {
          handleUploadPhotosRef.current();
          return;
        }
        if (faqTopic || isQuestion) remindCurrentStep(l);
        return;
      }

    },
    [
      step,
      lang,
      langLocked,
      pickupDate,
      returnDate,
      rentalDays,
      selectedVehicle,
      protection,
      applyLanguage,
      confirmLanguageAndAskName,
      botSay,
      replyFaq,
      remindCurrentStep,
      humanCtx,
      askPhone,
      askPickup,
      askPickupLocation,
      askFlight,
      askDuration,
      applyRentalDays,
      confirmDurationAndAskTime,
      askGroup,
      showFleet,
      askProtection,
      showTerms,
      buildQuote,
      showQuote,
      listFleet.data,
      createSos,
      reservationId,
    ],
  );

  const handleOptionClick = useCallback(
    (opt: string) => {
      userSay(opt);
      const now = new Date();

      if (step === "ASK_LANGUAGE") {
        const picked = parseLanguageFromChoice(opt) ?? detectLanguage(opt);
        applyLanguage(picked);
        setLang(picked);
        setStep("GREETING");
        confirmLanguageAndAskName(picked);
        return;
      } else if (step === "ASK_PICKUP") {
        const match = quickDates(lang).find((d) => d.label === opt);
        const d = match ? addDays(now, match.days) : parseDateInput(opt, now, lang);
        if (!d) return;
        setPickupDate(d);
        setStep("ASK_DURATION");
        askDuration(d, lang);
      } else if (step === "ASK_DURATION") {
        const pickup = pickupDate || now;
        if (isCustomDurationOption(opt, lang)) {
          setStep("ASK_RETURN");
          askReturn(pickup, lang);
          return;
        }
        const match = buildDurationOptions(lang, pickup).find((o) => o.label === opt);
        if (!match || match.isCustom) return;
        applyRentalDays(pickup, match.days);
        setStep("ASK_PICKUP_TIME");
        confirmDurationAndAskTime(pickup, match.days, lang);
      } else if (step === "ASK_PHONE") {
        const phone = parsePhoneFromText(opt) ?? opt.replace(/\s/g, "");
        setClienteTelefone(phone);
        setStep("ASK_PICKUP");
        askPickup(clienteName, lang);
      } else if (step === "ASK_PICKUP_TIME") {
        setPickupTime(opt);
        setStep("ASK_PICKUP_LOCATION");
        askPickupLocation(lang);
      } else if (step === "ASK_PICKUP_LOCATION") {
        setPickupLocation(opt);
        setStep("ASK_FLIGHT");
        askFlight(lang);
      } else if (step === "ASK_FLIGHT") {
        if (isFlightSkip(opt, lang)) setFlightArrival("");
        else setFlightArrival(horaFromFlightText(opt) ?? horaFromPickupSlot(opt) ?? opt);
        const pickup = pickupDate || now;
        const ret = returnDate || addDays(pickup, rentalDays);
        setStep("ASK_GROUP");
        askGroup(ret, pickup, rentalDays, pickupTime, lang);
      } else if (step === "ASK_GROUP") {
        setGroupLabel(opt);
        setStep("SHOW_FLEET");
        showFleet(rentalDays, lang);
      } else if (step === "SHOW_FLEET") {
        const available =
          (listFleet.data ?? []).filter((v) => v.status === "disponivel").length > 0
            ? (listFleet.data ?? []).filter((v) => v.status === "disponivel")
            : DEMO_FLEET;
        const v = resolveFleetVehicle(available, opt);
        if (v) {
          setSelectedVehicle(v);
          setStep("ASK_PROTECTION");
          askProtection(v, lang);
        }
      } else if (step === "ASK_PROTECTION") {
        const prot: "franquia_zero" | "standard_com_caucao" = isZeroProtection(opt)
          ? "franquia_zero"
          : "standard_com_caucao";
        setProtection(prot);
        setStep("SHOW_TERMS");
        showTerms(selectedVehicle, lang);
      } else if (step === "SHOW_TERMS") {
        if (!selectedVehicle) {
          setStep("SHOW_FLEET");
          showFleet(rentalDays, lang);
          return;
        }
        const pickup = pickupDate || now;
        const ret = returnDate || addDays(now, rentalDays);
        const quote = buildQuote(selectedVehicle, protection, pickup, ret);
        if (isAcceptTerms(opt) || isAffirmativeFromOpt(opt)) {
          setStep("SHOW_QUOTE");
          showQuote(quote, lang);
        } else if (isTermsQuestion(opt)) {
          botSay({ text: t(lang, "termsReply") }, 900);
          setTimeout(() => {
            setStep("SHOW_QUOTE");
            showQuote(quote, lang);
          }, 1200);
        } else {
          remindCurrentStep(lang);
        }
      } else if (step === "SHOW_QUOTE") {
        if (isAcceptQuote(opt) || isAcceptTerms(opt) || isPayDeposit(opt)) {
          setStep("PAYMENT");
          botSay({ text: t(lang, "paymentPrompt"), type: "payment" }, 1000);
        } else if (isChangeProtection(opt)) {
          setStep("ASK_PROTECTION");
          askProtection(selectedVehicle, lang);
        } else {
          remindCurrentStep(lang);
        }
      } else if (step === "PAYMENT") {
        if (isPayDeposit(opt) || isAcceptQuote(opt)) {
          handlePaymentRef.current();
        } else {
          remindCurrentStep(lang);
        }
      } else if (step === "DOCS") {
        handleUploadDocs();
      } else if (step === "PHOTOS") {
        handleUploadPhotosRef.current();
      } else if (step === "SOS_CONFIRM") {
        if (isConfirmSos(opt) && reservationId) {
          createSos.mutate(
            {
              data: {
                reserva_id: reservationId,
                localizacao_latitude: 32.6485 + Math.random() * 0.02,
                localizacao_longitude: -16.908 + Math.random() * 0.02,
                foto_problema_url: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=300&fit=crop",
              },
            },
            {
              onSuccess: () => {
                botSay({ text: t(lang, "sosSent") }, 800);
                setStep("DONE");
              },
            },
          );
        }
      }
    },
    [
      step,
      lang,
      pickupDate,
      returnDate,
      selectedVehicle,
      reservationId,
      rentalDays,
      applyRentalDays,
      askDuration,
      askReturn,
      confirmDurationAndAskTime,
      askGroup,
      askPhone,
      askPickupLocation,
      askFlight,
      showFleet,
      buildQuote,
      showQuote,
      showTerms,
      askProtection,
      protection,
      botSay,
      createSos,
      listFleet.data,
      clienteName,
      clienteTelefone,
      pickupTime,
      remindCurrentStep,
    ],
  );

  const handleSelectVehicle = useCallback(
    (v: any) => {
      userSay(`${t(lang, "choose")}: *${v.marca_modelo}*`);
      setSelectedVehicle(v);
      setStep("ASK_PROTECTION");
      askProtection(v, lang);
    },
    [lang, askProtection],
  );

  const advanceToDocs = useCallback(
    (id: number) => {
      setReservationId(id);
      setStep("DOCS");
      refreshDashboard();
      botSay(
        {
          text: t(lang, "paymentOk", { id }),
          type: "docs",
        },
        1500,
      );
    },
    [lang, botSay, refreshDashboard],
  );

  const handlePayment = useCallback(() => {
    if (createReservation.isPending || simulatePayment.isPending) return;

    userSay(`✅ ${t(lang, "payDeposit")}`);
    botSay({ text: t(lang, "paymentProcessing") }, 600);

    const pickup = pickupDate || new Date();
    const ret = returnDate || addDays(new Date(), rentalDays);
    const vehicleId = Number(selectedVehicle?.id) || 1;

    const finishPayment = (id: number) => {
      simulatePayment.mutate(
        { id },
        {
          onSuccess: () => advanceToDocs(id),
          onError: () => advanceToDocs(id),
        },
      );
    };

    createReservation.mutate(
      {
        data: {
          cliente_nome: clienteName || "Cliente",
          cliente_idioma: lang,
          veiculo_id: vehicleId,
          tipo_protecao: protection,
          data_levantamento: toDateString(pickup),
          data_devolucao: toDateString(ret),
          cliente_telefone: clienteTelefone || "+351912345678",
          hora_chegada_voo: flightArrival || horaFromPickupSlot(pickupTime) || undefined,
        },
      },
      {
        onSuccess: (res) => {
          const id = res.reservation?.id;
          if (id) {
            finishPayment(id);
          } else {
            const fallbackId = Math.floor(Date.now() % 100000) || 1;
            advanceToDocs(fallbackId);
          }
        },
        onError: () => {
          const fallbackId = Math.floor(Date.now() % 100000) || 1;
          botSay({ text: t(lang, "paymentOfflineNote") }, 700);
          advanceToDocs(fallbackId);
        },
      },
    );
  }, [
    pickupDate,
    returnDate,
    clienteName,
    clienteTelefone,
    pickupLocation,
    flightArrival,
    pickupTime,
    lang,
    selectedVehicle,
    protection,
    botSay,
    createReservation,
    simulatePayment,
    advanceToDocs,
    rentalDays,
    refreshDashboard,
  ]);

  handlePaymentRef.current = handlePayment;

  const persistDocsWithOcr = useCallback(
    (ocr: ReturnType<typeof generateOcrData>) => {
      if (!reservationId) return;
      uploadDocs.mutate(
        {
          id: reservationId,
          data: {
            docs: {
              passaporte: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=300&h=200&fit=crop",
              carta_conducao: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=300&h=200&fit=crop",
              pre_chat: {
                pickup_location: pickupLocation,
                group: groupLabel,
                flight: flightArrival,
                pickup_time_slot: pickupTime,
                telefone: clienteTelefone,
              },
              ocr,
              ia_verificado: true,
            },
          },
        },
        {
          onSuccess: () => {
            refreshDashboard();
            updateReservation.mutate({
              id: reservationId,
              data: { status_reserva: "checkin_feito" },
            });
          },
          onError: () => {
            botSay({ text: "⚠️ Erro ao guardar documentos. Tente novamente." }, 600);
          },
        },
      );
    },
    [reservationId, uploadDocs, updateReservation, botSay, pickupLocation, groupLabel, flightArrival, pickupTime, clienteTelefone],
  );

  const handleUploadDocs = useCallback(() => {
    if (aiProcessing) return;
    userSay(t(lang, "docsPrompt"));
    setAiProcessing(true);
  }, [aiProcessing, lang]);

  const onAiDocsComplete = useCallback(() => {
    const ocr = generateOcrData(clienteName);
    setAiProcessing(false);
    setStep("PHOTOS");
    botSay(
      {
        text: t(lang, "docsOk", {
          nome: ocr.nome,
          doc: ocr.numero_documento,
          validade: ocr.validade,
        }),
        type: "photos",
      },
      500,
    );
    if (reservationId) persistDocsWithOcr(ocr);
  }, [clienteName, persistDocsWithOcr, botSay, lang, reservationId]);

  const goActiveAfterPhotos = useCallback(() => {
    setStep("ACTIVE");
    botSay(
      {
        text: t(lang, "photosOk", { return: returnDate ? fmt(returnDate, lang) : "n/d" }),
      },
      1600,
    );
  }, [botSay, returnDate, lang]);

  const handleUploadPhotos = useCallback(() => {
    userSay(t(lang, "photosPrompt"));
    if (!reservationId) {
      goActiveAfterPhotos();
      return;
    }
    uploadPhotos.mutate(
      {
        id: reservationId,
        data: {
          fotos: {
            frente: "https://images.unsplash.com/photo-1494976388531-105105e7770f?w=400&h=300&fit=crop",
            traseira: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=300&fit=crop",
            esquerda: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop",
            direita: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=300&fit=crop",
          },
        },
      },
      {
        onSuccess: () => {
          updateReservation.mutate({
            id: reservationId,
            data: { status_reserva: "carro_na_estrada" },
          });
          goActiveAfterPhotos();
        },
        onError: () => goActiveAfterPhotos(),
      },
    );
  }, [reservationId, uploadPhotos, updateReservation, goActiveAfterPhotos, lang]);

  handleUploadPhotosRef.current = handleUploadPhotos;

  const handleSos = useCallback(() => {
    if (step === "ACTIVE" || step === "DONE") {
      userSay("🆘 SOS");
      setStep("SOS_CONFIRM");
      botSay(
        {
          text:
            t(lang, "sosActive") +
            (lang === "pt"
              ? "\n\n✍️ Escreva *CONFIRMAR* para enviar a localização ou *CANCELAR* se foi engano."
              : "\n\n✍️ Type *CONFIRM* to send location or *CANCEL* if it was a mistake."),
          type: "text",
        },
        700,
      );
    } else {
      userSay("SOS");
      botSay({ text: t(lang, "sosUnavailable") }, 800);
    }
  }, [step, botSay, lang]);

  const handleFaqChip = useCallback(() => {
    const label = t(lang, "faqChip");
    userSay(label);
    botSay({ text: composeFaqWithBridge("help_menu", lang, step, humanCtx()) });
  }, [lang, step, humanCtx, botSay]);

  const handleReset = () => {
    clearTimers();
    setMessages([]);
    setStep("ASK_LANGUAGE");
    setLang("pt");
    setLangLocked(false);
    setClienteName("");
    setClienteTelefone("");
    setPickupLocation("");
    setFlightArrival("");
    setGroupLabel("");
    setPickupDate(null);
    setReturnDate(null);
    setSelectedVehicle(null);
    setProtection("standard_com_caucao");
    setReservationId(null);
    setRentalDays(3);
    setPickupTime("");
    setPendingQuote(null);
    setIsTyping(false);
    setAiProcessing(false);
    setTimeout(() => promptLanguageChoice(), 300);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    if (step !== "DOCS" && step !== "PHOTOS") userSay(text);
    processTextInput(text);
  };

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] text-black">
      {!hideHeader && (
        <div className="bg-[#075E54] text-white p-3 flex items-center shadow-md z-10 shrink-0">
          <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center mr-3 shrink-0">
            <Car className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base leading-tight">Sofia, Autocunha</h3>
            <p className="text-xs text-white/80">
              {langLocked
                ? `${ASSISTANT_NAME[lang]}, ${lang.toUpperCase()}`
                : "🌍 Escolha o idioma / Choose language"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-white">
            <Phone className="h-5 w-5" />
            <button onClick={handleReset} title="Reiniciar" className="hover:opacity-70 transition-opacity">
              <RefreshCw className="h-4 w-4" />
            </button>
            <MoreVertical className="h-5 w-5" />
          </div>
        </div>
      )}

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
            className={cn("flex flex-col", msg.sender === "user" ? "items-end" : "items-start")}
          >
            <div
              className={cn(
                "max-w-[88%] px-3 py-2 rounded-lg shadow-sm text-sm leading-relaxed",
                msg.sender === "user"
                  ? "bg-[#dcf8c6] rounded-tr-none text-black"
                  : "bg-white rounded-tl-none text-black",
              )}
            >
              <WhatsAppText text={msg.text} />

              {(msg.type === "options" || msg.type === "terms") && msg.options && (
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

              {msg.type === "fleet" && (
                <>
                  {(msg.vehicles?.length ?? 0) > 0 && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-[320px]">
                      {(msg.vehicles || []).map((v: any) => (
                        <div
                          key={v.id}
                          className="border border-gray-200 rounded-lg p-2 bg-gray-50 flex flex-col items-stretch"
                        >
                          {v.foto_url ? (
                            <img
                              src={v.foto_url}
                              alt={v.marca_modelo}
                              className="h-20 w-full object-cover rounded mb-1.5"
                            />
                          ) : (
                            <div className="h-20 w-full bg-gray-200 rounded mb-1.5 flex items-center justify-center">
                              <Car className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          <span className="text-xs font-bold text-center">{v.marca_modelo}</span>
                          <span className="text-[10px] text-gray-500 text-center">{v.categoria}</span>
                          <span className="text-xs text-[#128C7E] font-semibold text-center mt-0.5">
                            €{v.preco_base_dia}/dia
                          </span>
                          <Button
                            size="sm"
                            className="w-full h-8 mt-2 text-xs bg-[#25D366] hover:bg-[#128C7E] text-white border-none"
                            onClick={() => handleSelectVehicle(v)}
                          >
                            {t(lang, "choose")}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {msg.type === "quote" && msg.quoteData && (
                <QuoteCard quote={msg.quoteData} lang={lang} />
              )}

              {msg.type === "payment" && (
                <Button
                  className="mt-3 w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold"
                  onClick={handlePayment}
                  disabled={createReservation.isPending || simulatePayment.isPending}
                >
                  {createReservation.isPending || simulatePayment.isPending
                    ? t(lang, "paymentProcessing")
                    : t(lang, "payDeposit")}
                </Button>
              )}

              {msg.type === "docs" && (
                <Button
                  className="mt-3 w-full bg-[#25D366] hover:bg-[#128C7E] text-white"
                  onClick={handleUploadDocs}
                  disabled={aiProcessing}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  {aiProcessing ? t(lang, "aiAnalyzing") : t(lang, "sendDocs")}
                </Button>
              )}

              {msg.type === "photos" && (
                <Button
                  className="mt-3 w-full bg-[#25D366] hover:bg-[#128C7E] text-white"
                  onClick={handleUploadPhotos}
                  disabled={uploadPhotos.isPending}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {uploadPhotos.isPending ? "..." : t(lang, "sendPhotos")}
                </Button>
              )}
            </div>
          </div>
        ))}

        {aiProcessing && (
          <AiProcessingBubble lang={lang} onComplete={onAiDocsComplete} durationMs={1200} />
        )}

        {isTyping && !aiProcessing && (
          <div className="bg-white px-4 py-3 rounded-lg rounded-tl-none shadow-sm w-16 flex justify-center items-center gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>

      <div className="px-2 py-1.5 bg-gray-50 border-t border-gray-200 flex gap-1.5 overflow-x-auto shrink-0">
        <button
          onClick={handleSos}
          className="whitespace-nowrap text-[11px] font-medium px-3 py-1 rounded-full bg-red-500 text-white hover:bg-red-600 shrink-0"
        >
          🆘 SOS
        </button>
        <button
          onClick={handleFaqChip}
          className="whitespace-nowrap text-[11px] font-medium px-3 py-1 rounded-full bg-[#075E54] text-white hover:bg-[#128C7E] shrink-0"
        >
          {t(lang, "faqChip")}
        </button>
        <button
          onClick={handleReset}
          className="whitespace-nowrap text-[11px] font-medium px-3 py-1 rounded-full bg-white border border-gray-300 text-gray-500 hover:bg-gray-100 shrink-0 ml-auto"
        >
          ↺
        </button>
      </div>

      <div className="bg-[#f0f0f0] p-2 flex items-center gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message..."
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
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>
            {part}
          </span>
        ),
      )}
    </span>
  );
}

function QuoteCard({ quote, lang }: { quote: QuoteData; lang: ChatLang }) {
  return (
    <div className="mt-2 rounded-lg border border-gray-200 overflow-hidden text-xs">
      <div className="bg-[#075E54] text-white px-3 py-2 font-bold text-sm leading-snug">
        🧾 {t(lang, "quoteContract", { ref: quote.contractRef })}
      </div>
      <div className="bg-white divide-y divide-gray-100">
        <Row label="🚗" value={quote.vehicle.marca_modelo} />
        <Row label="📅" value={`${quote.pickupDate} a ${quote.returnDate}`} />
        <Row label="📆" value={`${quote.days} dia(s)`} />
        <Row label="Base" value={`€${quote.baseTotal}`} />
        {quote.protectionTotal > 0 ? (
          <Row label={quote.protectionLabel} value={`€${quote.protectionTotal}`} />
        ) : (
          <Row label={quote.protectionLabel} value="Caução no cartão" />
        )}
        <div className="px-3 py-1.5 bg-gray-50 text-[10px] text-gray-600 space-y-0.5">
          <div>• {t(lang, "quoteKms")}</div>
          <div>• {t(lang, "quoteFuel")}</div>
          <div>• {t(lang, "quoteMinAge")}</div>
        </div>
        <div className="px-3 py-2 bg-[#dcf8c6] flex justify-between font-bold">
          <span>TOTAL</span>
          <span className="text-[#075E54]">€{quote.grandTotal}</span>
        </div>
        <div className="px-3 py-2 bg-amber-50 flex justify-between text-amber-800">
          <span>Sinal</span>
          <span className="font-bold">€{quote.sinal}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1.5 flex justify-between gap-2">
      <span className="text-gray-500 text-[11px]">{label}</span>
      <span className="font-medium text-[11px]">{value}</span>
    </div>
  );
}
