import { describe, expect, it } from 'vitest';
import { groupFullySelected, keptFromCards, RULE_CATALOG, setGroup, toggleRule } from '../src/lib/rules';

describe('selección de reglas', () => {
  it('alterna una regla sin duplicarla', () => {
    const once = toggleRule([], 'redes');
    expect(once).toEqual(['redes']);
    const off = toggleRule(once, 'redes');
    expect(off).toEqual([]);
    expect(toggleRule(off, 'redes')).toEqual(['redes']);
  });

  it('marca y desmarca un grupo entero', () => {
    const redes = setGroup([], 'redes', true);
    expect(redes.sort()).toEqual(['en-linea', 'investigar', 'redes']);
    expect(groupFullySelected(redes, 'redes')).toBe(true);
    expect(groupFullySelected(redes, 'recuerdos')).toBe(false);
    const withChat = toggleRule(redes, 'chats');
    expect(setGroup(withChat, 'redes', false)).toEqual(['chats']);
  });

  it('las tarjetas conservan solo las que la persona se queda, en el orden del catálogo', () => {
    const kept = keptFromCards([
      { id: 'fotos', keep: true },
      { id: 'redes', keep: false },
      { id: 'llamar', keep: true },
      { id: 'desconocida', keep: true },
    ]);
    expect(kept).toEqual(['llamar', 'fotos']);
    expect(RULE_CATALOG.map((r) => r.id)).toEqual(expect.arrayContaining(kept));
  });

  it('el grupo de contacto necesario existe y no se confunde con un castigo', () => {
    const necesarios = setGroup([], 'necesario', true);
    expect(necesarios).toEqual(['asuntos']);
    expect(RULE_CATALOG.find((r) => r.id === 'asuntos')?.text).toMatch(/necesario/i);
  });
});
