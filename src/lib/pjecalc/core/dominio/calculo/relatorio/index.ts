/**
 * Barrel do módulo relatorio (Fase 12 do master plan).
 *
 * Ref: pjecalc-fonte/.../calculo/relatorio/
 *
 * Nota: no Java, os relatórios são gerados pelo JasperReports. No port TS,
 * os adapters expõem apenas o modelo de dados — a geração do documento
 * (HTML/PDF) fica a cargo do consumidor (ex: React + react-pdf / jsPDF).
 */

// Infraestrutura base
export { JRAdapter, JRAdapterDataSource, JREmptyDS } from './jr-adapter';

// Adapter principal do relatório do cálculo
export { CalculoJRAdapter } from './calculo-jr-adapter';

// Demonstrativo (verbas + ocorrências)
export {
  DemonstrativoJRAdapter,
  DemonstrativoOcorrenciaAdapter,
  DemonstrativoVerbaAdapter,
} from './demonstrativo-jr-adapter';

// Resumo (totais do cálculo)
export { ResumoJRAdapter, ResumoJRAdapterPagamento } from './resumo-jr-adapter';

// Resumo Precatório (EC 136/2025)
export {
  AbstractResumoPrecatorioJrAdapter,
  ResumoPrecatorioItemAdapter,
} from './abstract-resumo-precatorio-jr-adapter';
export { ResumoPrecatorioJRAdapterPagamento } from './resumo-precatorio-pagamento';

// Módulos de cálculo
export {
  ApuracaoDeJurosJRAdapter,
  ApuracaoDeJurosOcorrenciaAdapter,
} from './apuracao-de-juros-jr-adapter';
export { FGTSJRAdapter, FGTSOcorrenciaAdapter } from './fgts-jr-adapter';
export { InssJRAdapter, InssOcorrenciaAdapter } from './inss-jr-adapter';
export { IrpfJRAdapter, IrpfOcorrenciaAdapter } from './irpf-jr-adapter';
export { HonorarioJRAdapter, HonorarioItemAdapter } from './honorario-jr-adapter';
export { MultaJRAdapter, MultaItemAdapter } from './multa-jr-adapter';
export {
  CustaJRAdapter,
  CustaFixaAdapter,
  AutoJudicialAdapter,
  ArmazenamentoAdapter,
  CustaPagaAdapter,
} from './custa-jr-adapter';
export {
  PensaoAlimenticiaJRAdapter,
  PensaoOcorrenciaAdapter,
} from './pensao-alimenticia-jr-adapter';
export {
  SalarioFamiliaJRAdapter,
  SalarioFamiliaOcorrenciaAdapter,
} from './salario-familia-jr-adapter';
export {
  SeguroDesempregoJRAdapter,
  SeguroDesempregoParcelaAdapter,
} from './seguro-desemprego-jr-adapter';
export {
  PrevidenciaPrivadaJRAdapter,
  PrevidenciaPrivadaOcorrenciaAdapter,
} from './previdencia-privada-jr-adapter';

// Justificativas e eSocial
export { JustificativaJRAdapter, JustificativaItemAdapter } from './justificativa-jr-adapter';
export { EsocialInssFgtsJRAdapter, EsocialItemAdapter } from './esocial-inss-fgts-jr-adapter';

// Atualizações (pós-liquidação)
export {
  DemonstrativoAtualizacaoJRAdapter,
  DemonstrativoAtualizacaoEventoAdapter,
} from './demonstrativo-atualizacao-jr-adapter';
export {
  InssAtualizacaoJRAdapter,
  InssAtualizacaoItemAdapter,
} from './inss-atualizacao-jr-adapter';
export {
  IrpfAtualizacaoJRAdapter,
  IrpfAtualizacaoItemAdapter,
} from './irpf-atualizacao-jr-adapter';
export {
  CustaAtualizacaoJRAdapter,
  CustaAtualizacaoItemAdapter,
} from './custa-atualizacao-jr-adapter';
export {
  EsocialAtualizacaoJRAdapter,
  EsocialAtualizacaoItemAdapter,
} from './esocial-atualizacao-jr-adapter';
export {
  IrpfHonorariosAtualizacaoJRAdapter,
  IrpfHonorariosAtualizacaoItemAdapter,
} from './irpf-honorarios-atualizacao-jr-adapter';

// Utilitários
export { EsocialInssFgtsUtils } from './esocial-inss-fgts-utils';
export { ResumoPagamentoUtils } from './resumo-pagamento-utils';
