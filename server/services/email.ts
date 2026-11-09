import type { Config } from '../config';
import type { Logger } from '../logger';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Template id, safe to log. */
  kind: string;
}

export interface EmailTransport {
  send(msg: EmailMessage): Promise<void>;
}

/** Keeps sent messages in memory (tests and the dev mailbox). */
export class MemoryTransport implements EmailTransport {
  readonly sent: (EmailMessage & { at: string })[] = [];
  async send(msg: EmailMessage) {
    this.sent.unshift({ ...msg, at: new Date().toISOString() });
    this.sent.splice(50);
  }
}

/** Development: prints the email (including its link) to the terminal and keeps a copy for /api/dev/mailbox. */
class ConsoleTransport extends MemoryTransport {
  async send(msg: EmailMessage) {
    await super.send(msg);
    process.stdout.write(`\n──── Correo de desarrollo (${msg.kind}) para ${msg.to}\nAsunto: ${msg.subject}\n${msg.text}\n────\n\n`);
  }
}

class SmtpTransport implements EmailTransport {
  private transporter: Promise<import('nodemailer').Transporter>;
  constructor(url: string, private readonly from: string) {
    this.transporter = import('nodemailer').then((m) => (m.default ?? m).createTransport(url));
  }
  async send(msg: EmailMessage) {
    await (await this.transporter).sendMail({ from: this.from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
  }
}

class ResendTransport implements EmailTransport {
  constructor(private readonly apiKey: string, private readonly from: string) {}
  async send(msg: EmailMessage) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
    });
    if (!res.ok) throw new Error(`Resend respondió ${res.status}`);
  }
}

export function createTransport(config: Config): EmailTransport {
  switch (config.EMAIL_TRANSPORT) {
    case 'smtp':
      if (!config.SMTP_URL) throw new Error('EMAIL_TRANSPORT=smtp requiere SMTP_URL');
      return new SmtpTransport(config.SMTP_URL, config.EMAIL_FROM);
    case 'resend':
      if (!config.RESEND_API_KEY) throw new Error('EMAIL_TRANSPORT=resend requiere RESEND_API_KEY');
      return new ResendTransport(config.RESEND_API_KEY, config.EMAIL_FROM);
    case 'memory':
      return new MemoryTransport();
    default:
      return new ConsoleTransport();
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function layout(title: string, paragraphs: string[], action?: { label: string; url: string }): { text: string; html: string } {
  const footer =
    'Amor Tóxico es un espacio de acompañamiento y educación emocional. No es terapia. Si estás en peligro, llama al número de emergencias de tu país.';
  const text = [title, '', ...paragraphs, ...(action ? ['', `${action.label}: ${action.url}`] : []), '', '—', footer].join('\n');
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#FAFAFC;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#22223a">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<h1 style="font-size:22px;font-weight:600;margin:0 0 16px">${escapeHtml(title)}</h1>
${paragraphs.map((p) => `<p style="font-size:16px;line-height:1.6;margin:0 0 14px">${escapeHtml(p)}</p>`).join('\n')}
${action ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="background:#6b5ca5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;display:inline-block;font-weight:600">${escapeHtml(action.label)}</a></p><p style="font-size:13px;color:#6b6b80;word-break:break-all">${escapeHtml(action.url)}</p>` : ''}
<hr style="border:0;border-top:1px solid #e6e6ef;margin:28px 0 16px"><p style="font-size:12px;color:#6b6b80;line-height:1.5">${escapeHtml(footer)}</p>
</div></body></html>`;
  return { text, html };
}

/** Templates. Subjects and bodies never include anything the person wrote in the app. */
export const templates = {
  verify(to: string, url: string): EmailMessage {
    return { to, kind: 'verify', subject: 'Confirma tu correo · Amor Tóxico', ...layout('Confirma tu correo', ['Gracias por crear tu espacio. Confirma que este correo es tuyo para poder recuperar tu cuenta si lo necesitas.', 'El enlace caduca en 24 horas.'], { label: 'Confirmar mi correo', url }) };
  },
  magic(to: string, url: string): EmailMessage {
    return { to, kind: 'magic', subject: 'Tu enlace de acceso · Amor Tóxico', ...layout('Tu enlace de acceso', ['Usa este enlace para entrar. Caduca en 15 minutos y solo funciona una vez.', 'Si no lo pediste, puedes ignorar este correo.'], { label: 'Entrar', url }) };
  },
  reset(to: string, url: string): EmailMessage {
    return { to, kind: 'reset', subject: 'Restablecer tu contraseña · Amor Tóxico', ...layout('Restablecer tu contraseña', ['Recibimos una solicitud para cambiar tu contraseña. El enlace caduca en 1 hora.', 'Si no fuiste tú, ignora este correo: tu contraseña sigue igual.'], { label: 'Elegir una contraseña nueva', url }) };
  },
  leadConfirm(to: string, url: string): EmailMessage {
    return { to, kind: 'lead-confirm', subject: 'Confirma tu solicitud del eBook · Amor Tóxico', ...layout('Confirma tu solicitud', ['Para enviarte el eBook necesitamos confirmar que este correo es tuyo.', 'Si no lo pediste, ignora este mensaje y no volveremos a escribirte.'], { label: 'Confirmar y recibir el eBook', url }) };
  },
  ebook(to: string, url: string | undefined): EmailMessage {
    return url
      ? { to, kind: 'ebook', subject: 'Tu eBook · Amor Tóxico', ...layout('Aquí tienes tu eBook', ['Gracias por confirmar. Puedes descargarlo desde este enlace.'], { label: 'Descargar el eBook', url }) }
      : { to, kind: 'ebook', subject: 'Solicitud confirmada · Amor Tóxico', ...layout('Solicitud confirmada', ['Gracias por confirmar. El eBook se está preparando y te lo enviaremos a este correo en cuanto esté disponible.']) };
  },
  contactNotice(to: string, adminUrl: string): EmailMessage {
    return { to, kind: 'contact-notice', subject: 'Nuevo mensaje de contacto · Amor Tóxico', ...layout('Nuevo mensaje de contacto', ['Llegó un mensaje nuevo desde el formulario de contacto. Por privacidad, el contenido solo se ve en el panel.'], { label: 'Abrir el panel', url: adminUrl }) };
  },
  accountDeleted(to: string): EmailMessage {
    return { to, kind: 'account-deleted', subject: 'Tu cuenta fue eliminada · Amor Tóxico', ...layout('Tu cuenta fue eliminada', ['Borramos tu cuenta y los datos asociados del servidor. Lo que tengas guardado en tus dispositivos no se modifica hasta que lo borres desde Perfil.', 'Gracias por haber estado aquí. Cuídate mucho.']) };
  },
};

export class Mailer {
  constructor(readonly transport: EmailTransport, private readonly log: Logger) {}
  async send(msg: EmailMessage): Promise<boolean> {
    try {
      await this.transport.send(msg);
      this.log.info('email.sent', { kind: msg.kind });
      return true;
    } catch (err) {
      this.log.error('email.failed', { kind: msg.kind, error: (err as Error).message });
      return false;
    }
  }
}
