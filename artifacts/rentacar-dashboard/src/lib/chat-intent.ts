import {
  type ChatLang,
  detectLanguage,
  isLanguageOnlyInput,
  localeFor,
  parseDaysFromText,
  pickupTimeOptions,
  quickDates,
  t,
} from "./chat-i18n";

export type FaqTopic =
  | "help_menu"
  | "deposit"
  | "cancel"
  | "fuel"
  | "age"
  | "insurance"
  | "km"
  | "airport"
  | "contract"
  | "price"
  | "protection"
  | "documents"
  | "payment"
  | "second_driver"
  | "hours";

export type ProtectionChoice = "franquia_zero" | "standard_com_caucao";

export type ExtractedEntities = {
  name?: string;
  pickupDate?: Date;
  returnDate?: Date;
  days?: number;
  pickupTimeLabel?: string;
  protection?: ProtectionChoice;
  vehicleCategory?: "Economico" | "Familiar" | "SUV" | "Premium";
  vehicleModelHint?: string;
  wantsFaq?: boolean;
};

export type AnalyzeResult = {
  lang: ChatLang;
  faqTopic: FaqTopic | null;
  entities: ExtractedEntities;
  isQuestion: boolean;
  isGreeting: boolean;
  isAffirmative: boolean;
  isNegative: boolean;
};

const FAQ_PATTERNS: Record<FaqTopic, RegExp[]> = {
  help_menu: [
    /\b(ajuda|help|faq|dúvidas|duvidas|perguntas|menu|opções|options)\b/i,
    /\b(o que posso|what can i|que puis-je)\b/i,
  ],
  deposit: [
    /\b(cau[cç][aã]o|deposit|deposito|depósito|caution|kaution|bloqueio|hold)\b/i,
    /\b(quanto.*bloqueia|how much.*hold)\b/i,
  ],
  cancel: [
    /\b(cancelar|cancel|annuler|stornieren|reembolso|refund)\b/i,
    /\b(desistir|desisto)\b/i,
  ],
  fuel: [
    /\b(combust[ií]vel|fuel|gasolina|gas|diesel|plein|tanken|llenar)\b/i,
    /\b(cheio\/cheio|full\/full)\b/i,
  ],
  age: [
    /\b(idade|age|âge|alter|edad|jahre|anos)\b/i,
    /\b(condutor jovem|young driver)\b/i,
    /\b(carta|licen[cs]a|license|permit|condução)\b/i,
  ],
  insurance: [
    /\b(seguro|insurance|assurance|versicherung|prote[cç][aã]o|coverage)\b/i,
    /\b(franquia|excess|deductible|franchise)\b/i,
  ],
  km: [
    /\b(km|quilometr|mileage|kilom|unlimited|ilimitad)\b/i,
  ],
  airport: [
    /\b(aeroporto|airport|aéroport|flughafen|voo|flight|atraso|delay|funchal|fnc)\b/i,
  ],
  contract: [
    /\b(contrato|contract|contrat|vertrag|termos|terms|condi[cç][õo]es)\b/i,
  ],
  price: [
    /\b(pre[cç]o|price|prix|preis|custo|cost|quanto custa|how much|orçamento|quote|tarifa)\b/i,
    /\b(barato|cheap|caro|expensive|desconto|discount)\b/i,
  ],
  protection: [
    /\b(franquia zero|zero excess|sem cau[cç][aã]o|without deposit)\b/i,
    /\b(standard|com cau[cç][aã]o|with deposit)\b/i,
  ],
  documents: [
    /\b(documentos|documents|passaporte|passport|bi\b|carta|license|upload|enviar foto)\b/i,
  ],
  payment: [
    /\b(pagamento|payment|pagar|pay|stripe|revolut|cart[aã]o|card|sinal|deposito de reserva)\b/i,
  ],
  second_driver: [
    /\b(segundo condutor|second driver|2[ºo] condutor|additional driver|condutor extra)\b/i,
  ],
  hours: [
    /\b(hor[aá]rio|hours|horaires|öffnungs|abertura|fecho|open|close|noturna)\b/i,
  ],
};

const QUESTION_HINT = /\?|^(como|what|how|why|when|where|qual|quanto|can i|posso|peut|kann|puedo)\b/i;

const AFFIRMATIVE =
  /^(sim|yes|ok|okay|claro|sure|oui|ja|sí|si|confirmo|confirm|aceito|accept|✅|vamos|bora|pode ser|perfecto|perfect|ótimo|otimo|fixe|dale|genial|está bem|esta bem|tudo bem|isso|exato|exacto|correcto|correto)\b/i;
const NEGATIVE = /^(não|nao|no|nope|cancel|annul|nein|agora não|agora nao|depois)\b/i;

const CATEGORY_MAP: Record<string, ExtractedEntities["vehicleCategory"]> = {
  suv: "SUV",
  jeep: "SUV",
  economico: "Economico",
  economic: "Economico",
  cheap: "Economico",
  barato: "Economico",
  familiar: "Familiar",
  family: "Familiar",
  premium: "Premium",
  luxo: "Premium",
  luxury: "Premium",
  bmw: "Premium",
  mercedes: "Premium",
};

function normalize(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function extractName(text: string): string | undefined {
  if (isLanguageOnlyInput(text)) return undefined;
  if (detectFaq(text) || QUESTION_HINT.test(text)) return undefined;
  const patterns = [
    /(?:chamo-me|sou (?:o|a)|my name is|i'?m|i am|je m'appelle|je suis|me llamo|soy|ich hei[sß]e|ich bin)\s+([a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ\s'-]{1,40})/i,
    /(?:nome|name)\s*(?:é|:)\s*([a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ\s'-]{1,40})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1].trim().replace(/\s+/g, " ");
  }
  if (/^(hi|hello|ol[aá]|hola|bonjour|hallo)\b/i.test(text)) return undefined;
  const words = text.trim().split(/\s+/);
  const skip = new Set([
    "hi", "hello", "ola", "olá", "hola", "bonjour", "hallo", "hey", "preciso", "quero", "need",
    "want", "carro", "car", "rent", "alugar", "reserva", "booking",
    "pt", "en", "fr", "es", "de", "por", "eng", "fra", "esp", "deu",
    "português", "portugues", "english", "français", "francais", "español", "espanol", "deutsch",
  ]);
  const filtered = words.filter((w) => !skip.has(w.toLowerCase()) && !/\d/.test(w));
  if (filtered.length >= 1 && filtered.length <= 4 && !/\?/.test(text)) {
    const candidate = filtered.join(" ");
    if (candidate.length >= 2 && candidate.length <= 48 && /[a-zA-ZÀ-ÿ]{2,}/.test(candidate)) {
      const titled = candidate
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      if (titled.length >= 2) return titled;
    }
  }
  return undefined;
}

function parseDateInput(text: string, base: Date, lang: ChatLang): Date | null {
  const lower = text.toLowerCase();
  const todayWords = [t(lang, "today").toLowerCase(), "today", "hoy", "heute", "aujourd"];
  const tomorrowWords = [t(lang, "tomorrow").toLowerCase(), "tomorrow", "mañana", "morgen", "demain"];
  if (todayWords.some((w) => lower.includes(w))) return new Date(base);
  if (tomorrowWords.some((w) => lower.includes(w))) return addDays(base, 1);
  if (/depois de amanhã|day after tomorrow/.test(lower)) return addDays(base, 2);
  if (lower.includes("semana") || lower.includes("week") || lower.includes("semaine")) return addDays(base, 7);

  const monthsPt: Record<string, number> = {
    janeiro: 0, fevereiro: 1, março: 2, marco: 2, abril: 3, maio: 4, junho: 5,
    julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
  };
  const monthMatch = lower.match(/(\d{1,2})\s*(?:de\s+)?([a-záéíóúãç]+)/);
  if (monthMatch && monthsPt[monthMatch[2]]) {
    const d = new Date(base.getFullYear(), monthsPt[monthMatch[2]], parseInt(monthMatch[1], 10));
    if (!isNaN(d.getTime())) return d;
  }

  const parts = text.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
  if (parts) {
    const year = parts[3] ? parseInt(parts[3], 10) : base.getFullYear();
    const d = new Date(year < 100 ? year + 2000 : year, parseInt(parts[2], 10) - 1, parseInt(parts[1], 10));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function detectFaq(text: string): FaqTopic | null {
  const lower = text.toLowerCase();
  let best: FaqTopic | null = null;
  let bestScore = 0;
  for (const [topic, patterns] of Object.entries(FAQ_PATTERNS) as [FaqTopic, RegExp[]][]) {
    let score = 0;
    for (const re of patterns) {
      if (re.test(lower)) score += 2;
    }
    if (QUESTION_HINT.test(text)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }
  if (bestScore >= 2) return best;
  if (QUESTION_HINT.test(text) && bestScore >= 1) return best;
  return null;
}

function detectProtection(text: string): ProtectionChoice | undefined {
  if (/franquia\s*zero|zero\s*excess|sem\s*cau|without\s*deposit|ohne\s*kaution/i.test(text)) {
    return "franquia_zero";
  }
  if (/standard|com\s*cau|with\s*deposit|mit\s*kaution/i.test(text)) return "standard_com_caucao";
  return undefined;
}

function detectCategory(text: string): ExtractedEntities["vehicleCategory"] | undefined {
  const lower = text.toLowerCase();
  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(lower)) return cat;
  }
  return undefined;
}

function detectPickupTime(text: string, lang: ChatLang): string | undefined {
  const slots = pickupTimeOptions(lang);
  const lower = text.toLowerCase();
  if (/08|09|10|manh[ãa]|morning|morgen|matin/.test(lower)) return slots[0];
  if (/14|15|16|tarde|afternoon|après-midi|nachmittag/.test(lower)) return slots[2] ?? slots[1];
  if (/18|19|20|21|22|noite|evening|soir|abend|noturn/i.test(lower)) return slots[3] ?? slots[slots.length - 1];
  const hm = text.match(/\b(\d{1,2})[h:](\d{2})?\b/);
  if (hm) {
    const h = parseInt(hm[1], 10);
    if (h < 12) return slots[0];
    if (h < 16) return slots[1];
    return slots[2] ?? slots[1];
  }
  const exact = slots.find((s) => text.toLowerCase().includes(s.slice(0, 8).toLowerCase()));
  return exact;
}

function matchQuickDateLabel(text: string, lang: ChatLang, now: Date): Date | null {
  const qd = quickDates(lang);
  const match = qd.find((d) => text.toLowerCase().includes(d.label.toLowerCase()));
  if (match) return addDays(now, match.days);
  return null;
}

export function analyzeMessage(text: string, langHint?: ChatLang): AnalyzeResult {
  const raw = normalize(text);
  const lang = langHint ?? detectLanguage(raw);
  const entities: ExtractedEntities = {};
  const now = new Date();

  const faqTopic = detectFaq(raw);
  if (faqTopic === "help_menu") entities.wantsFaq = true;

  const name = extractName(raw);
  if (name) entities.name = name;

  const days = parseDaysFromText(raw);
  if (days) entities.days = days;

  const pickup =
    parseDateInput(raw, now, lang) ?? matchQuickDateLabel(raw, lang, now);
  if (pickup) entities.pickupDate = pickup;

  if (days && pickup) entities.returnDate = addDays(pickup, days);

  const returnOnly = parseDateInput(raw, now, lang);
  if (returnOnly && !days) entities.returnDate = returnOnly;

  const prot = detectProtection(raw);
  if (prot) entities.protection = prot;

  const cat = detectCategory(raw);
  if (cat) entities.vehicleCategory = cat;

  const time = detectPickupTime(raw, lang);
  if (time) entities.pickupTimeLabel = time;

  const modelHint = raw.match(
    /\b(renault|clio|golf|bmw|qashqai|nissan|mercedes|vw|volkswagen)\b/i,
  );
  if (modelHint) entities.vehicleModelHint = modelHint[1];

  return {
    lang,
    faqTopic,
    entities,
    isQuestion: QUESTION_HINT.test(raw) || !!faqTopic,
    isGreeting:
      /^(hi|hello|hey|ol[aá]|hola|bonjour|hallo|bom dia|boa tarde|boa noite|buenos|buenas|tudo bem|td bem|e aí|e ai|salut)\b/i.test(
        raw,
      ) || /^(ol[aá]|hi|hey)[\s!.,?]*$/i.test(raw),
    isAffirmative: AFFIRMATIVE.test(raw),
    isNegative: NEGATIVE.test(raw),
  };
}

export function getFaqAnswer(topic: FaqTopic, lang: ChatLang, ctx?: { caucao?: number }): string {
  const caucao = ctx?.caucao ?? 1200;
  const map = FAQ_ANSWERS[lang] ?? FAQ_ANSWERS.pt;
  return (map[topic] ?? map.help_menu).replace(/\{caucao\}/g, String(caucao));
}

const FAQ_ANSWERS: Record<ChatLang, Record<FaqTopic, string>> = {
  pt: {
    help_menu:
      "Pode perguntar o que quiser, caução, cancelamento, combustível, idade mínima, franquia zero vs standard, documentos, pagamento, aeroporto…\n\nExemplos: _«Quanto é a caução?»_, _«Posso cancelar?»_, _«Cheio/cheio?»_",
    deposit:
      "Na *Standard*, bloqueamos até *€{caucao}* no cartão, é só garantia, libertada em 5 a 7 dias úteis se o carro voltar sem danos.\n\nNa *Franquia ZERO* não há esse bloqueio; paga um extra por dia e fica mais descansado.",
    cancel:
      "❌ *Cancelamento:* gratuito até *48 horas* antes do levantamento. Depois disso: 50% do valor ou crédito para nova data (conforme contrato).",
    fuel: "⛽ *Combustível:* política *Cheio/Cheio*, devolva com o mesmo nível. Caso contrário aplicamos reabastecimento + taxa de serviço.",
    age: "👤 *Condutor:* mínimo *21 anos* e carta válida há mais de 1 ano. Condutores 21 a 23 podem ter taxa jovem adicional.",
    insurance:
      "🛡️ *Seguro:* incluímos responsabilidade civil (mín. legal). *Franquia ZERO* reduz a sua responsabilidade em danos, *Standard* usa caução no cartão.",
    km: "🛣️ *Quilometragem:* *ilimitada* na ilha da Madeira durante o período de aluguer.",
    airport:
      "✈️ *Aeroporto Funchal:* podemos alinhar levantamento com o voo. Se o voo atrasar, avise-nos pelo WhatsApp, reprogramamos sem stress.",
    contract:
      "📄 *Contrato:* após confirmação enviamos por email. Inclui datas, proteção, combustível, km e regras de utilização.",
    price:
      "💰 O preço depende do *veículo*, *número de dias* e *proteção*. No final do fluxo recebe um orçamento detalhado com referência de contrato.",
    protection:
      "🛡️ *Franquia ZERO*, sem caução, mais tranquilidade.\n💳 *Standard*, caução €{caucao}, preço base mais baixo por dia.",
    documents: "📎 *Pré-check-in:* passaporte/BI + carta de condução (fotos nítidas). A nossa IA valida em segundos.",
    payment: "💳 *Pagamento:* sinal de €50 para confirmar reserva (Stripe/Revolut). O restante paga no balcão no levantamento.",
    second_driver: "👥 *2º condutor:* gratuito na maioria dos planos, basta enviar dados ou foto da carta.",
    hours: "🕐 *Horário loja:* 08:00 a 22:00. Fora deste horário pode aplicar-se *taxa noturna* (indicada no orçamento).",
  },
  en: {
    help_menu:
      "🤖 *Autocunha Help*\n\nAsk me anything, e.g. deposit, cancellation, fuel, age, protection, documents.\nIn production our AI answers *any* question 24/7.",
    deposit:
      "💳 *Deposit (Standard plan):* up to *€{caucao}* card hold, released within 5 to 7 business days after return if no damage. *ZERO excess* = no deposit hold.",
    cancel: "❌ *Cancellation:* free up to *48 hours* before pick-up.",
    fuel: "⛽ *Fuel:* Full/Full policy.",
    age: "👤 *Driver:* min. 21, licence 1+ year.",
    insurance: "🛡️ Liability included. ZERO excess vs Standard deposit.",
    km: "🛣️ *Unlimited* mileage on Madeira.",
    airport: "✈️ We can align with Funchal flights; tell us if delayed.",
    contract: "📄 Full contract by email after booking.",
    price: "💰 Price depends on car, days and protection, quote at end of flow.",
    protection: "🛡️ ZERO excess or Standard with €{caucao} deposit.",
    documents: "📎 Passport + driving licence photos for AI pre-check-in.",
    payment: "💳 €50 deposit to confirm; balance at desk.",
    second_driver: "👥 Second driver often free.",
    hours: "🕐 Shop 08:00 to 22:00; out-of-hours fee may apply.",
  },
  fr: {
    help_menu: "🤖 *Aide Autocunha*, posez vos questions (caution, annulation, carburant…). IA 24/7 en production.",
    deposit: "💳 *Caution Standard:* jusqu'à *€{caucao}*. Franchise ZÉRO sans blocage.",
    cancel: "❌ Annulation gratuite jusqu'à 48h avant.",
    fuel: "⛽ Plein/Plein.",
    age: "👤 21 ans minimum.",
    insurance: "🛡️ RC incluse. Franchise ZÉRO ou Standard.",
    km: "🛣️ Km illimités (Madère).",
    airport: "✈️ Aéroport Funchal, coordination vol.",
    contract: "📄 Contrat par email.",
    price: "💰 Devis selon véhicule et durée.",
    protection: "🛡️ Franchise ZÉRO ou caution €{caucao}.",
    documents: "📎 Passeport + permis.",
    payment: "💳 Acompte 50€.",
    second_driver: "👥 2e conducteur souvent gratuit.",
    hours: "🕐 Ouverture 08h00 à 22h00; supplément possible hors horaires.",
  },
  es: {
    help_menu: "🤖 *Ayuda Autocunha*, pregunte lo que quiera. IA 24/7 en producción.",
    deposit: "💳 *Depósito Standard:* hasta *€{caucao}*. Franquicia CERO sin bloqueo.",
    cancel: "❌ Cancelación gratuita hasta 48h antes.",
    fuel: "⛽ Lleno/Lleno.",
    age: "👤 Mínimo 21 años.",
    insurance: "🛡️ RC incluido.",
    km: "🛣️ Km ilimitados.",
    airport: "✈️ Aeropuerto Funchal.",
    contract: "📄 Contrato por email.",
    price: "💰 Según vehículo y días.",
    protection: "🛡️ Franquicia CERO o depósito.",
    documents: "📎 Pasaporte y carnet.",
    payment: "💳 Depósito 50€.",
    second_driver: "👥 2º conductor gratis.",
    hours: "🕐 Horario 08:00 a 22:00; puede aplicarse suplemento fuera de horario.",
  },
  de: {
    help_menu: "🤖 *Autocunha Hilfe*, fragen Sie frei. KI 24/7 in Produktion.",
    deposit: "💳 *Kaution Standard:* bis *€{caucao}*. ZERO ohne Hold.",
    cancel: "❌ Stornierung bis 48h kostenlos.",
    fuel: "⛽ Voll/Voll.",
    age: "👤 Mindestens 21.",
    insurance: "🛡️ Haftpflicht inkl.",
    km: "🛣️ Unbegrenzte km.",
    airport: "✈️ Flughafen Funchal.",
    contract: "📄 Vertrag per E-Mail.",
    price: "💰 Nach Fahrzeug und Tagen.",
    protection: "🛡️ ZERO oder Kaution.",
    documents: "📎 Ausweis + Führerschein.",
    payment: "💳 50€ Anzahlung.",
    second_driver: "👥 2. Fahrer oft gratis.",
    hours: "🕐 Öffnungszeiten 08:00 bis 22:00; Zuschlag außerhalb möglich.",
  },
};

// fix - I used T_FAQ_PT by mistake in getFaqAnswer - already using FAQ_ANSWERS

export function getStepReminder(
  step: string,
  lang: ChatLang,
  vars?: { name?: string; pickup?: string; days?: number },
): string {
  const key = `reminder_${step}` as string;
  const reminders: Record<ChatLang, Record<string, string>> = {
    pt: {
      GREETING: "Quando quiser, diga o seu *nome* para começarmos a reserva.",
      ASK_PICKUP: "Indique a *data de levantamento* (ex: amanhã, 25/05) ou use os botões.",
      ASK_DURATION: "Quantos *dias* de aluguer pretende? Pode escrever «7 dias» ou escolher acima.",
      ASK_RETURN: "Qual a *data de devolução*? Formato DD/MM.",
      ASK_PICKUP_TIME: "Escolha a *hora de levantamento* ou escreva (ex: 10h).",
      ASK_GROUP: "Quantas pessoas e malas? Escolha uma opção.",
      SHOW_FLEET: "Diga o carro (ex: SUV, Clio) ou toque no cartão com foto.",
      ASK_PROTECTION: "Escreva *franquia zero* ou *standard*.",
      SHOW_TERMS: "Leia as condições e responda *ACEITO*.",
      SHOW_QUOTE: "Revise o orçamento e escreva *ACEITO*.",
      PAYMENT: "Toque em *Pagar sinal* ou escreva que quer pagar.",
      DOCS: "Toque em *Enviar documentos* para a IA validar o passaporte/carta.",
      PHOTOS: "Envie as 4 fotos do carro com o botão.",
      ACTIVE: "Reserva ativa, use *SOS* só em emergência. Pode fazer mais perguntas!",
    },
    en: {
      GREETING: "Tell me your *name* to start.",
      ASK_PICKUP: "Pick-up *date* (e.g. tomorrow) or use buttons.",
      ASK_DURATION: "How many *days*? Type «7 days» or pick above.",
      ASK_RETURN: "*Return date* DD/MM.",
      ASK_PICKUP_TIME: "Pick-up *time* or type e.g. 10am.",
      ASK_GROUP: "Travellers and luggage?",
      SHOW_FLEET: "Pick a car below or say «SUV» / «Golf».",
      ASK_PROTECTION: "*ZERO excess* or *Standard*?",
      SHOW_TERMS: "Accept the rental agreement to continue.",
      SHOW_QUOTE: "Review quote and accept.",
      PAYMENT: "Pay deposit to confirm.",
      DOCS: "Send passport + licence photos.",
      PHOTOS: "Send 4 car photos.",
      ACTIVE: "Trip active, ask me anything!",
    },
    fr: {
      GREETING: "Votre *nom* pour commencer.",
      ASK_PICKUP: "Date de prise en charge.",
      ASK_DURATION: "Nombre de *jours*?",
      ASK_RETURN: "Date de retour.",
      ASK_PICKUP_TIME: "Heure de prise en charge.",
      ASK_GROUP: "Voyageurs et bagages.",
      SHOW_FLEET: "Choisissez un véhicule.",
      ASK_PROTECTION: "Franchise ZÉRO ou Standard?",
      SHOW_TERMS: "Acceptez le contrat.",
      SHOW_QUOTE: "Validez le devis.",
      PAYMENT: "Payez l'acompte.",
      DOCS: "Envoyez les documents.",
      PHOTOS: "Envoyez les photos.",
      ACTIVE: "Location active.",
    },
    es: {
      GREETING: "Su *nombre* para empezar.",
      ASK_PICKUP: "Fecha de recogida.",
      ASK_DURATION: "¿Cuántos *días*?",
      ASK_RETURN: "Fecha de devolución.",
      ASK_PICKUP_TIME: "Hora de recogida.",
      ASK_GROUP: "Personas y equipaje.",
      SHOW_FLEET: "Elija vehículo.",
      ASK_PROTECTION: "Franquicia CERO o Standard.",
      SHOW_TERMS: "Acepte el contrato.",
      SHOW_QUOTE: "Acepte presupuesto.",
      PAYMENT: "Pague depósito.",
      DOCS: "Envíe documentos.",
      PHOTOS: "Envíe fotos.",
      ACTIVE: "Viaje activo.",
    },
    de: {
      GREETING: "Ihr *Name* bitte.",
      ASK_PICKUP: "Abholdatum.",
      ASK_DURATION: "Wie viele *Tage*?",
      ASK_RETURN: "Rückgabedatum.",
      ASK_PICKUP_TIME: "Abholzeit.",
      ASK_GROUP: "Personen und Gepäck.",
      SHOW_FLEET: "Fahrzeug wählen.",
      ASK_PROTECTION: "ZERO oder Standard?",
      SHOW_TERMS: "Vertrag akzeptieren.",
      SHOW_QUOTE: "Angebot prüfen.",
      PAYMENT: "Anzahlung.",
      DOCS: "Dokumente senden.",
      PHOTOS: "Fotos senden.",
      ACTIVE: "Miete aktiv.",
    },
  };
  return reminders[lang]?.[step] ?? reminders.pt[step] ?? "";
}

export function getAiAck(
  lang: ChatLang,
  kind: "understood" | "parsed_dates" | "parsed_name" | "parsed_vehicle",
  vars?: Record<string, string | number>,
): string {
  const keys: Record<string, string> = {
    understood: "aiAckUnderstood",
    parsed_dates: "aiAckDates",
    parsed_name: "aiAckName",
    parsed_vehicle: "aiAckVehicle",
  };
  return t(lang, keys[kind], vars);
}

export function formatDateShort(d: Date, lang: ChatLang) {
  return d.toLocaleDateString(localeFor(lang), { day: "2-digit", month: "2-digit", year: "numeric" });
}

export { parseDateInput, addDays, matchQuickDateLabel };

export function findVehicleInFleet(
  fleet: { id: number; marca_modelo: string; categoria: string }[],
  entities: ExtractedEntities,
) {
  if (!fleet.length) return null;
  if (entities.vehicleModelHint) {
    const hint = entities.vehicleModelHint.toLowerCase();
    const v = fleet.find((f) => f.marca_modelo.toLowerCase().includes(hint));
    if (v) return v;
  }
  if (entities.vehicleCategory) {
    const v = fleet.find((f) => f.categoria === entities.vehicleCategory);
    if (v) return v;
  }
  return null;
}
