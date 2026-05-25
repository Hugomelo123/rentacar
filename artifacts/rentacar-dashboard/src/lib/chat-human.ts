import type { ChatLang } from "./chat-i18n";
import { isLanguageOnlyInput, t } from "./chat-i18n";
import type { AnalyzeResult, FaqTopic } from "./chat-intent";
import { formatDateShort, getFaqAnswer, getStepReminder } from "./chat-intent";

export const ASSISTANT_NAME: Record<ChatLang, string> = {
  pt: "Sofia",
  en: "Sofia",
  fr: "Sofia",
  es: "Sofia",
  de: "Sofia",
};

export type HumanCtx = {
  name?: string;
  pickup?: Date;
  returnDate?: Date;
  days?: number;
  time?: string;
  vehicle?: string;
  userText?: string;
  caucao?: number;
};

/** Delay (ms), respostas mais longas = “a escrever” mais tempo */
export function humanTypingDelay(text: string, base = 550): number {
  return Math.min(2800, base + Math.min(text.length, 180) * 14);
}

export function getOpeningGreeting(lang: ChatLang): string {
  const n = ASSISTANT_NAME[lang];
  const openers: Record<ChatLang, string> = {
    pt:
      `Olá! 😊 Sou a *${n}*, da *Autocunha Rent-a-Car* (Madeira).\n\nAqui tratamos de *quase tudo* antes do balcão: nome, contacto, datas, voo, carro, proteção, contrato e pré-check-in com IA.\n\nNo balcão só fica entregar chaves, poupa ~90% do tempo.\n\n*Como se chama*?`,
    en:
      `Hi! 😊 I'm *${n}* from *Autocunha Rent-a-Car* (Madeira).\n\nI handle bookings here on WhatsApp, just tell me what you need: dates, car type, deposit questions, anything.\n\n*What's your name* to get started?`,
    fr:
      `Bonjour! 😊 Je suis *${n}*, *Autocunha Rent-a-Car* (Madère).\n\nJe m'occupe des réservations ici, dates, véhicule, caution, contrat…\n\n*Quel est votre nom* pour commencer?`,
    es:
      `¡Hola! 😊 Soy *${n}*, de *Autocunha Rent-a-Car* (Madeira).\n\nGestiono reservas por aquí, fechas, coche, depósito, contrato…\n\n*¿Cómo se llama* para empezar?`,
    de:
      `Hallo! 😊 Ich bin *${n}*, *Autocunha Rent-a-Car* (Madeira).\n\nIch kümmere mich um Buchungen, Datum, Fahrzeug, Kaution, Vertrag…\n\n*Wie heißen Sie*?`,
  };
  return openers[lang] ?? openers.pt;
}

export function getCasualGreetingReply(lang: ChatLang): string {
  const n = ASSISTANT_NAME[lang];
  const lines: Record<ChatLang, string> = {
    pt: `Olá! Tudo bem por aqui 😊 Sou a *${n}* da Autocunha, posso ajudar com uma reserva ou esclarecer qualquer dúvida.\n\nDiga-me o seu *nome* e o que precisa (ex: _«carro amanhã, 4 dias»_).`,
    en: `Hey! All good here 😊 I'm *${n}* at Autocunha, happy to book a car or answer questions.\n\nYour *name* and what you need (e.g. _«car tomorrow, 4 days»_)?`,
    fr: `Bonjour! Tout va bien 😊 *${n}*, Autocunha, réservation ou questions.\n\nVotre *nom* et votre besoin?`,
    es: `¡Hola! Todo bien 😊 *${n}*, Autocunha, reserva o dudas.\n\nSu *nombre* y qué necesita?`,
    de: `Hallo! Alles gut 😊 *${n}*, Autocunha, Buchung oder Fragen.\n\nIhr *Name* und Wunsch?`,
  };
  return lines[lang] ?? lines.pt;
}

export function getThanksReply(lang: ChatLang): string {
  const lines: Record<ChatLang, string> = {
    pt: "De nada! É um prazer ajudar. 💙",
    en: "You're welcome! Happy to help. 💙",
    fr: "Avec plaisir! 💙",
    es: "¡De nada! 💙",
    de: "Gern geschehen! 💙",
  };
  return lines[lang] ?? lines.pt;
}

export function isThanks(text: string): boolean {
  return /\b(obrigad|thanks|thank you|merci|gracias|danke|valeu|agradeço)\b/i.test(text);
}

export function isValidDisplayName(name: string | undefined): boolean {
  const n = (name ?? "").trim();
  if (n.length < 2) return false;
  if (/^cliente$/i.test(n)) return false;
  if (isLanguageOnlyInput(n)) return false;
  if (!/[a-zA-ZÀ-ÿ]{2,}/.test(n)) return false;
  const words = n.split(/\s+/).filter(Boolean);
  if (words.length === 1 && words[0].length < 3) return false;
  return true;
}

export function getHumanAck(
  lang: ChatLang,
  kind: "name" | "dates" | "pickup_only" | "vehicle" | "protection" | "generic",
  ctx: HumanCtx,
): string {
  const name = (ctx.name ?? "").trim();
  if (kind === "name" && !isValidDisplayName(name)) {
    return getHumanAck(lang, "generic", ctx);
  }
  const pickup = ctx.pickup ? formatDateShort(ctx.pickup, lang) : "";
  const ret = ctx.returnDate ? formatDateShort(ctx.returnDate, lang) : "";
  const days = ctx.days ?? 0;
  const vehicle = ctx.vehicle ?? "";

  const pt: Record<string, string> = {
    name: `Prazer, *${name}*! Vou tratar da sua reserva com todo o cuidado.`,
    dates: `Perfeito, *${days} dia(s)*, levantamento *${pickup}* e devolução *${ret}*. Já tenho isso anotado.`,
    pickup_only: `Ótimo, levantamento a *${pickup}*. Só falta saber quantos dias precisa do carro.`,
    vehicle: `Boa escolha, o *${vehicle}* está disponível. Vou mostrar-lho na frota.`,
    protection: `Registado. Vou preparar o contrato com essa proteção.`,
    generic: `Percebi, obrigada por explicar. Vamos avançar.`,
  };
  const en: Record<string, string> = {
    name: `Nice to meet you, *${name}*! I'll take care of your booking.`,
    dates: `Got it, *${days} day(s)*, pick-up *${pickup}*, return *${ret}*.`,
    pickup_only: `Pick-up on *${pickup}*, how many days do you need the car?`,
    vehicle: `Great, the *${vehicle}* is available. I'll show it in the fleet.`,
    protection: `Noted, I'll prepare the contract with that plan.`,
    generic: `Understood, let's continue.`,
  };
  const fr: Record<string, string> = {
    name: `Enchanté, *${name}*! Je m'occupe de votre réservation.`,
    dates: `C'est noté: *${days} jour(s)*, prise *${pickup}*, retour *${ret}*.`,
    pickup_only: `Prise en charge le *${pickup}*. Combien de jours souhaitez-vous louer?`,
    vehicle: `Très bien, le *${vehicle}* est disponible. Je vous le montre dans la flotte.`,
    protection: `Enregistré. Je prépare le contrat avec cette protection.`,
    generic: `Compris, on continue.`,
  };
  const es: Record<string, string> = {
    name: `Encantada, *${name}*! Me encargo de su reserva.`,
    dates: `Anotado: *${days} día(s)*, recogida *${pickup}*, devolución *${ret}*.`,
    pickup_only: `Recogida el *${pickup}*. ¿Cuántos días necesita el coche?`,
    vehicle: `Perfecto, el *${vehicle}* está disponible. Se lo muestro en la flota.`,
    protection: `Registrado. Preparo el contrato con esa protección.`,
    generic: `Entendido, seguimos.`,
  };
  const de: Record<string, string> = {
    name: `Freut mich, *${name}*! Ich kümmere mich um Ihre Buchung.`,
    dates: `Notiert: *${days} Tag(e)*, Abholung *${pickup}*, Rückgabe *${ret}*.`,
    pickup_only: `Abholung am *${pickup}*. Wie viele Tage möchten Sie mieten?`,
    vehicle: `Gut, der *${vehicle}* ist verfügbar. Ich zeige ihn in der Flotte.`,
    protection: `Notiert. Ich bereite den Vertrag mit diesem Schutz vor.`,
    generic: `Verstanden, machen wir weiter.`,
  };
  const map = { pt, en, fr, es, de };
  return (map[lang] ?? pt)[kind] ?? pt.generic;
}

export function getHumanInvalid(
  lang: ChatLang,
  kind: "date" | "duration" | "return" | "time" | "vehicle" | "protection",
): string {
  const lines: Record<ChatLang, Record<string, string>> = {
    pt: {
      date: "Hmm, não apanhei bem a data 🤔 Pode dizer _amanhã_, _25/05_, _sábado_…",
      duration: "Quantos dias precisa? Escreva _5 dias_, _uma semana_…",
      return: "A devolução tem de ser depois do levantamento, qual data prefere?",
      time: "A que horas quer levantar? Escreva _10h_, _14:30_, _de manhã_…",
      vehicle: "Não encontrei esse modelo agora — diga _SUV_, _Clio_, _Golf_ ou toque no cartão com foto.",
      protection: "Prefere *Franquia ZERO* (sem caução) ou *Standard* (com caução no cartão)? Posso explicar a diferença.",
    },
    en: {
      date: "I didn't quite catch the date 🤔 Try _«tomorrow»_, DD/MM, or tap an option.",
      duration: "How many days? Type _«5 days»_ or pick below.",
      return: "Return must be after pick-up, which date works?",
      time: "What pick-up time? _«10am»_ or pick a slot below.",
      vehicle: "I couldn't find that car, try _«SUV»_, _«Clio»_, or pick from the list.",
      protection: "*ZERO excess* (no deposit) or *Standard* (card hold)? I can explain.",
    },
    fr: {
      date: "Je n'ai pas bien compris la date 🤔",
      duration: "Combien de jours?",
      return: "Le retour doit être après la prise en charge.",
      time: "Quelle heure de prise en charge?",
      vehicle: "Choisissez un véhicule dans la liste.",
      protection: "Franchise ZÉRO ou Standard?",
    },
    es: {
      date: "No entendí la fecha 🤔",
      duration: "¿Cuántos días?",
      return: "La devolución debe ser después de la recogida.",
      time: "¿Hora de recogida?",
      vehicle: "Elija en la lista o diga SUV/Clio.",
      protection: "Franquicia CERO o Standard?",
    },
    de: {
      date: "Datum nicht verstanden 🤔",
      duration: "Wie viele Tage?",
      return: "Rückgabe nach Abholung.",
      time: "Abholzeit?",
      vehicle: "Fahrzeug aus der Liste wählen.",
      protection: "ZERO oder Standard?",
    },
  };
  return lines[lang]?.[kind] ?? lines.pt[kind];
}

/** FAQ + ponte natural para o passo atual (uma mensagem fluida) */
export function composeFaqWithBridge(
  topic: FaqTopic,
  lang: ChatLang,
  step: string,
  ctx: HumanCtx,
): string {
  const faq = getFaqAnswer(topic, lang, { caucao: ctx.caucao ?? 1200 });
  const bridge = getStepBridge(lang, step, ctx);
  if (!bridge || ["ACTIVE", "DONE", "SOS_CONFIRM", "GREETING"].includes(step)) {
    return faq;
  }
  const connectors: Record<ChatLang, string> = {
    pt: "\n\nQuando quiser, continuamos a reserva:",
    en: "\n\nWhenever you're ready, let's continue:",
    fr: "\n\nPour continuer la réservation:",
    es: "\n\nPara seguir con la reserva:",
    de: "\n\nWeiter mit der Buchung:",
  };
  return `${faq}${connectors[lang] ?? connectors.pt}\n${bridge}`;
}

export function getStepBridge(lang: ChatLang, step: string, ctx: HumanCtx): string {
  const name = ctx.name ? `, *${ctx.name}*` : "";
  const bridges: Record<ChatLang, Record<string, string>> = {
    pt: {
      GREETING: "Diga-me o seu *nome completo* para começarmos.",
      ASK_PHONE: "Indique o seu *telemóvel* (com indicativo).",
      ASK_PICKUP: `Para quando precisa do carro${name}?`,
      ASK_PICKUP_LOCATION: "Onde prefere *levantar* o carro?",
      ASK_FLIGHT: "Hora de chegada do *voo* (ou «sem voo»).",
      ASK_DURATION: "Quantos *dias* de aluguer pretende?",
      ASK_RETURN: "Qual a *data de devolução*?",
      ASK_PICKUP_TIME: "A que *horas* prefere levantar o carro?",
      ASK_GROUP: "Quantas pessoas e malas vão na viagem?",
      SHOW_FLEET: "Qual carro prefere? Escreva o modelo ou tipo (ex: _SUV_, _Clio_) — ou toque no cartão da foto.",
      ASK_PROTECTION: "Prefere *Franquia ZERO* ou *Standard*?",
      SHOW_TERMS: "Leia as condições e responda *ACEITO* quando concordar.",
      SHOW_QUOTE: "Revise o orçamento e escreva *ACEITO* para pagar o sinal de €50.",
      PAYMENT: "Falta só o *sinal de €50* para confirmar a reserva.",
      DOCS: "Envie fotos do passaporte e da carta de condução.",
      PHOTOS: "Envie as 4 fotos do carro no levantamento.",
    },
    en: {
      GREETING: "Tell me your *full name* to start.",
      ASK_PHONE: "Your *mobile number*?",
      ASK_PICKUP: `When do you need the car${name}?`,
      ASK_PICKUP_LOCATION: "Pick-up *location*?",
      ASK_FLIGHT: "Flight *arrival time*?",
      ASK_DURATION: "How many *days*?",
      ASK_RETURN: "*Return date*?",
      ASK_PICKUP_TIME: "*Pick-up time*?",
      ASK_GROUP: "How many travellers and bags?",
      SHOW_FLEET: "Which car do you prefer?",
      ASK_PROTECTION: "*ZERO excess* or *Standard*?",
      SHOW_TERMS: "Read and accept the agreement.",
      SHOW_QUOTE: "Review the quote and accept to pay the deposit.",
      PAYMENT: "Pay the *€50 deposit* to confirm.",
      DOCS: "Send passport and licence photos.",
      PHOTOS: "Send 4 car photos.",
    },
    fr: {
      GREETING: "Votre *nom complet*?",
      ASK_PHONE: "Votre *numéro de mobile*?",
      ASK_PICKUP: "Date de prise en charge?",
      ASK_PICKUP_LOCATION: "Lieu de *prise en charge*?",
      ASK_FLIGHT: "Heure d'*arrivée du vol*?",
      ASK_DURATION: "Nombre de *jours*?",
      ASK_RETURN: "Date de retour?",
      ASK_PICKUP_TIME: "Heure?",
      ASK_GROUP: "Voyageurs et bagages?",
      SHOW_FLEET: "Quel véhicule?",
      ASK_PROTECTION: "Franchise ZÉRO ou Standard?",
      SHOW_TERMS: "Acceptez le contrat.",
      SHOW_QUOTE: "Validez le devis.",
      PAYMENT: "Acompte 50€.",
      DOCS: "Documents.",
      PHOTOS: "Photos.",
    },
    es: {
      GREETING: "Su *nombre completo*?",
      ASK_PHONE: "Su *móvil*?",
      ASK_PICKUP: "¿Fecha de recogida?",
      ASK_PICKUP_LOCATION: "¿Lugar de *recogida*?",
      ASK_FLIGHT: "¿Hora de *llegada del vuelo*?",
      ASK_DURATION: "¿Cuántos *días*?",
      ASK_RETURN: "¿Fecha de devolución?",
      ASK_PICKUP_TIME: "¿Hora?",
      ASK_GROUP: "¿Personas y equipaje?",
      SHOW_FLEET: "¿Qué vehículo?",
      ASK_PROTECTION: "¿Franquicia CERO o Standard?",
      SHOW_TERMS: "Acepte el contrato.",
      SHOW_QUOTE: "Acepte el presupuesto.",
      PAYMENT: "Depósito 50€.",
      DOCS: "Documentos.",
      PHOTOS: "Fotos.",
    },
    de: {
      GREETING: "Ihr *vollständiger Name*?",
      ASK_PHONE: "Ihre *Handynummer*?",
      ASK_PICKUP: "Abholdatum?",
      ASK_PICKUP_LOCATION: "*Abholort*?",
      ASK_FLIGHT: "*Ankunftszeit* des Flugs?",
      ASK_DURATION: "Wie viele *Tage*?",
      ASK_RETURN: "Rückgabedatum?",
      ASK_PICKUP_TIME: "Abholzeit?",
      ASK_GROUP: "Personen und Gepäck?",
      SHOW_FLEET: "Welches Fahrzeug?",
      ASK_PROTECTION: "ZERO oder Standard?",
      SHOW_TERMS: "Vertrag akzeptieren.",
      SHOW_QUOTE: "Angebot prüfen.",
      PAYMENT: "50€ Anzahlung.",
      DOCS: "Dokumente.",
      PHOTOS: "Fotos.",
    },
  };
  return bridges[lang]?.[step] ?? getStepReminder(step, lang, { name: ctx.name });
}

export function getAskPickupHuman(lang: ChatLang, name: string): string {
  const lines: Record<ChatLang, string> = {
    pt: `Obrigada, *${name}*! Para quando precisa do carro na Madeira? Escreva à vontade: _amanhã_, _25/05_, _sábado_, _daqui a 3 dias_…`,
    en: `Thanks, *${name}*! When do you need the car in Madeira? Type freely: _tomorrow_, _25/05_, _next Saturday_…`,
    fr: `Merci, *${name}*! Pour quand avez-vous besoin de la voiture?`,
    es: `Gracias, *${name}*! ¿Para cuándo necesita el coche?`,
    de: `Danke, *${name}*! Wann brauchen Sie das Auto?`,
  };
  return lines[lang] ?? lines.pt;
}

export function getAskDurationHuman(lang: ChatLang, pickup: string): string {
  const lines: Record<ChatLang, string> = {
    pt: `Levantamento *${pickup}*, perfeito. Quantos *dias* vai precisar do carro? _(ex: 5 dias, uma semana)_`,
    en: `Pick-up *${pickup}*, great. How many *days* do you need the car? _(e.g. 5 days, one week)_`,
    fr: `Prise *${pickup}*. Combien de *jours*?`,
    es: `Recogida *${pickup}*. ¿Cuántos *días*?`,
    de: `Abholung *${pickup}*. Wie viele *Tage*?`,
  };
  return lines[lang] ?? lines.pt;
}

export function getDurationConfirmedHuman(
  lang: ChatLang,
  days: number,
  pickup: string,
  ret: string,
): string {
  const lines: Record<ChatLang, string> = {
    pt: `Combinado: *${days} dia(s)* (${pickup} a ${ret}). A que horas quer levantar? _(ex: 10h, 14:30, de manhã)_`,
    en: `So *${days} day(s)* (${pickup} to ${ret}). What time for pick-up? _(e.g. 10am, 2:30pm)_`,
    fr: `*${days} jour(s)* (${pickup} au ${ret}). À quelle heure?`,
    es: `*${days} día(s)* (${pickup} al ${ret}). ¿A qué hora?`,
    de: `*${days} Tag(e)* (${pickup} bis ${ret}). Abholzeit?`,
  };
  return lines[lang] ?? lines.pt;
}

export function getFleetIntroHuman(lang: ChatLang, count: number, days: number): string {
  const lines: Record<ChatLang, string> = {
    pt: `Encontrei *${count} carros* livres para os seus ${days} dia(s). Diga qual prefere _(Clio, SUV, Golf…)_ ou toque só no cartão com foto.`,
    en: `I found *${count} cars* for your ${days} day(s). Tell me which you prefer _(Clio, SUV, Golf…)_ or tap a photo card only.`,
    fr: `*${count} véhicules* disponibles pour ${days} jour(s).`,
    es: `*${count} coches* para ${days} día(s).`,
    de: `*${count} Fahrzeuge* für ${days} Tag(e).`,
  };
  return lines[lang] ?? lines.pt;
}

export function getVehicleChosenHuman(lang: ChatLang, vehicle: string): string {
  const lines: Record<ChatLang, string> = {
    pt: `Excelente, *${vehicle}* 🚗\n\nQual proteção prefere?\n• *Franquia ZERO*, mais tranquilidade, sem bloqueio de caução\n• *Standard*, preço base mais baixo, caução no cartão (libertada sem danos)`,
    en: `Great choice, *${vehicle}* 🚗\n\nWhich protection?\n• *ZERO excess*, no deposit hold\n• *Standard*, lower daily rate, card deposit released if no damage`,
    fr: `*${vehicle}* 🚗, Franchise ZÉRO ou Standard?`,
    es: `*${vehicle}* 🚗, ¿Franquicia CERO o Standard?`,
    de: `*${vehicle}* 🚗, ZERO oder Standard?`,
  };
  return lines[lang] ?? lines.pt;
}

export function getGenericQuestionReply(lang: ChatLang, analysis: AnalyzeResult, step: string, ctx: HumanCtx): string {
  const faq = composeFaqWithBridge("help_menu", lang, step, ctx);
  if (analysis.isQuestion && !analysis.faqTopic) return faq;
  return getStepBridge(lang, step, ctx) || getStepReminder(step, lang, { name: ctx.name });
}
