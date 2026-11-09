import { api } from './api';
import { data, newId } from './data';

export interface Lead {
  kind: 'ebook' | 'contacto';
  name: string;
  email: string;
  message?: string;
  consent: boolean;
  createdAt: string;
  /** True while the lead only exists on this device and still has to reach the server. */
  pending?: boolean;
}

export interface LeadResult {
  ok: boolean;
  delivered: 'remote' | 'local';
  /** For the eBook: the server sent a confirmation email (double opt-in). */
  status?: 'pending-confirmation' | 'confirmed' | 'received';
  error?: string;
}

async function send(lead: Omit<Lead, 'createdAt' | 'pending'> & { website?: string }) {
  return api<{ ok: boolean; status: LeadResult['status'] }>('/leads', {
    json: { kind: lead.kind, name: lead.name, email: lead.email, message: lead.message || undefined, consent: true, website: lead.website || undefined },
  });
}

/**
 * Sends the form to the API. Validation errors are returned to the form;
 * if the server is unreachable the lead is kept encrypted on this device
 * and retried later, so nothing is lost.
 */
export async function submitLead(input: Omit<Lead, 'createdAt'> & { website?: string }): Promise<LeadResult> {
  if (!input.consent) return { ok: false, delivered: 'local', error: 'Necesitamos tu consentimiento para responderte.' };
  const res = await send(input);
  if (res.ok) return { ok: true, delivered: 'remote', status: res.data?.status };
  if (res.status >= 400 && res.status < 500) return { ok: false, delivered: 'remote', error: res.error };
  const { website: _ignored, ...lead } = input;
  await data().put('leads', newId(), { ...lead, createdAt: new Date().toISOString(), pending: true } satisfies Lead);
  return { ok: true, delivered: 'local' };
}

/** Retries leads saved while offline. Delivered ones are removed from the device. */
export async function flushPendingLeads(): Promise<number> {
  const items = await data().list<Lead>('leads');
  let sent = 0;
  for (const { id, value } of items) {
    if (!value.pending) continue;
    const res = await send(value);
    if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
      await data().remove('leads', id);
      if (res.ok) sent++;
    } else if (res.status === 0) {
      break;
    }
  }
  return sent;
}
