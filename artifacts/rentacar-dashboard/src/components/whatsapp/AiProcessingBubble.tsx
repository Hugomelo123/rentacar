import React, { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { ChatLang } from "@/lib/chat-i18n";
import { getAiLoadingPhrases } from "@/lib/chat-i18n";

type Props = {
  lang: ChatLang;
  onComplete: () => void;
  /** Duração total da animação (ms) — fixa por sessão para não reiniciar */
  durationMs?: number;
};

export function AiProcessingBubble({ lang, onComplete, durationMs = 1200 }: Props) {
  const phrases = getAiLoadingPhrases(lang);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const phraseInterval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }, 380);

    const done = setTimeout(() => {
      clearInterval(phraseInterval);
      onCompleteRef.current();
    }, durationMs);

    return () => {
      clearInterval(phraseInterval);
      clearTimeout(done);
    };
  }, [durationMs, phrases.length]);

  const progress = Math.min(100, Math.round(((phraseIndex + 1) / phrases.length) * 100));

  return (
    <div className="flex flex-col items-start">
      <div className="max-w-[88%] px-4 py-3 rounded-lg rounded-tl-none shadow-sm bg-white border border-[#25D366]/30">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#075E54] to-[#25D366] flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
          </div>
          <span className="text-xs font-semibold text-[#075E54] uppercase tracking-wide">IA Autocunha</span>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[#128C7E]" />
          <span className="text-sm text-gray-700">{phrases[phraseIndex]}</span>
        </div>
        <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#075E54] to-[#25D366] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
