/**
 * Barrel do módulo de Índices (Fase 4 do master plan).
 *
 * Ref: pjecalc-fonte/.../dominio/indices/
 */
// Foundation
export type { IndiceDeCalculo } from './indice-de-calculo';
export { IndiceBase } from './indice-base';
export { IndiceSemCorrecao } from './indice-sem-correcao';

// Índices mensais tradicionais
export { IndiceIPCA } from './ipca/indice-ipca';
export { IndiceIPCAE } from './ipcae/indice-ipcae';
export { IndiceINPC } from './inpc/indice-inpc';
export { IndiceIGPM } from './igpm/indice-igpm';
export { IndiceIPC } from './ipc/indice-ipc';
export { IndiceTR } from './tr/indice-tr';
export { IndiceIPCAETR } from './ipcatr/indice-ipcae-tr';

// JAM, IT
export { IndiceJAM } from './jam/indice-jam';
export { IndiceIndebitoTributario } from './it/indice-indebito-tributario';

// SELIC (mensal + diária + fazenda)
export { IndiceSelicMensal } from './selic/indice-selic-mensal';
export { IndiceSelicDiaria } from './selic/indice-selic-diaria';
export { IndiceSelicFazenda } from './selic/indice-selic-fazenda';

// Tabela Única (JT diária, mensal, débito trabalhista)
export { IndiceTabelaUnicaJTDiario } from './tabelaunica/indice-tabela-unica-jt-diario';
export { IndiceTabelaUnicaJTMensal } from './tabelaunica/indice-tabela-unica-jt-mensal';
export { IndiceTabelaUnicaDebitoTrabalhista } from './tabelaunica/indice-tabela-unica-debito-trabalhista';

// Devedor Fazenda / Não Fazenda (EC 113/2021)
export { IndiceDevedorFazenda } from './dfp/indice-devedor-fazenda';
export { IndiceDevedorNaoFazenda } from './dnfp/indice-devedor-nao-fazenda';

// UFIR
export { UFIR, UFIROptimizerListSearch } from './ufir/ufir';
export { CoeficienteUFIR, CoeficienteUFIROptimizerListSearch } from './coeficienteufir/coeficiente-ufir';

// Precatórios
export { IndicePrecatorioFederal } from './precatorios/indice-precatorio-federal';
export { IndicePrecatorioEstadual } from './precatorios/indice-precatorio-estadual';
export { IndicePrecatorioEC1362025 } from './precatorios/indice-precatorio-ec-136-2025';
