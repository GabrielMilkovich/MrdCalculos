/**
 * Irpf.validarQuantidadeDependentes — golden (Fase 5)
 *
 * Fidelidade 1-a-1 com Irpf.java:486-490.
 */
import { describe, it, expect } from 'vitest';

import { Irpf } from '../irpf';
import { NegocioException } from '../../../../comum/exceptions/negocio-exception';
import { Mensagens } from '../../../../comum/mensagens';

describe('Irpf.validarQuantidadeDependentes', () => {
  it('possuiDependentes=false, qtd=0: passa', () => {
    const irpf = new Irpf();
    irpf.setPossuiDependentes(false);
    irpf.setQuantidadeDependentes(0);
    expect(() => irpf.validarQuantidadeDependentes()).not.toThrow();
  });

  it('possuiDependentes=true, qtd=2: passa', () => {
    const irpf = new Irpf();
    irpf.setPossuiDependentes(true);
    irpf.setQuantidadeDependentes(2);
    expect(() => irpf.validarQuantidadeDependentes()).not.toThrow();
  });

  it('possuiDependentes=true, qtd=0: lança NegocioException MSG0004', () => {
    const irpf = new Irpf();
    irpf.setPossuiDependentes(true);
    irpf.setQuantidadeDependentes(0);
    try {
      irpf.validarQuantidadeDependentes();
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(NegocioException);
      const msg = (e as NegocioException).getMensagensDeRecurso()[0];
      expect(msg.getChave()).toBe(Mensagens.MSG0004);
      expect(msg.getAtributo()).toBe('quantidadeDependentes');
    }
  });

  it('possuiDependentes=false, qtd=5 (inconsistente mas tolerável): passa', () => {
    // Java só valida a combinação possui=true && qtd=0; o contrário é tolerado.
    const irpf = new Irpf();
    irpf.setPossuiDependentes(false);
    irpf.setQuantidadeDependentes(5);
    expect(() => irpf.validarQuantidadeDependentes()).not.toThrow();
  });
});
