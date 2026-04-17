/**
 * Barrel do módulo de Juros (Fase 5 do master plan).
 *
 * Ref: pjecalc-fonte/.../dominio/juros/
 *
 * Hierarquia:
 *   JurosBase (abstract)
 *     ├─ JurosPadrao         — tabela "padrão" (configurável)
 *     └─ JurosFazendaPublica — Fazenda Pública pré-EC 113/2021
 *
 *   IndiceBase (abstract — de dominio/indices)
 *     ├─ JurosTaxaLegal       — Lei 14.905/2024 (SELIC − IPCA)
 *     └─ JurosPrecatorioEC1362025 — EC 136/2025 (juros do precatório)
 *
 *   Entidades standalone (EntidadeBase):
 *     ├─ JurosSelicInss — SELIC aplicada a INSS
 *     └─ JurosSelicIrpf — SELIC aplicada a IRPF
 *
 *   Integração com correção monetária:
 *     obterTabelaSelicParaCorrecao — SELIC como índice de correção (ADC 58/59)
 */
export { JurosBase } from './juros-base';
export { JurosPadrao } from './padrao/juros-padrao';
export { JurosFazendaPublica } from './fazendapublica/juros-fazenda-publica';
export { JurosSelicInss } from './selicinss/juros-selic-inss';
export { JurosSelicIrpf } from './selicirpf/juros-selic-irpf';
export { JurosTaxaLegal } from './taxalegal/juros-taxa-legal';
export { JurosPrecatorioEC1362025 } from './precatorios/juros-precatorio-ec-136-2025';
export { obterTabelaSelicParaCorrecao } from './juros-selic-para-correcao';
