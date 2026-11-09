import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> ; resultIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

type Ctor = new () => SpeechRecognitionLike;

function getCtor(): Ctor | undefined {
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/**
 * Optional dictation via the Web Speech API. Note: in some browsers the
 * audio is processed by the browser vendor's servers; the UI says so.
 */
export function useSpeech(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const supported = typeof window !== 'undefined' && !!getCtor();

  useEffect(() => () => rec.current?.stop(), []);

  const toggle = useCallback(() => {
    if (!supported) return;
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = getCtor()!;
    const r = new Ctor();
    r.lang = 'es-ES';
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text) onText(text);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  }, [listening, onText, supported]);

  return { supported, listening, toggle };
}
