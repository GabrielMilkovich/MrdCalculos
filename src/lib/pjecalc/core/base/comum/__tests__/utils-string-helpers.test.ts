/**
 * Testes dos string helpers de Utils — Fase 1.
 */
import { describe, it, expect } from 'vitest';
import {
  isVazio,
  isNaoVazios,
  substituirPontoPorVirgula,
  filtrarSomenteNumeros,
  objetoParaString,
} from '../utils';

describe('isVazio / isNaoVazios', () => {
  it('isVazio é true para null, undefined e string vazia', () => {
    expect(isVazio(null)).toBe(true);
    expect(isVazio(undefined)).toBe(true);
    expect(isVazio('')).toBe(true);
  });
  it('isVazio é false para string com conteúdo (inclusive espaço)', () => {
    expect(isVazio('a')).toBe(false);
    expect(isVazio(' ')).toBe(false);
  });
  it('isNaoVazios true quando todos os args têm conteúdo', () => {
    expect(isNaoVazios('a', 'b', 'c')).toBe(true);
    expect(isNaoVazios('x')).toBe(true);
    expect(isNaoVazios()).toBe(true);
  });
  it('isNaoVazios false se algum é null/undefined/vazio', () => {
    expect(isNaoVazios('a', '', 'c')).toBe(false);
    expect(isNaoVazios('a', null, 'c')).toBe(false);
    expect(isNaoVazios('a', undefined)).toBe(false);
  });
});

describe('substituirPontoPorVirgula', () => {
  it('substitui apenas o último ponto (útil para separador decimal BR)', () => {
    expect(substituirPontoPorVirgula('1234.56')).toBe('1234,56');
    expect(substituirPontoPorVirgula('1.234.56')).toBe('1.234,56');
    expect(substituirPontoPorVirgula('0.5')).toBe('0,5');
  });
  it('devolve string sem ponto inalterada', () => {
    expect(substituirPontoPorVirgula('abc')).toBe('abc');
    expect(substituirPontoPorVirgula('')).toBe('');
  });
});

describe('filtrarSomenteNumeros', () => {
  it('extrai só os dígitos', () => {
    expect(filtrarSomenteNumeros('123.456.789-00')).toBe('12345678900');
    expect(filtrarSomenteNumeros('(11) 98765-4321')).toBe('11987654321');
    expect(filtrarSomenteNumeros('abc 123 def')).toBe('123');
    expect(filtrarSomenteNumeros('')).toBe('');
  });
  it('preserva null/undefined sem lançar', () => {
    expect(filtrarSomenteNumeros(null)).toBe(null);
    expect(filtrarSomenteNumeros(undefined)).toBe(undefined);
  });
});

describe('objetoParaString', () => {
  it('formata classe com getters', () => {
    class Exemplo {
      private _x = 10;
      private _nome = 'foo';
      getX(): number { return this._x; }
      getNome(): string { return this._nome; }
    }
    const o = new Exemplo();
    expect(objetoParaString(o, 'x', 'nome')).toBe('Exemplo [x:10, nome:foo]');
  });
  it('cai para acesso direto quando não há getter', () => {
    const obj = { id: 42, label: 'hello' };
    expect(objetoParaString(obj, 'id', 'label')).toBe('Object [id:42, label:hello]');
  });
  it('devolve string do não-objeto', () => {
    expect(objetoParaString(null)).toBe('null');
    expect(objetoParaString(42)).toBe('42');
  });
  it('sem atributos, emite só o nome da classe', () => {
    class X {}
    expect(objetoParaString(new X())).toBe('X []');
  });
});
