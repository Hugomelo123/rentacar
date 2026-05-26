const SKIP_KEY = "autocunha_skip_intro";
const WHATSAPP_FOCUS_KEY = "autocunha_focus_whatsapp";

export function shouldSkipIntro(): boolean {
  try {
    return localStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSkipIntro(skip: boolean): void {
  try {
    if (skip) localStorage.setItem(SKIP_KEY, "1");
    else localStorage.removeItem(SKIP_KEY);
  } catch {
    /* private mode */
  }
}

export function requestWhatsAppFocus(): void {
  try {
    sessionStorage.setItem(WHATSAPP_FOCUS_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function consumeWhatsAppFocus(): boolean {
  try {
    const on = sessionStorage.getItem(WHATSAPP_FOCUS_KEY) === "1";
    if (on) sessionStorage.removeItem(WHATSAPP_FOCUS_KEY);
    return on;
  } catch {
    return false;
  }
}
