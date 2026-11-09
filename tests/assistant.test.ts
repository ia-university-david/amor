import { describe, expect, it } from 'vitest';
import { classifyTopic, localReply } from '../src/lib/assistant/localProvider';
import { difficultDayResponse } from '../src/lib/difficultDay';
import type { ChatMessage } from '../src/lib/assistant/types';

const msg = (text: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: '1', role: 'user', text, at: new Date().toISOString(), ...extra,
});

const consent = { aiSensitiveConsent: true, memoryConsent: false };
const noConsent = { aiSensitiveConsent: false, memoryConsent: false };

describe('asistente local', () => {
  it('interrumpe con pantalla de seguridad ante riesgo, incluso sin consentimiento', () => {
    const r = localReply(msg('no quiero seguir viviendo'), noConsent);
    expect(r.crisis?.detected).toBe(true);
  });

  it('no interpreta texto libre sin consentimiento', () => {
    const r = localReply(msg('tengo ganas de escribirle'), noConsent);
    expect(r.text).toContain('no voy a interpretar');
    expect(r.suggestions).toBeUndefined();
  });

  it('responde a temas elegidos aunque no haya consentimiento', () => {
    const r = localReply(msg('Tengo ganas de escribirle', { topic: 'impulso' }), noConsent);
    expect(r.suggestions?.[0].to).toBe('/app/pausa');
  });

  it('clasifica texto libre con consentimiento', () => {
    expect(classifyTopic('Quiero escribirle ahora mismo')).toBe('impulso');
    expect(classifyTopic('No puedo dormir nada')).toBe('dormir');
    expect(classifyTopic('Hoy estoy mejor')).toBe('mejor');
    expect(classifyTopic('No me siento mejor')).not.toBe('mejor');
    expect(classifyTopic('solo quiero entender por qué me pasa')).toBe('entender');
  });

  it('aclara que es una IA y no Laura Rojas', () => {
    const r = localReply(msg('¿Eres Laura?'), consent);
    expect(r.text).toContain('No soy Laura Rojas');
    expect(r.text).toContain('inteligencia artificial');
  });
});

describe('respuesta de "Hoy fue difícil"', () => {
  it('no trata el contacto necesario como recaída', () => {
    const r = difficultDayResponse({ type: 'necesario' });
    expect(r).toContain('No cuenta como un paso atrás');
    expect(r).not.toMatch(/reca[ií]da/);
  });

  it('adapta la respuesta a lo que se buscaba', () => {
    const r = difficultDayResponse({ type: 'envie-mensaje', seeking: 'Sentir algo de tranquilidad.', after: 'peor' });
    expect(r).toContain('Entiendo que buscabas sentir algo de tranquilidad.');
    expect(r).toContain('sin juzgarte');
  });
});
