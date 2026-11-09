import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { Markdown, parseBlocks, plainText, safeHref } from '../src/lib/markdown';

const html = (src: string) =>
  renderToStaticMarkup(
    <StaticRouter location="/">
      <Markdown source={src} />
    </StaticRouter>,
  );

describe('markdown seguro', () => {
  it('reconoce títulos, listas, citas y párrafos', () => {
    const blocks = parseBlocks('## Título\n\nUn párrafo\nque sigue.\n\n- uno\n- dos\n\n1. a\n2. b\n\n> cita\n\n---');
    expect(blocks.map((b) => b.t)).toEqual(['h', 'p', 'ul', 'ol', 'quote', 'hr']);
    expect(blocks[1]).toEqual({ t: 'p', text: 'Un párrafo que sigue.' });
  });

  it('no inyecta HTML', () => {
    const out = html('Hola <script>alert(1)</script> <img src=x onerror=alert(1)>');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;script&gt;');
  });

  it('solo permite enlaces http(s), mailto y rutas internas', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,hi')).toBeNull();
    expect(safeHref('//evil.com')).toBeNull();
    expect(safeHref('https://amortoxico.com')).toBe('https://amortoxico.com');
    expect(safeHref('/app/pausa')).toBe('/app/pausa');
    const out = html('[malo](javascript:alert(1)) y [bueno](/app/pausa) y [fuera](https://example.com)');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('href="/app/pausa"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('negritas y cursivas', () => {
    expect(html('Esto es **importante** y *suave*')).toBe('<p>Esto es <strong>importante</strong> y <em>suave</em></p>');
  });

  it('texto plano para descripciones', () => {
    expect(plainText('## Hola\n\nUn **día** [difícil](/app/dificil)')).toBe('Hola Un día difícil');
  });
});
