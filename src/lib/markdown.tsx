import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Minimal, safe Markdown → React renderer for editorial content. It never
 * injects HTML: headings (##, ###), paragraphs, lists, blockquotes, rules,
 * **bold**, *italic* and [links](url) with http(s), mailto or site-relative URLs.
 */
export type Block =
  | { t: 'h'; level: 2 | 3 | 4; text: string }
  | { t: 'p'; text: string }
  | { t: 'ul' | 'ol'; items: string[] }
  | { t: 'quote'; text: string }
  | { t: 'hr' };

export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ t: 'p', text: para.join(' ').trim() });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (h) {
      flush();
      blocks.push({ t: 'h', level: Math.min(4, Math.max(2, h[1].length + (h[1].length === 1 ? 1 : 0))) as 2 | 3 | 4, text: h[2] });
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flush();
      blocks.push({ t: 'hr' });
      continue;
    }
    if (trimmed.startsWith('>')) {
      flush();
      const q: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) q.push(lines[i++].trim().replace(/^>\s?/, ''));
      i--;
      blocks.push({ t: 'quote', text: q.join(' ') });
      continue;
    }
    const ul = /^[-*]\s+/.test(trimmed);
    const ol = /^\d+[.)]\s+/.test(trimmed);
    if (ul || ol) {
      flush();
      const items: string[] = [];
      const re = ul ? /^[-*]\s+/ : /^\d+[.)]\s+/;
      while (i < lines.length && re.test(lines[i].trim())) items.push(lines[i++].trim().replace(re, ''));
      i--;
      blocks.push({ t: ul ? 'ul' : 'ol', items });
      continue;
    }
    para.push(trimmed);
  }
  flush();
  return blocks;
}

export function safeHref(url: string): string | null {
  const u = url.trim();
  if (/^(https?:|mailto:)/i.test(u)) return u;
  if (u.startsWith('/') && !u.startsWith('//')) return u;
  if (u.startsWith('#')) return u;
  return null;
}

export function inline(text: string, keyPrefix = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${n++}`;
    if (m[1] !== undefined) {
      const href = safeHref(m[2]);
      if (!href) out.push(m[1]);
      else if (href.startsWith('/')) out.push(<Link key={key} to={href}>{m[1]}</Link>);
      else out.push(<a key={key} href={href} target="_blank" rel="noopener noreferrer">{m[1]}</a>);
    } else if (m[3] !== undefined) out.push(<strong key={key}>{inline(m[3], key)}</strong>);
    else out.push(<em key={key}>{m[4] ?? m[5]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  return (
    <>
      {parseBlocks(source).map((b, i) => {
        const k = `b${i}`;
        switch (b.t) {
          case 'h': {
            const H = `h${b.level}` as 'h2' | 'h3' | 'h4';
            return <H key={k}>{inline(b.text, k)}</H>;
          }
          case 'p':
            return <p key={k}>{inline(b.text, k)}</p>;
          case 'ul':
            return <ul key={k}>{b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}</ul>;
          case 'ol':
            return <ol key={k}>{b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}</ol>;
          case 'quote':
            return <blockquote key={k}>{inline(b.text, k)}</blockquote>;
          case 'hr':
            return <hr key={k} />;
          default:
            return <Fragment key={k} />;
        }
      })}
    </>
  );
}

export function plainText(src: string): string {
  return parseBlocks(src)
    .map((b) => ('text' in b ? b.text : 'items' in b ? b.items.join(' ') : ''))
    .join(' ')
    .replace(/\*\*|\*|_|\[([^\]]+)\]\([^)]+\)/g, '$1');
}
