/**
 * PJe-Calc v2.15.1 — CalculoJRAdapter (abstract)
 * Porte TS-adaptado de:
 *   br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.CalculoJRAdapter
 *
 * Ref Java: pjecalc-fonte/.../calculo/relatorio/CalculoJRAdapter.java
 *
 * Adapter raiz do relatório do cálculo. Agrega sub-adapters para cada seção
 * (demonstrativo, resumo, FGTS, INSS, IRPF, juros, multa, honor, custas,
 * pensão, seguro desemprego, salário família, previdência privada).
 *
 * Subclasse concreta: `CalculoJRAdapterPadrao`.
 */
import type { Periodo } from '../../../base/comum/periodo';
import { JRAdapter, JRAdapterDataSource, type JREmptyDS } from './jr-adapter';
import type { AbstractResumoPrecatorioJrAdapter } from './abstract-resumo-precatorio-jr-adapter';
import type { ApuracaoDeJurosJRAdapter } from './apuracao-de-juros-jr-adapter';
import type { CustaJRAdapter } from './custa-jr-adapter';
import type { DemonstrativoJRAdapter } from './demonstrativo-jr-adapter';
import type { EsocialInssFgtsJRAdapter } from './esocial-inss-fgts-jr-adapter';
import type { FGTSJRAdapter } from './fgts-jr-adapter';
import type { HonorarioJRAdapter } from './honorario-jr-adapter';
import type { InssJRAdapter } from './inss-jr-adapter';
import type { IrpfJRAdapter } from './irpf-jr-adapter';
import type { JustificativaJRAdapter } from './justificativa-jr-adapter';
import type { MultaJRAdapter } from './multa-jr-adapter';
import type { PensaoAlimenticiaJRAdapter } from './pensao-alimenticia-jr-adapter';
import type { PrevidenciaPrivadaJRAdapter } from './previdencia-privada-jr-adapter';
import type { ResumoJRAdapter } from './resumo-jr-adapter';
import type { SalarioFamiliaJRAdapter } from './salario-familia-jr-adapter';
import type { SeguroDesempregoJRAdapter } from './seguro-desemprego-jr-adapter';

export abstract class CalculoJRAdapter extends JRAdapter {
  // ─── Flags de seção (qual mostrar) ───
  abstract getMostrarDemonstrativo(): boolean;
  abstract getMostrarResumo(): boolean;
  abstract getMostrarResumoPrecatorio(): boolean;
  abstract getMostrarDemonstrativoFGTS(): boolean;
  abstract getMostrarDemonstrativoINSS(): boolean;
  abstract getMostrarDemonstrativoEsocialInssFgts(): boolean;
  abstract getMostrarPensaoAlimenticia(): boolean;
  abstract getMostrarSeguroDesemprego(): boolean;
  abstract getMostrarSalarioFamilia(): boolean;
  abstract getMostrarPrevidenciaPrivada(): boolean;
  abstract getMostrarApuracaoDeJuros(): boolean;
  abstract getMostrarMulta(): boolean;
  abstract getMostrarHonorario(): boolean;
  abstract getMostrarIrpf(): boolean;
  abstract getMostrarCustas(): boolean;
  abstract getMostrarComentarios(): boolean;
  abstract getMostrarJustificativas(): boolean;

  // ─── Cabeçalho ───
  abstract getNumeroDoProcesso(): string;
  abstract getNumeroDoCalculo(): string;
  abstract getReclamante(): string;
  abstract getReclamado(): string;
  abstract getPeriodoDeCalculo(): Periodo;
  abstract getDataDeAjuizamento(): Date;
  abstract getDataDaLiquidacao(): Date;
  abstract getComentarios(): string;

  // ─── Sub-adapters ───
  abstract getDemonstrativo(): DemonstrativoJRAdapter;
  abstract getResumo(): ResumoJRAdapter;
  abstract getResumoPrecatorio(): AbstractResumoPrecatorioJrAdapter;
  abstract getDemonstrativoFGTS(): FGTSJRAdapter;
  abstract getDemonstrativoINSS(): InssJRAdapter;
  abstract getDemonstrativoEsocialInssFgts(): EsocialInssFgtsJRAdapter;
  abstract getPensaoAlimenticia(): PensaoAlimenticiaJRAdapter;
  abstract getSeguroDesemprego(): SeguroDesempregoJRAdapter;
  abstract getSalarioFamilia(): SalarioFamiliaJRAdapter;
  abstract getPrevidenciaPrivada(): PrevidenciaPrivadaJRAdapter;
  abstract getApuracaoDeJuros(): ApuracaoDeJurosJRAdapter;
  abstract getMulta(): MultaJRAdapter;
  abstract getHonorario(): HonorarioJRAdapter;
  abstract getIrpf(): IrpfJRAdapter;
  abstract getCustas(): CustaJRAdapter;
  abstract getJustificativa(): JustificativaJRAdapter;

  /** getEmptyDS — data source vazia para relatórios sem bean coletivo. */
  abstract getEmptyDS(): JRAdapterDataSource<JRAdapter>;

  static createEmptyDataSource<T extends JRAdapter>(adapter: T): JRAdapterDataSource<T> {
    return new JRAdapterDataSource(adapter, [] as JREmptyDS[]);
  }
}
