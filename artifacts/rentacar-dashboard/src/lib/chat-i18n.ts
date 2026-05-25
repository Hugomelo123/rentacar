export type ChatLang = "pt" | "en" | "fr" | "es" | "de";

export const LANG_OPTIONS: { lang: ChatLang; label: string; aliases: RegExp[] }[] = [
  { lang: "pt", label: "🇵🇹 Português", aliases: [/^🇵🇹/i, /portugu[eê]s/i, /\b(pt|por)\b/i] },
  { lang: "en", label: "🇬🇧 English", aliases: [/^🇬🇧/i, /english/i, /\b(en|eng)\b/i] },
  { lang: "fr", label: "🇫🇷 Français", aliases: [/^🇫🇷/i, /fran[cç]ais/i, /\b(fr|fra)\b/i] },
  { lang: "es", label: "🇪🇸 Español", aliases: [/^🇪🇸/i, /espa[nñ]ol/i, /\b(es|esp)\b/i] },
  { lang: "de", label: "🇩🇪 Deutsch", aliases: [/^🇩🇪/i, /deutsch/i, /\b(de|deu)\b/i] },
];

export function languageOptionLabels(): string[] {
  return LANG_OPTIONS.map((o) => o.label);
}

export function parseLanguageFromChoice(text: string): ChatLang | null {
  const raw = text.trim();
  for (const opt of LANG_OPTIONS) {
    if (raw === opt.label) return opt.lang;
    if (opt.aliases.some((re) => re.test(raw))) return opt.lang;
  }
  return null;
}

const GREETING_PATTERNS: Record<ChatLang, RegExp[]> = {
  en: [/\b(hi|hello|hey|good\s*(morning|afternoon|evening)|my\s*name is|i'?m\b)/i],
  fr: [/\b(bonjour|salut|bonsoir|je\s*m'appelle|je\s*mapelle)\b/i],
  es: [/\b(hola|buenos\s*d[ií]as|buenas\s*tardes|me\s*llamo)\b/i],
  de: [/\b(hallo|guten\s*(tag|morgen|abend)|ich\s*hei[sß]e)\b/i],
  pt: [/\b(ol[aá]|bom\s*dia|boa\s*tarde|boa\s*noite|chamo-me|sou\s*o|sou\s*a|preciso|quero)\b/i],
};

/** Deteção conservadora: mercado principal PT (Madeira). Evita confundir PT com FR por acentos. */
export function detectLanguage(text: string): ChatLang {
  const fromChoice = parseLanguageFromChoice(text);
  if (fromChoice) return fromChoice;

  const raw = text.trim();
  if (!raw) return "pt";

  if (/ã|õ|ção|ções|não|nao|obrigad|amanhã|amanha|preciso de|quero um|madeira|funchal/i.test(raw)) {
    return "pt";
  }
  if (/[äöüß]/i.test(raw)) return "de";
  if (/[ñ¿¡]/i.test(raw) || /\b(hola|gracias|mañana)\b/i.test(raw)) return "es";
  if (/\b(bonjour|merci|salut|français)\b/i.test(raw)) return "fr";

  for (const lang of ["en", "fr", "es", "de", "pt"] as ChatLang[]) {
    if (GREETING_PATTERNS[lang].some((re) => re.test(raw))) return lang;
  }

  return "pt";
}

/** Apresentação neutra (cliente abriu pelo link WhatsApp, antes de escolher idioma) */
export function getLinkWelcomeIntro(): string {
  return (
    "👋 *Autocunha Rent-a-Car*\n" +
    "Aluguer de viaturas na *Ilha da Madeira* (Funchal e Aeroporto)\n" +
    "Car rental on *Madeira Island* (Funchal and Airport)\n\n" +
    "Somos uma empresa local com anos de experiência a receber turistas e residentes. " +
    "Levantamento na loja em Funchal ou no aeroporto (FNC), com frota para família, negócios e estradas da ilha.\n\n" +
    "A assistente *Sofia* trata da reserva *por aqui no WhatsApp*, antes do balcão: datas, viatura, proteção, contrato e documentos. " +
    "No balcão fica sobretudo entregar as chaves, para poupar tempo na chegada."
  );
}

/** Pedido de idioma (sempre após a apresentação) */
export function getLinkLanguagePrompt(): string {
  return (
    "🌍 *Em que idioma prefere que eu fale consigo?*\n" +
    "*Which language would you like me to use?*\n\n" +
    "Responda por escrito, por exemplo: *português*, *english*, *français*, *español* ou *deutsch* (também aceito PT, EN, FR, ES, DE)."
  );
}

/** @deprecated Use getLinkWelcomeIntro + getLinkLanguagePrompt */
export function getLinkWelcomeMessage(): string {
  return `${getLinkWelcomeIntro()}\n\n${getLinkLanguagePrompt()}`;
}

export function langBadge(code: ChatLang | string | null | undefined): string {
  if (!code) return "PT";
  const c = String(code).toLowerCase().slice(0, 2);
  return c.toUpperCase();
}

const AI_LOADING: Record<ChatLang, string[]> = {
  pt: [
    "IA a ler documento...",
    "A extrair dados do passaporte...",
    "A validar regras de segurança...",
    "A cruzar informação com a reserva...",
  ],
  en: [
    "AI reading document...",
    "Extracting passport data...",
    "Validating security rules...",
    "Matching reservation details...",
  ],
  fr: [
    "L'IA lit le document...",
    "Extraction des données du passeport...",
    "Validation des règles de sécurité...",
    "Croisement avec la réservation...",
  ],
  es: [
    "La IA lee el documento...",
    "Extrayendo datos del pasaporte...",
    "Validando reglas de seguridad...",
    "Cruzando con la reserva...",
  ],
  de: [
    "KI liest das Dokument...",
    "Ausweisdaten werden extrahiert...",
    "Sicherheitsregeln werden geprüft...",
    "Abgleich mit der Reservierung...",
  ],
};

export function getAiLoadingPhrases(lang: ChatLang): string[] {
  return AI_LOADING[lang];
}

/** Fictitious OCR profiles rotated by session */
const OCR_PROFILES = [
  {
    nome: "James Mitchell",
    numero_documento: "GB8721943",
    validade: "14/08/2029",
    nacionalidade: "Reino Unido",
  },
  {
    nome: "Sophie Laurent",
    numero_documento: "FR45829103",
    validade: "22/03/2028",
    nacionalidade: "França",
  },
  {
    nome: "Carlos Mendes",
    numero_documento: "PT9921847",
    validade: "05/11/2030",
    nacionalidade: "Portugal",
  },
  {
    nome: "Hans Weber",
    numero_documento: "DE7741209",
    validade: "18/01/2027",
    nacionalidade: "Alemanha",
  },
];

export function generateOcrData(seed?: string) {
  const idx =
    Math.abs(
      (seed ?? String(Date.now()))
        .split("")
        .reduce((a, c) => a + c.charCodeAt(0), 0),
    ) % OCR_PROFILES.length;
  return { ...OCR_PROFILES[idx], processado_em: new Date().toISOString() };
}

type Dict = Record<string, string | string[]>;

const T: Record<ChatLang, Dict> = {
  pt: {
    brand: "Autocunha Rent-a-Car",
    greeting:
      "Olá! 👋 Bem-vindo à *Autocunha Rent-a-Car* (Madeira).\nSou a *assistente IA* de reservas, percebo mensagens naturais e respondo às suas dúvidas em tempo real.\n\n💬 Pode escrever à vontade (ex: _«Preciso de um carro amanhã por 5 dias»_ ou _«Quanto é a caução?»_).\n\nPara começar, qual é o seu *nome completo*?",
    askPickup:
      "Olá, *{name}*! 😊\n\nPara quando precisa do carro?\n_(Escolha uma opção ou escreva a data, ex: 25/05)_",
    askDuration:
      "Levantamento: *{pickup}* ✅\n\n*Quantos dias* pretende alugar o veículo?\n_(Escolha a duração, a data de devolução é calculada automaticamente)_",
    durationOption: "{days} dia(s), devolução {return}",
    durationCustom: "📅 Escolher outra data de devolução",
    durationConfirmed:
      "Perfeito! *{days} dia(s)* de aluguer.\n📅 Levantamento: {pickup}\n📅 Devolução: {return}\n\nA que horas prefere levantar o carro?",
    askReturn:
      "Levantamento: *{pickup}* ✅\n\nEscreva ou escolha a *data de devolução* (DD/MM/AAAA):",
    askPickupTime:
      "Horário de levantamento registado. Confirme a hora preferida:",
    pickupTimeOptions: [
      "🌅 08:00 a 10:00 (abertura)",
      "☀️ 10:00 a 14:00",
      "🌇 14:00 a 18:00",
      "🌙 18:00 a 22:00 (+ taxa noturna se fora do horário)",
    ],
    rentalSummary:
      "📋 *Resumo do pedido*\n• {days} dia(s), levantamento {pickup}, devolução {return}\n• Horário: {time}\n\nQuantas pessoas viajam e quanta bagagem? _(ex: 2 adultos e 2 malas médias — escreva à vontade)_",
    askGroup:
      "Perfeito. *{days} dia(s)* de aluguer, devolução *{return}*.\n\nQuantas pessoas viajam e quanta bagagem têm?",
    loadingFleet: "A carregar frota disponível...",
    fleetCount: "Temos *{count} veículos disponíveis* para {days} dia(s). Escolha o que mais gosta:",
    vehicleSelected:
      "*{vehicle}* selecionado! 🚗\n\nAntes do orçamento, escolha o *plano de proteção*:\n\n🛡️ *Franquia ZERO*, sem stress, sem caução bloqueada\n💳 *Standard*, caução no cartão (libertada após devolução sem danos)",
    rentalTerms:
      "📜 *CONDIÇÕES GERAIS DE ALUGUER, Autocunha Rent-a-Car*\n\n✅ *Incluído no contrato:*\n• Seguro de responsabilidade civil (mínimo legal PT)\n• Assistência em estrada 24h na Madeira\n• Quilometragem: *ilimitada* na ilha\n• 2º condutor gratuito (mediante validação de documentos)\n\n⛽ *Combustível:* Devolver com o mesmo nível (política *Cheio/Cheio*). Caso contrário: taxa de reabastecimento + serviço.\n\n👤 *Condutor:* Mínimo *21 anos* e carta com mais de 1 ano. Condutor jovem (21-23): taxa adicional.\n\n💳 *Caução (plano Standard):* Bloqueio no cartão até €{caucao}. Libertada em 5-7 dias úteis após inspeção.\n\n🚫 *Não permitido:* Fumar no veículo • Condução fora da Madeira sem autorização • Uso em competição\n\n❌ *Cancelamento:* Gratuito até 48h antes do levantamento. Após: 50% do valor ou crédito em futura reserva.\n\n🤖 *Pré-check-in inteligente:* após o sinal, envia fotos do passaporte/BI e carta; a IA valida os dados *antes do voo* (no demonstrador usa OCR simulado; em produção liga ao motor real).\n\n📄 O contrato completo será enviado por email após confirmação. Ao aceitar, declara que leu e concorda com estes termos.",
    acceptTerms: "✅ Li e aceito o Contrato de Aluguer",
    termsQuestions: "❓ Tenho uma dúvida (falar com equipa)",
    termsReply:
      "Sem problema! A nossa equipa contacta-o em breve. Pode também continuar e esclarecer no balcão no dia do levantamento.\n\nSegue para o orçamento:",
    quoteIntro:
      "Com base nas condições aceites, aqui está o seu *orçamento contratual*:\n\n✍️ Se estiver de acordo, escreva *ACEITO*. Para mudar a proteção, escreva *ALTERAR PROTEÇÃO*.",
    termsAcceptHint:
      "\n\n✍️ Quando estiver de acordo com as condições, responda *ACEITO*. Se tiver dúvidas, escreva *DUVIDA*.",
    quoteKms: "Quilometragem ilimitada (Madeira)",
    quoteFuel: "Combustível: Cheio/Cheio",
    quoteMinAge: "Condutor: min. 21 anos",
    quoteContract: "Ref. contrato: AC-{ref}",
    paymentPrompt:
      "Para *formalizar a reserva* é necessário um *sinal de €50* (deduzido do total).\n\n🔒 Pagamento seguro • Recibo automático • Contrato por email\n\nClique para pagar:",
    paymentProcessing: "A processar pagamento...",
    paymentOk:
      "✅ *Pagamento confirmado!*\n\n🎉 Reserva *#{id}* formalizada.\n📄 Contrato enviado para o seu email.\n\n*Pré-check-in (obrigatório):* envie fotos nítidas de:\n• 📄 Passaporte ou BI\n• 🚗 Carta de condução válida",
    paymentOfflineNote:
      "⚠️ Ligação ao servidor instável; continuo em modo demonstração para não o bloquear.",
    docsPrompt: "📎 Documentos enviados",
    docsOk:
      "✅ *Documentos verificados pela IA!*\n\n👤 *{nome}*\n📄 Doc: `{doc}`\n📅 Validade: {validade}\n\nPré-check-in concluído. No dia do levantamento envie 4 fotos do veículo.",
    photosPrompt: "📷 Fotos do veículo enviadas",
    photosOk:
      "✅ *Fotos registadas!* Estado do veículo documentado.\n\n🚗 *Boa viagem!*\n• Devolução: {return}\n• Use *SOS PÂNICO* em emergência",
    sosActive:
      "🚨 *ALERTA SOS RECEBIDO!*\n\nVamos enviar a sua localização GPS para a nossa equipa. Confirme:",
    sosSent:
      "🚨 *ALERTA ENVIADO!*\nA equipa foi notificada. Tempo estimado: 20-30 minutos.",
    sosUnavailable: "O SOS estará disponível quando o carro estiver na estrada.",
    invalidDate: "Não consegui perceber a data. Tente DD/MM ou escolha uma opção.",
    invalidReturn: "A data de devolução tem de ser posterior ao levantamento.",
    invalidDuration: "Indique quantos dias pretende (ex: 5 dias) ou escolha uma opção.",
    activeReply: "Obrigado! A nossa equipa está disponível 24/7. Em emergência use *SOS PÂNICO*.",
    choose: "Escolher",
    payDeposit: "💳 Pagar Sinal de €50",
    sendDocs: "Enviar Documentos",
    sendPhotos: "Enviar 4 Fotos do Carro",
    today: "Hoje",
    tomorrow: "Amanhã",
    dayAfterTomorrow: "Depois de amanhã",
    in3days: "Daqui a 3 dias",
    in5days: "Daqui a 5 dias",
    nextWeek: "Daqui a 1 semana",
    in2weeks: "Daqui a 2 semanas",
    weekend: "Próximo sábado",
    askPhone:
      "Ótimo, *{name}*! 📱\n\nQual é o seu *telemóvel* (com indicativo)?\n_Ex: +351 912 345 678, usamos só para a reserva e levantamento._",
    phoneQuick: ["+351 912 000 000", "+351 965 000 000", "+44 7700 900000", "✍️ Escrever outro número"],
    askPickupLocation:
      "Onde prefere *levantar o carro*?\n_Ex: aeroporto FNC, loja Funchal, hotel, ou outro local na ilha — escreva à sua maneira._",
    pickupLocationOptions: [
      "✈️ Aeroporto Madeira (FNC)",
      "🏢 Loja Autocunha, Funchal",
      "🏨 Entrega no hotel (Funchal)",
      "📍 Outro local na ilha",
    ],
    askFlight:
      "Tem *voo para a Madeira*? Indique a *hora de chegada* (ex: _chego às 14h30_) para alinharmos o levantamento.\n_Se já estiver na ilha, escreva_ *sem voo*.",
    flightSkip: "Sem voo / já estou na ilha",
    flightQuick: ["✈️ Chego ~08:00", "✈️ Chego ~12:00", "✈️ Chego ~16:00", "✈️ Chego ~20:00"],
    intakeSummary:
      "📋 *Resumo pré-balcão* (já tratado pela Sofia)\n• Cliente: {name}, {phone}\n• {pickup} a {return} ({days}d), {time}\n• Local: {location}\n• Voo: {flight}\n• Grupo: {group}\n\nFalta só escolher carro, proteção e pagar o sinal, o balcão fica para chaves e entrega.",
    groupOptions: [
      "1 pessoa, 1 mala pequena",
      "2 pessoas, 2 malas médias",
      "3-4 pessoas, 3-4 malas",
      "5+ pessoas / muita bagagem",
    ],
    protectionZero: "🛡️ Franquia ZERO, +€{extra}/dia (sem caução)",
    protectionStandard: "💳 Standard, Caução de €{caucao} bloqueada no cartão",
    acceptQuote: "✅ Aceitar Orçamento",
    changeProtection: "🔄 Alterar Proteção",
    confirmSos: "✅ Confirmar SOS + Enviar Localização GPS",
    cancelSos: "❌ Cancelar (foi engano)",
    aiAnalyzing: "A analisar com IA...",
    aiAckUnderstood: "💡 *Percebi.* Um momento…",
    aiAckName: "💡 Olá *{name}*! Prazer em ajudar na sua reserva.",
    aiAckDates:
      "💡 Registado: *{days} dia(s)*, levantamento *{pickup}*, devolução *{return}*.",
    aiAckVehicle: "💡 Vou destacar o *{vehicle}* na frota disponível.",
    faqChip: "❓ Ajuda / FAQ",
    langConfirmed: "Perfeito, continuamos em *português* 🇵🇹",
    welcomeIntro:
      "Olá! 😊 Sou a *Sofia*, assistente de reservas da *Autocunha Rent-a-Car*.\n\n" +
      "Estou aqui para o ajudar a preparar o aluguer *antes de chegar ao balcão*: datas, viatura, proteção, contrato e envio de documentos. " +
      "No balcão fica sobretudo a entrega das chaves.\n\n" +
      "Para começar, diga-me o seu *nome completo*.",
    askNameShort: "Como se chama? Escreva o *nome completo* para começarmos a reserva.",
  },
  en: {
    brand: "Autocunha Rent-a-Car",
    greeting:
      "Hello! 👋 Welcome to *Autocunha Rent-a-Car*.\nI'm your AI digital assistant.\n\nWhat is your name, please?",
    askPickup:
      "Hello, *{name}*! 😊\n\nWhen do you need the car?\n_(Pick an option or type a date, e.g. 25/05)_",
    askDuration:
      "Pick-up: *{pickup}* ✅\n\n*How many days* do you need the car?\n_(Duration sets your return date automatically)_",
    durationOption: "{days} day(s), return {return}",
    durationCustom: "📅 Choose a different return date",
    durationConfirmed:
      "Great! *{days} day(s)* rental.\n📅 Pick-up: {pickup}\n📅 Return: {return}\n\nWhat time would you like to collect the car?",
    askReturn:
      "Pick-up: *{pickup}* ✅\n\nEnter your *return date* (DD/MM/YYYY):",
    askPickupTime: "Please confirm your preferred pick-up time:",
    pickupTimeOptions: [
      "🌅 08:00 to 10:00 (opening)",
      "☀️ 10:00 to 14:00",
      "🌇 14:00 to 18:00",
      "🌙 18:00 to 22:00 (out-of-hours fee may apply)",
    ],
    rentalSummary:
      "📋 *Booking summary*\n• {days} day(s) | {pickup} to {return}\n• Time: {time}\n\nHow many travellers and how much luggage?",
    askGroup:
      "Great. *{days} day(s)* rental, return *{return}*.\n\nHow many travellers and how much luggage?",
    loadingFleet: "Loading available fleet...",
    fleetCount: "We have *{count} vehicles available* for {days} day(s). Choose your favourite:",
    vehicleSelected:
      "*{vehicle}* selected! 🚗\n\nChoose your *protection plan*:\n\n🛡️ *ZERO excess*, no deposit hold\n💳 *Standard*, card deposit (released after inspection)",
    rentalTerms:
      "📜 *GENERAL RENTAL TERMS, Autocunha Rent-a-Car*\n\n✅ *Included:*\n• Third-party liability insurance (PT minimum)\n• 24h roadside assistance in Madeira\n• *Unlimited* mileage on the island\n• Free 2nd driver (documents required)\n\n⛽ *Fuel:* Return with same level (*Full/Full*). Otherwise: refuelling + service fee.\n\n👤 *Driver:* Min. *21 years*, licence held 1+ year.\n\n💳 *Deposit (Standard):* Card hold up to €{caucao}. Released within 5-7 business days after inspection.\n\n🚫 *Not allowed:* Smoking • Driving outside Madeira without approval • Racing\n\n❌ *Cancellation:* Free up to 48h before pick-up.\n\n📄 Full contract sent by email after confirmation.",
    acceptTerms: "✅ I have read and accept the Rental Agreement",
    termsQuestions: "❓ I have a question",
    termsReply: "No problem! Our team will assist you. You may also clarify at the desk on pick-up day.\n\nHere is your quote:",
    quoteIntro: "Based on the accepted terms, your *contract quote*:",
    quoteKms: "Unlimited mileage (Madeira)",
    quoteFuel: "Fuel: Full/Full",
    quoteMinAge: "Driver: min. 21 years",
    quoteContract: "Contract ref: AC-{ref}",
    paymentPrompt:
      "To *confirm your booking*, a *€50 deposit* is required (deducted from total).\n\n🔒 Secure payment • Receipt by email • Contract attached\n\nTap to pay:",
    paymentProcessing: "Processing payment...",
    paymentOk:
      "✅ *Payment confirmed!*\n\n🎉 Booking *#{id}* created!\n\nPlease send documents for pre-check-in:\n• 📄 Passport photo\n• 🚗 Driving licence photo",
    docsPrompt: "📎 Documents sent",
    docsOk:
      "✅ *Documents verified by AI!*\n\n👤 *{nome}*\n📄 Doc: `{doc}`\n📅 Expiry: {validade}\n\nPre-check-in done. On pick-up day send 4 car photos.",
    photosPrompt: "📷 Car photos sent",
    photosOk:
      "✅ *Photos saved!* Vehicle condition documented.\n\n🚗 *Have a great trip!*\n• Return: {return}\n• Use *SOS PANIC* in emergencies",
    sosActive:
      "🚨 *SOS ALERT!*\n\nWe will send your GPS location to our team. Confirm:",
    sosSent:
      "🚨 *ALERT SENT!*\nOur team has been notified. ETA: 20-30 minutes.",
    sosUnavailable: "SOS is available once the car is on the road.",
    invalidDate: "I couldn't understand the date. Try DD/MM or pick an option.",
    invalidReturn: "Return date must be after pick-up.",
    invalidDuration: "Please specify how many days (e.g. 5 days) or pick an option.",
    activeReply: "Thanks! Our team is available 24/7. In emergency use *SOS PANIC*.",
    choose: "Choose",
    payDeposit: "💳 Pay €50 Deposit",
    sendDocs: "Send Documents",
    sendPhotos: "Send 4 Car Photos",
    today: "Today",
    tomorrow: "Tomorrow",
    dayAfterTomorrow: "Day after tomorrow",
    in3days: "In 3 days",
    in5days: "In 5 days",
    nextWeek: "In 1 week",
    in2weeks: "In 2 weeks",
    weekend: "Next Saturday",
    askPhone: "Thanks, *{name}*! 📱 Your *mobile number* (with country code)?",
    phoneQuick: ["+351 912 000 000", "+44 7700 900000", "✍️ Type another number"],
    askPickupLocation: "Where would you like to *pick up* the car?",
    pickupLocationOptions: [
      "✈️ Madeira Airport (FNC)",
      "🏢 Autocunha desk, Funchal",
      "🏨 Hotel delivery (Funchal)",
      "📍 Other on the island",
    ],
    askFlight: "Flight to Madeira? *Arrival time* helps us align pick-up.\n_(Or «No flight»)_",
    flightSkip: "No flight / already on island",
    flightQuick: ["✈️ Arrive ~08:00", "✈️ Arrive ~12:00", "✈️ Arrive ~16:00", "✈️ Arrive ~20:00"],
    intakeSummary:
      "📋 *Pre-desk summary* (handled by Sofia)\n• {name}, {phone}\n• {pickup} to {return} ({days}d), {time}\n• Location: {location}\n• Flight: {flight}\n• Group: {group}\n\nJust choose car, protection and pay the €50 deposit; the desk is for keys only.",
    groupOptions: [
      "1 person, 1 small bag",
      "2 people, 2 medium bags",
      "3-4 people, 3-4 bags",
      "5+ people / lots of luggage",
    ],
    protectionZero: "🛡️ ZERO excess, +€{extra}/day (no deposit)",
    protectionStandard: "💳 Standard, €{caucao} deposit on card",
    acceptQuote: "✅ Accept Quote",
    changeProtection: "🔄 Change Protection",
    confirmSos: "✅ Confirm SOS + Send GPS",
    cancelSos: "❌ Cancel (mistake)",
    aiAnalyzing: "AI analysing...",
    aiAckUnderstood: "💡 *Got it.* One moment…",
    aiAckName: "💡 Hi *{name}*! Happy to help.",
    aiAckDates: "💡 Noted: *{days} day(s)*, pick-up *{pickup}*, return *{return}*.",
    aiAckVehicle: "💡 I'll highlight the *{vehicle}* for you.",
    faqChip: "❓ Help / FAQ",
    langConfirmed: "Great, we'll continue in *English* 🇬🇧",
    welcomeIntro:
      "Hello! 😊 I'm *Sofia*, booking assistant at *Autocunha Rent-a-Car* in Madeira.\n\n" +
      "I'll help you set up your rental *before you reach the desk*: dates, car, protection, contract and documents. " +
      "At the desk you'll mainly collect the keys.\n\n" +
      "To get started, please tell me your *full name*.",
    askNameShort: "What's your name? Please type your *full name* to start the booking.",
  },
  fr: {
    brand: "Autocunha Rent-a-Car",
    greeting:
      "Bonjour! 👋 Bienvenue chez *Autocunha Rent-a-Car*.\nJe suis votre assistant IA.\n\nQuel est votre nom, s'il vous plaît?",
    askPickup:
      "Bonjour, *{name}*! 😊\n\nPour quand avez-vous besoin de la voiture?\n_(Date au format JJ/MM)_",
    askDuration:
      "Prise en charge: *{pickup}* ✅\n\n*Combien de jours* souhaitez-vous louer?\n_(La date de retour est calculée automatiquement)_",
    durationOption: "{days} jour(s), retour {return}",
    durationCustom: "📅 Autre date de retour",
    durationConfirmed:
      "Parfait! *{days} jour(s)*.\n📅 Prise: {pickup}\n📅 Retour: {return}\n\nÀ quelle heure souhaitez-vous récupérer le véhicule?",
    askReturn: "Prise en charge: *{pickup}* ✅\n\nIndiquez la *date de retour* (JJ/MM/AAAA):",
    askPickupTime: "Confirmez l'heure de prise en charge:",
    pickupTimeOptions: [
      "🌅 08h00 à 10h00 (ouverture)",
      "☀️ 10h00 à 14h00",
      "🌇 14h00 à 18h00",
      "🌙 18h00 à 22h00 (supplément possible hors horaires)",
    ],
    rentalSummary:
      "📋 *Résumé*\n• {days} jour(s) | {pickup} au {return}\n• Heure: {time}\n\nVoyageurs et bagages?",
    askGroup:
      "Parfait. *{days} jour(s)* de location, retour *{return}*.\n\nCombien de voyageurs et de bagages?",
    loadingFleet: "Chargement de la flotte disponible...",
    fleetCount: "Nous avons *{count} véhicules* pour {days} jour(s). Choisissez:",
    vehicleSelected: "*{vehicle}* sélectionné! 🚗\n\nChoisissez votre *protection*:\n🛡️ Franchise ZÉRO • 💳 Standard (caution sur carte)",
    rentalTerms:
      "📜 *CONDITIONS GÉNÉRALES, Autocunha*\n\n✅ Assurance RC • Assistance 24h • Km *illimités* (Madère)\n⛽ Carburant: Plein/Plein\n👤 Conducteur min. 21 ans\n💳 Caution Standard: jusqu'à €{caucao}\n❌ Annulation gratuite jusqu'à 48h avant\n📄 Contrat complet par email.",
    acceptTerms: "✅ J'accepte le contrat de location",
    termsQuestions: "❓ J'ai une question",
    termsReply: "Notre équipe vous aidera. Voici le devis:",
    quoteIntro: "Votre *devis contractuel*:",
    quoteKms: "Km illimités (Madère)",
    quoteFuel: "Carburant: Plein/Plein",
    quoteMinAge: "Conducteur: min. 21 ans",
    quoteContract: "Réf. contrat: AC-{ref}",
    paymentPrompt:
      "*Acompte 50€* requis pour confirmer.\n🔒 Paiement sécurisé • Contrat par email\n\nPayer:",
    paymentProcessing: "Traitement du paiement...",
    paymentOk:
      "✅ *Paiement confirmé!*\n\n🎉 Réservation *#{id}* créée!\n\nEnvoyez vos documents:\n• 📄 Passeport\n• 🚗 Permis de conduire",
    docsPrompt: "📎 Documents envoyés",
    docsOk:
      "✅ *Documents vérifiés par l'IA!*\n\n👤 *{nome}*\n📄 Doc: `{doc}`\n📅 Validité: {validade}\n\nPré-enregistrement terminé. Le jour de la prise en charge, envoyez 4 photos du véhicule.",
    photosPrompt: "📷 Photos envoyées",
    photosOk:
      "✅ *Photos enregistrées!* État du véhicule documenté.\n\n🚗 *Bon voyage!*\n• Retour: {return}\n• *SOS PANIQUE* en urgence",
    sosActive: "🚨 *ALERTE SOS!*\n\nConfirmez l'envoi de votre position GPS:",
    sosSent: "🚨 *ALERTE ENVOYÉE!* Équipe notifiée. Délai: 20-30 min.",
    sosUnavailable: "SOS disponible une fois le véhicule en route.",
    invalidDate: "Date non comprise. Essayez JJ/MM.",
    invalidReturn: "La date de retour doit être après la prise en charge.",
    invalidDuration: "Indiquez le nombre de jours (ex: 5 jours).",
    activeReply: "Merci! Équipe 24/7. Urgence: *SOS PANIQUE*.",
    choose: "Choisir",
    payDeposit: "💳 Payer l'acompte 50€",
    sendDocs: "Envoyer les documents",
    sendPhotos: "Envoyer 4 photos",
    today: "Aujourd'hui",
    tomorrow: "Demain",
    dayAfterTomorrow: "Après-demain",
    in3days: "Dans 3 jours",
    in5days: "Dans 5 jours",
    in2weeks: "Dans 2 semaines",
    weekend: "Prochain samedi",
    nextWeek: "Dans 1 semaine",
    askPhone:
      "Merci, *{name}*! 📱 Votre *numéro de mobile* (avec indicatif)?\n_Ex: +351 912 345 678, pour la réservation et le retrait._",
    phoneQuick: ["+351 912 000 000", "+351 965 000 000", "+33 6 00 00 00 00", "✍️ Autre numéro"],
    askPickupLocation: "Où souhaitez-vous *récupérer* le véhicule?",
    pickupLocationOptions: [
      "✈️ Aéroport Madère (FNC)",
      "🏢 Agence Autocunha, Funchal",
      "🏨 Livraison à l'hôtel (Funchal)",
      "📍 Autre lieu sur l'île",
    ],
    askFlight:
      "Avez-vous un *vol pour Madère*? Indiquez l'heure d'arrivée pour aligner la prise en charge.\n_(Ou « Pas de vol »)_",
    flightSkip: "Pas de vol / déjà sur l'île",
    flightQuick: ["✈️ Arrivée ~08:00", "✈️ Arrivée ~12:00", "✈️ Arrivée ~16:00", "✈️ Arrivée ~20:00"],
    intakeSummary:
      "📋 *Résumé pré-accueil* (traité par Sofia)\n• {name}, {phone}\n• {pickup} au {return} ({days}j), {time}\n• Lieu: {location}\n• Vol: {flight}\n• Groupe: {group}\n\nIl reste le véhicule, la protection et l'acompte; le comptoir pour les clés.",
    groupOptions: [
      "1 personne, 1 petit bagage",
      "2 personnes, 2 bagages moyens",
      "3-4 personnes, 3-4 bagages",
      "5+ personnes / beaucoup de bagages",
    ],
    protectionZero: "🛡️ Franchise ZÉRO, +€{extra}/jour",
    protectionStandard: "💳 Standard, Caution €{caucao}",
    acceptQuote: "✅ Accepter le devis",
    changeProtection: "🔄 Changer protection",
    confirmSos: "✅ Confirmer SOS + GPS",
    cancelSos: "❌ Annuler",
    aiAnalyzing: "Analyse IA en cours...",
    aiAckUnderstood: "💡 *Compris.*",
    aiAckName: "💡 Bonjour *{name}*!",
    aiAckDates: "💡 {days} jour(s), {pickup} au {return}.",
    aiAckVehicle: "💡 *{vehicle}* dans la flotte.",
    faqChip: "❓ Aide / FAQ",
    langConfirmed: "Parfait, nous continuons en *français* 🇫🇷",
    welcomeIntro:
      "Bonjour! 😊 Je suis *Sofia*, assistante réservations chez *Autocunha Rent-a-Car* (Madère).\n\n" +
      "Je vous aide à préparer la location *avant le comptoir*: dates, véhicule, protection, contrat et documents. " +
      "Au comptoir, ce sera surtout la remise des clés.\n\n" +
      "Pour commencer, indiquez votre *nom complet*.",
    askNameShort: "Quel est votre nom? Indiquez votre *nom complet*.",
  },
  es: {
    brand: "Autocunha Rent-a-Car",
    greeting:
      "¡Hola! 👋 Bienvenido a *Autocunha Rent-a-Car*.\nSoy su asistente digital con IA.\n\n¿Cuál es su nombre?",
    askPickup:
      "¡Hola, *{name}*! 😊\n\n¿Para cuándo necesita el coche?\n_(Fecha DD/MM)_",
    askDuration:
      "Recogida: *{pickup}* ✅\n\n*¿Cuántos días* necesita el vehículo?\n_(La devolución se calcula automáticamente)_",
    durationOption: "{days} día(s), devolución {return}",
    durationCustom: "📅 Otra fecha de devolución",
    durationConfirmed:
      "¡Perfecto! *{days} día(s)*.\n📅 Recogida: {pickup}\n📅 Devolución: {return}\n\n¿A qué hora prefiere recoger el coche?",
    askReturn: "Recogida: *{pickup}* ✅\n\nIndique la *fecha de devolución* (DD/MM/AAAA):",
    askPickupTime: "Confirme la hora de recogida:",
    pickupTimeOptions: [
      "🌅 08:00 a 10:00",
      "☀️ 10:00 a 14:00",
      "🌇 14:00 a 18:00",
      "🌙 18:00 a 22:00",
    ],
    rentalSummary:
      "📋 *Resumen*\n• {days} día(s) | {pickup} al {return}\n• Hora: {time}\n\n¿Cuántas personas y equipaje?",
    askGroup:
      "Perfecto. *{days} día(s)* de alquiler, devolución *{return}*.\n\n¿Cuántas personas y equipaje?",
    loadingFleet: "Cargando flota disponible...",
    fleetCount: "Tenemos *{count} vehículos* para {days} día(s). Elija:",
    vehicleSelected: "*{vehicle}* seleccionado! 🚗\n\nElija *protección*:\n🛡️ Franquicia CERO • 💳 Standard (depósito en tarjeta)",
    rentalTerms:
      "📜 *CONDICIONES GENERALES, Autocunha*\n\n✅ Seguro RC • Asistencia 24h • Km *ilimitados* (Madeira)\n⛽ Combustible: Lleno/Lleno\n👤 Conductor min. 21 años\n💳 Depósito Standard: hasta €{caucao}\n❌ Cancelación gratuita hasta 48h antes\n📄 Contrato por email.",
    acceptTerms: "✅ Acepto el contrato de alquiler",
    termsQuestions: "❓ Tengo una duda",
    termsReply: "Le ayudamos en breve. Aquí tiene el presupuesto:",
    quoteIntro: "Su *presupuesto contractual*:",
    quoteKms: "Km ilimitados (Madeira)",
    quoteFuel: "Combustible: Lleno/Lleno",
    quoteMinAge: "Conductor: min. 21 años",
    quoteContract: "Ref. contrato: AC-{ref}",
    paymentPrompt:
      "*Depósito 50€* para confirmar.\n🔒 Pago seguro • Contrato por email\n\nPagar:",
    paymentProcessing: "Procesando pago...",
    paymentOk:
      "✅ *¡Pago confirmado!*\n\n🎉 Reserva *#{id}* creada!\n\nEnvíe documentos:\n• 📄 Pasaporte\n• 🚗 Carnet de conducir",
    docsPrompt: "📎 Documentos enviados",
    docsOk:
      "✅ *¡Documentos verificados por IA!*\n\n👤 *{nome}*\n📄 Doc: `{doc}`\n📅 Validez: {validade}\n\nPre-check-in listo. El día de la recogida envíe 4 fotos del coche.",
    photosPrompt: "📷 Fotos enviadas",
    photosOk:
      "✅ *¡Fotos guardadas!* Estado del vehículo documentado.\n\n🚗 *¡Buen viaje!*\n• Devolución: {return}\n• Use *SOS PÁNICO* en emergencias",
    sosActive: "🚨 *¡ALERTA SOS!*\n\nConfirme el envío de GPS:",
    sosSent: "🚨 *¡ALERTA ENVIADA!* Equipo notificado.",
    sosUnavailable: "SOS disponible con el coche en carretera.",
    invalidDate: "No entendí la fecha. Pruebe DD/MM.",
    invalidReturn: "La devolución debe ser posterior a la recogida.",
    invalidDuration: "Indique los días (ej: 5 días) o elija una opción.",
    activeReply: "¡Gracias! Equipo 24/7. Emergencia: *SOS PÁNICO*.",
    choose: "Elegir",
    payDeposit: "💳 Pagar depósito 50€",
    sendDocs: "Enviar documentos",
    sendPhotos: "Enviar 4 fotos",
    today: "Hoy",
    tomorrow: "Mañana",
    dayAfterTomorrow: "Pasado mañana",
    in3days: "Dentro de 3 días",
    in5days: "Dentro de 5 días",
    in2weeks: "Dentro de 2 semanas",
    weekend: "Próximo sábado",
    nextWeek: "Dentro de 1 semana",
    askPhone:
      "¡Gracias, *{name}*! 📱 Su *móvil* (con prefijo)?\n_Ej: +351 912 345 678, solo para la reserva y la recogida._",
    phoneQuick: ["+351 912 000 000", "+34 600 000 000", "+44 7700 900000", "✍️ Otro número"],
    askPickupLocation: "¿Dónde prefiere *recoger* el coche?",
    pickupLocationOptions: [
      "✈️ Aeropuerto Madeira (FNC)",
      "🏢 Oficina Autocunha, Funchal",
      "🏨 Entrega en hotel (Funchal)",
      "📍 Otro lugar en la isla",
    ],
    askFlight:
      "¿Tiene *vuelo a Madeira*? Indique la hora de llegada para coordinar la recogida.\n_(O « Sin vuelo »)_",
    flightSkip: "Sin vuelo / ya estoy en la isla",
    flightQuick: ["✈️ Llego ~08:00", "✈️ Llego ~12:00", "✈️ Llego ~16:00", "✈️ Llego ~20:00"],
    intakeSummary:
      "📋 *Resumen previo al mostrador* (Sofia)\n• {name}, {phone}\n• {pickup} al {return} ({days}d), {time}\n• Lugar: {location}\n• Vuelo: {flight}\n• Grupo: {group}\n\nFalta coche, protección y depósito; en mostrador solo llaves.",
    groupOptions: [
      "1 persona, 1 maleta pequeña",
      "2 personas, 2 maletas",
      "3-4 personas, 3-4 maletas",
      "5+ personas / mucho equipaje",
    ],
    protectionZero: "🛡️ Franquicia CERO, +€{extra}/día",
    protectionStandard: "💳 Standard, Depósito €{caucao}",
    acceptQuote: "✅ Aceptar presupuesto",
    changeProtection: "🔄 Cambiar protección",
    confirmSos: "✅ Confirmar SOS + GPS",
    cancelSos: "❌ Cancelar",
    aiAnalyzing: "IA analizando...",
    aiAckUnderstood: "💡 *Entendido.*",
    aiAckName: "💡 Hola *{name}*!",
    aiAckDates: "💡 {days} día(s), {pickup} al {return}.",
    aiAckVehicle: "💡 *{vehicle}* en la flota.",
    faqChip: "❓ Ayuda / FAQ",
    langConfirmed: "Perfecto, seguimos en *español* 🇪🇸",
    welcomeIntro:
      "¡Hola! 😊 Soy *Sofia*, asistente de reservas de *Autocunha Rent-a-Car* en Madeira.\n\n" +
      "Le ayudo a preparar el alquiler *antes del mostrador*: fechas, coche, protección, contrato y documentos. " +
      "En el mostrador, sobre todo recogerá las llaves.\n\n" +
      "Para empezar, indique su *nombre completo*.",
    askNameShort: "¿Cómo se llama? Escriba su *nombre completo*.",
  },
  de: {
    brand: "Autocunha Rent-a-Car",
    greeting:
      "Hallo! 👋 Willkommen bei *Autocunha Rent-a-Car*.\nIch bin Ihr KI-Assistent.\n\nWie ist Ihr Name?",
    askPickup:
      "Hallo, *{name}*! 😊\n\nWann benötigen Sie das Auto?\n_(Datum TT/MM)_",
    askDuration:
      "Abholung: *{pickup}* ✅\n\n*Wie viele Tage* möchten Sie mieten?\n_(Rückgabedatum wird automatisch berechnet)_",
    durationOption: "{days} Tag(e), Rückgabe {return}",
    durationCustom: "📅 Anderes Rückgabedatum",
    durationConfirmed:
      "Perfekt! *{days} Tag(e)*.\n📅 Abholung: {pickup}\n📅 Rückgabe: {return}\n\nWann möchten Sie abholen?",
    askReturn: "Abholung: *{pickup}* ✅\n\n*Rückgabedatum* eingeben (TT/MM/JJJJ):",
    askPickupTime: "Abholzeit bestätigen:",
    pickupTimeOptions: [
      "🌅 08:00 bis 10:00 (Öffnung)",
      "☀️ 10:00 bis 14:00",
      "🌇 14:00 bis 18:00",
      "🌙 18:00 bis 22:00 (Zuschlag außerhalb der Öffnungszeiten möglich)",
    ],
    rentalSummary:
      "📋 *Zusammenfassung*\n• {days} Tag(e) | {pickup} bis {return}\n• Zeit: {time}\n\nPersonen und Gepäck?",
    askGroup:
      "Gut. *{days} Tag(e)* Miete, Rückgabe *{return}*.\n\nWie viele Personen und wie viel Gepäck?",
    loadingFleet: "Verfügbare Flotte wird geladen...",
    fleetCount: "Wir haben *{count} Fahrzeuge* für {days} Tag(e). Wählen Sie:",
    vehicleSelected: "*{vehicle}* ausgewählt! 🚗\n\n*Schutz wählen*:\n🛡️ ZERO Selbstbeteiligung • 💳 Standard (Kaution)",
    rentalTerms:
      "📜 *ALLGEMEINE BEDINGUNGEN, Autocunha*\n\n✅ Haftpflicht • 24h Pannenhilfe • *Unbegrenzte* km (Madeira)\n⛽ Kraftstoff: Voll/Voll\n👤 Fahrer min. 21 Jahre\n💳 Kaution Standard: bis €{caucao}\n❌ Stornierung bis 48h kostenlos\n📄 Vertrag per E-Mail.",
    acceptTerms: "✅ Ich akzeptiere den Mietvertrag",
    termsQuestions: "❓ Ich habe eine Frage",
    termsReply: "Wir helfen Ihnen. Hier ist Ihr Angebot:",
    quoteIntro: "Ihr *Vertragsangebot*:",
    quoteKms: "Unbegrenzte km (Madeira)",
    quoteFuel: "Kraftstoff: Voll/Voll",
    quoteMinAge: "Fahrer: min. 21 Jahre",
    quoteContract: "Vertragsref: AC-{ref}",
    paymentPrompt:
      "*50€ Anzahlung* zur Bestätigung.\n🔒 Sichere Zahlung • Vertrag per E-Mail\n\nBezahlen:",
    paymentProcessing: "Zahlung wird verarbeitet...",
    paymentOk:
      "✅ *Zahlung bestätigt!*\n\n🎉 Buchung *#{id}* erstellt!\n\nBitte Dokumente senden:\n• 📄 Reisepass\n• 🚗 Führerschein",
    docsPrompt: "📎 Dokumente gesendet",
    docsOk:
      "✅ *Von KI verifiziert!*\n\n👤 *{nome}*\n📄 Doc: `{doc}`\n📅 Gültig bis: {validade}\n\nPre-Check-in erledigt. Am Abholtag bitte 4 Fahrzeugfotos senden.",
    photosPrompt: "📷 Fotos gesendet",
    photosOk:
      "✅ *Fotos gespeichert!* Fahrzeugzustand dokumentiert.\n\n🚗 *Gute Fahrt!*\n• Rückgabe: {return}\n• Im Notfall *SOS PANIK*",
    sosActive: "🚨 *SOS-ALARM!*\n\nGPS-Position senden bestätigen:",
    sosSent: "🚨 *ALARM GESENDET!* Team benachrichtigt.",
    sosUnavailable: "SOS verfügbar wenn das Auto unterwegs ist.",
    invalidDate: "Datum nicht erkannt. Versuchen Sie TT/MM.",
    invalidReturn: "Rückgabe muss nach Abholung liegen.",
    invalidDuration: "Geben Sie die Tage an (z.B. 5 Tage).",
    activeReply: "Danke! Team 24/7. Notfall: *SOS PANIK*.",
    choose: "Wählen",
    payDeposit: "💳 50€ Anzahlung",
    sendDocs: "Dokumente senden",
    sendPhotos: "4 Fotos senden",
    today: "Heute",
    tomorrow: "Morgen",
    dayAfterTomorrow: "Übermorgen",
    in3days: "In 3 Tagen",
    in5days: "In 5 Tagen",
    in2weeks: "In 2 Wochen",
    weekend: "Nächsten Samstag",
    nextWeek: "In 1 Woche",
    askPhone:
      "Danke, *{name}*! 📱 Ihre *Handynummer* (mit Ländervorwahl)?\n_Z.B. +351 912 345 678, nur für Buchung und Abholung._",
    phoneQuick: ["+351 912 000 000", "+49 170 0000000", "+44 7700 900000", "✍️ Andere Nummer"],
    askPickupLocation: "Wo möchten Sie das Auto *abholen*?",
    pickupLocationOptions: [
      "✈️ Flughafen Madeira (FNC)",
      "🏢 Autocunha Filiale, Funchal",
      "🏨 Hotelzustellung (Funchal)",
      "📍 Anderer Ort auf der Insel",
    ],
    askFlight:
      "Haben Sie einen *Flug nach Madeira*? Ankunftszeit hilft bei der Abholung.\n_(Oder « Kein Flug »)_",
    flightSkip: "Kein Flug / bereits auf der Insel",
    flightQuick: ["✈️ Ankunft ~08:00", "✈️ Ankunft ~12:00", "✈️ Ankunft ~16:00", "✈️ Ankunft ~20:00"],
    intakeSummary:
      "📋 *Zusammenfassung vor dem Schalter* (Sofia)\n• {name}, {phone}\n• {pickup} bis {return} ({days}T), {time}\n• Ort: {location}\n• Flug: {flight}\n• Gruppe: {group}\n\nNoch Fahrzeug, Schutz und Anzahlung; am Schalter nur Schlüssel.",
    groupOptions: [
      "1 Person, 1 kleiner Koffer",
      "2 Personen, 2 Koffer",
      "3-4 Personen, 3-4 Koffer",
      "5+ Personen / viel Gepäck",
    ],
    protectionZero: "🛡️ ZERO Selbstbeteiligung, +€{extra}/Tag",
    protectionStandard: "💳 Standard, Kaution €{caucao}",
    acceptQuote: "✅ Angebot annehmen",
    changeProtection: "🔄 Schutz ändern",
    confirmSos: "✅ SOS + GPS bestätigen",
    cancelSos: "❌ Abbrechen",
    aiAnalyzing: "KI analysiert...",
    aiAckUnderstood: "💡 *Verstanden.*",
    aiAckName: "💡 Hallo *{name}*!",
    aiAckDates: "💡 {days} Tag(e), {pickup} bis {return}.",
    aiAckVehicle: "💡 *{vehicle}* in der Flotte.",
    faqChip: "❓ Hilfe / FAQ",
    langConfirmed: "Gut, wir machen weiter auf *Deutsch* 🇩🇪",
    welcomeIntro:
      "Hallo! 😊 Ich bin *Sofia*, Buchungsassistentin bei *Autocunha Rent-a-Car* auf Madeira.\n\n" +
      "Ich bereite Ihre Miete *vor dem Schalter* vor: Datum, Fahrzeug, Schutz, Vertrag und Dokumente. " +
      "Am Schalter holen Sie vor allem den Schlüssel ab.\n\n" +
      "Wie lautet Ihr *vollständiger Name*?",
    askNameShort: "Wie heißen Sie? Bitte Ihren *vollständigen Namen*.",
  },
};

export function t(lang: ChatLang, key: string, vars?: Record<string, string | number>): string {
  const raw = T[lang][key] ?? T.pt[key] ?? key;
  if (Array.isArray(raw)) return raw.join("|");
  let s = String(raw);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return s;
}

export function tList(lang: ChatLang, key: string): string[] {
  const raw = T[lang][key] ?? T.pt[key];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.includes("|")) return raw.split("|");
  return typeof raw === "string" ? [raw] : [];
}

function daysUntilNextSaturday(from: Date): number {
  const day = from.getDay();
  if (day === 6) return 7;
  return (6 - day + 7) % 7 || 0;
}

export function quickDates(lang: ChatLang) {
  const fmt = (d: Date) =>
    d.toLocaleDateString(localeFor(lang), { weekday: "short", day: "2-digit", month: "2-digit" });
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  return [
    { label: `📅 ${t(lang, "today")}, ${fmt(base)}`, days: 0 },
    { label: `📅 ${t(lang, "tomorrow")}, ${fmt(addDaysLocal(base, 1))}`, days: 1 },
    { label: `📅 ${t(lang, "dayAfterTomorrow")}, ${fmt(addDaysLocal(base, 2))}`, days: 2 },
    { label: `📅 ${t(lang, "in3days")}, ${fmt(addDaysLocal(base, 3))}`, days: 3 },
    { label: `📅 ${t(lang, "in5days")}, ${fmt(addDaysLocal(base, 5))}`, days: 5 },
    { label: `📅 ${t(lang, "weekend")}, ${fmt(addDaysLocal(base, daysUntilNextSaturday(base)))}`, days: daysUntilNextSaturday(base) },
    { label: `📅 ${t(lang, "nextWeek")}, ${fmt(addDaysLocal(base, 7))}`, days: 7 },
    { label: `📅 ${t(lang, "in2weeks")}, ${fmt(addDaysLocal(base, 14))}`, days: 14 },
  ];
}

const DURATION_DAYS = [1, 2, 3, 4, 5, 7, 10, 14, 21];

/** Opções de duração com data de devolução calculada */
export function buildDurationOptions(lang: ChatLang, pickup: Date) {
  const fmtDate = (d: Date) =>
    d.toLocaleDateString(localeFor(lang), { day: "2-digit", month: "2-digit", year: "numeric" });

  return [
    ...DURATION_DAYS.map((days) => ({
      days,
      label: t(lang, "durationOption", { days, return: fmtDate(addDaysLocal(pickup, days)) }),
      isCustom: false,
    })),
    { days: 0, label: t(lang, "durationCustom"), isCustom: true },
  ];
}

function addDaysLocal(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function pickupTimeOptions(lang: ChatLang): string[] {
  return tList(lang, "pickupTimeOptions");
}

/** Extrai número de dias de texto livre: "5 dias", "10 days", "7" */
export function parseDaysFromText(text: string): number | null {
  const lower = text.toLowerCase().trim();
  const explicit = lower.match(/(\d+)\s*(dia|dias|day|days|jour|jours|tag|tage|día|días)?/i);
  if (explicit) {
    const n = parseInt(explicit[1], 10);
    if (n >= 1 && n <= 90) return n;
  }
  const alone = lower.match(/^(\d+)$/);
  if (alone) {
    const n = parseInt(alone[1], 10);
    if (n >= 1 && n <= 90) return n;
  }
  return null;
}

export function isCustomDurationOption(opt: string, lang: ChatLang): boolean {
  return opt === t(lang, "durationCustom") || /outra data|other date|autre date|otra fecha|anderes datum|custom/i.test(opt);
}

export function parsePhoneFromText(text: string): string | null {
  const digits = text.replace(/[^\d+]/g, "");
  const m = text.match(/(\+?\d[\d\s]{8,18}\d)/);
  if (m) return m[1].replace(/\s/g, "");
  if (digits.length >= 9) return digits.startsWith("+") ? digits : `+${digits}`;
  return null;
}

export function horaFromPickupSlot(slot: string): string {
  const m = slot.match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "10:00";
}

export function horaFromFlightText(text: string): string | null {
  const m = text.match(/(\d{1,2})[h:.](\d{2})?/);
  if (m) return `${m[1].padStart(2, "0")}:${(m[2] ?? "00").padStart(2, "0")}`;
  if (/08|manhã|morning/i.test(text)) return "08:30";
  if (/12|meio/i.test(text)) return "12:00";
  if (/16|tarde/i.test(text)) return "16:00";
  if (/20|noite|evening/i.test(text)) return "20:00";
  return null;
}

export function isFlightSkip(text: string, lang: ChatLang): boolean {
  return (
    text === t(lang, "flightSkip") ||
    /sem voo|no flight|pas de vol|sin vuelo|kein flug|já estou|already on/i.test(text)
  );
}

export function localeFor(lang: ChatLang): string {
  const map: Record<ChatLang, string> = {
    pt: "pt-PT",
    en: "en-GB",
    fr: "fr-FR",
    es: "es-ES",
    de: "de-DE",
  };
  return map[lang];
}
