/**
 * PJe-Calc v2.15.1 — JRAdapter base (infra de relatórios)
 * Porte TS-adaptado de: br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter
 *
 * Ref Java: pjecalc-fonte/base/br/jus/trt8/pjecalc/base/comum/relatorio/JRAdapter.java
 *
 * ## Estratégia do port
 *
 * O Java usa **JasperReports** (servidor) para gerar PDFs. Na plataforma web
 * (TS/React), JasperReports não se aplica — usamos uma abordagem alternativa:
 *
 * Cada `JRAdapter` vira uma classe TS que expõe um método `adapt(bean)` e
 * uma série de getters que projetam dados do domínio para a estrutura
 * necessária pelo template de relatório (HTML/PDF).
 *
 * O consumo do relatório passa a ser: instanciar o adapter com o bean do
 * domínio → renderizar o template (React/PDF lib) → exportar.
 *
 * Este módulo porta apenas a camada adapter; os templates são
 * implementados em componentes React (fora deste diretório).
 */

/**
 * Classe abstrata raiz de todos os adapters de relatório.
 * Subclasses implementam `adapt` (recebe o bean do domínio e retorna o
 * próprio adapter com estado preenchido) e uma série de getters com os
 * campos do relatório.
 */
export abstract class JRAdapter {
  abstract adapt(bean: unknown): JRAdapter;
}

/**
 * JRAdapterDataSource — equivalente TS do JRBeanCollectionDataSource.
 * Percorre uma coleção de beans aplicando `adapt` em cada um.
 */
export class JRAdapterDataSource<T extends JRAdapter> {
  private readonly adapter: T;
  private readonly beanCollection: unknown[];

  constructor(adapter: T, beanCollection: Iterable<unknown>) {
    this.adapter = adapter;
    this.beanCollection = [...beanCollection];
  }

  /** size — análogo ao JRBeanCollectionDataSource.size(). */
  size(): number {
    return this.beanCollection.length;
  }

  /** toArray — retorna lista de beans. */
  toArray(): unknown[] {
    return [...this.beanCollection];
  }

  /** forEach — aplica `adapt` sobre cada bean e chama o callback com o adapter. */
  forEach(fn: (adapter: T, index: number) => void): void {
    for (let i = 0; i < this.beanCollection.length; i++) {
      const a = this.adapter.adapt(this.beanCollection[i]) as T;
      fn(a, i);
    }
  }

  /** map — projeta cada bean para um valor via adapter. */
  map<R>(fn: (adapter: T, index: number) => R): R[] {
    const out: R[] = [];
    for (let i = 0; i < this.beanCollection.length; i++) {
      const a = this.adapter.adapt(this.beanCollection[i]) as T;
      out.push(fn(a, i));
    }
    return out;
  }

  getAdapter(): T { return this.adapter; }
}

/**
 * JREmptyDS — bean marker "sem dados" para relatórios que só têm cabeçalho.
 * Java: `net.sf.jasperreports.engine.data.JREmptyDataSource`.
 */
 
export class JREmptyDS {}
