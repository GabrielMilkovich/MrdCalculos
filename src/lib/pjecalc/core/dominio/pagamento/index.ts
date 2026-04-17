/**
 * Barrel do módulo pagamento (Fase 9 do master plan).
 *
 * Ref: pjecalc-fonte/.../dominio/pagamento/
 */

// Interface e VO do evento
export type { EventoAtualizacao } from './evento-atualizacao';
export { EventoAtualizacaoVO } from './evento-atualizacao-vo';

// Entidades principais
export { Pagamento } from './pagamento';
export { Atualizacao } from './atualizacao';

// Créditos / Débitos
export { CreditosDoReclamante } from './creditos-do-reclamante';
export { DebitosDoReclamante } from './debitos-do-reclamante';
export { OutrosDebitosReclamado } from './outros-debitos-reclamado';
export { DebitosCobrarDoReclamante } from './debitos-cobrar-do-reclamante';

// Vínculos
export { HonorarioDoPagamento } from './honorario-do-pagamento';
export { MultaDoPagamento } from './multa-do-pagamento';

// Snapshots de atualização (XxxDaAtualizacao)
export { HonorarioDaAtualizacao } from './honorario-da-atualizacao';
export { MultaDaAtualizacao } from './multa-da-atualizacao';
export { CustasJudiciaisDaAtualizacao } from './custas-judiciais-da-atualizacao';
export { AutoJudicialDaAtualizacao } from './auto-judicial-da-atualizacao';
export { CustaPagaDaAtualizacao } from './custa-paga-da-atualizacao';
export { CustasFixasDaAtualizacaoDoEvento } from './custas-fixas-da-atualizacao-do-evento';
export { PensaoAlimenticiaDaAtualizacao } from './pensao-alimenticia-da-atualizacao';
export { ArmazenamentoDaAtualizacao } from './armazenamento-da-atualizacao';

// Orquestrador de rateio
export { MaquinaDeRateioDoPagamento } from './maquina-de-rateio-do-pagamento';
export type { ResultadoDoRateio } from './maquina-de-rateio-do-pagamento';

// Utilitários
export { PagamentoUtils } from './pagamento-utils';
export { testarExistenciaJurosAnteriores, testarExistenciaJurosDeAte } from './atualizacao-utils';
export { FiltroDoPagamento } from './filtro-do-pagamento';

// Totalizador V3 (legacy) — preserved
export { totalizar } from './pagamento-totalizador';
export type { ResultadoPagamento } from './pagamento-totalizador';
