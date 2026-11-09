import { describe, expect, it } from 'vitest';
import { detectCrisis } from '../src/lib/crisis';

describe('detectCrisis', () => {
  it.each([
    ['A veces pienso en el suicidio', 'suicidio'],
    ['Ya no quiero vivir así', 'suicidio'],
    ['Quiero morirme', 'suicidio'],
    ['Estoy pensando en quitarme la vida', 'suicidio'],
    ['QUIERO ACABAR CON TODO', 'suicidio'],
    ['me corté anoche', 'autolesion'],
    ['tengo ganas de hacerme daño', 'autolesion'],
    ['Mi pareja me pegó otra vez', 'violencia'],
    ['me amenazó con quitarme a los niños', 'violencia'],
    ['Tengo miedo de que me haga daño', 'violencia'],
    ['Creo que estoy en peligro', 'peligro'],
    ['tiene un arma en casa', 'peligro'],
    ['no estoy a salvo aquí', 'peligro'],
  ])('detecta "%s" como %s', (text, category) => {
    const r = detectCrisis(text);
    expect(r.detected).toBe(true);
    expect(r.categories).toContain(category);
  });

  it.each([
    'Me muero de ganas de escribirle',
    'Estoy triste y lo extraño',
    'No puedo dejar de pensar en ella',
    'Hoy fue un día difícil pero estoy bien',
    'Quiero matar el tiempo viendo series',
    '',
  ])('no marca "%s"', (text) => {
    expect(detectCrisis(text).detected).toBe(false);
  });

  it('ignora tildes y mayúsculas', () => {
    expect(detectCrisis('QUIERO HACERME DANO').detected).toBe(true);
    expect(detectCrisis('Suicídio').detected).toBe(true);
  });
});
