import { data, newId } from './data';

export interface Lead {
  kind: 'ebook' | 'contacto';
  name: string;
  email: string;
  message?: string;
  consent: boolean;
  createdAt: string;
}

export interface LeadResult {
  ok: boolean;
  delivered: 'remote' | 'local';
  error?: string;
}

const ENDPOINT = (import.meta.env.VITE_LEADS_ENDPOINT as string | undefined)?.trim();

/**
 * Sends the lead to VITE_LEADS_ENDPOINT when configured. Otherwise (or if the
 * request fails) it is stored encrypted on this device so nothing is lost.
 */
export async function submitLead(input: Omit<Lead, 'createdAt'>): Promise<LeadResult> {
  const lead: Lead = { ...input, createdAt: new Date().toISOString() };
  if (ENDPOINT) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      if (res.ok) return { ok: true, delivered: 'remote' };
    } catch {
      // Falls through to local storage.
    }
  }
  await data().put('leads', newId(), lead);
  return { ok: true, delivered: 'local' };
}
