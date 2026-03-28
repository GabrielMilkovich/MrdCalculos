/**
 * Verba Module System — barrel exports
 * 
 * Each import triggers registerVerbaModule() for auto-registration.
 */
export * from './types';

// Import modules to trigger registration
import './horas-extras';
import './dsr';
import './rescissorias';
import './comissoes';
import './intervalos';
import './feriados';
import './multas-clt';
import './decimo-terceiro';
import './ferias';
import './fgts-rescisorio';
import './plr';
import './salario-substituicao';
import './adicional-noturno';
import './insalubridade';
import './periculosidade';
import './equiparacao-salarial';
import './diferencas-salariais';
import './acumulo-funcao';
import './danos-morais';
import './danos-materiais';
import './estabilidade';
import './aviso-previo';
import './adicional-transferencia';
import './cesta-basica';
import './salario-maternidade';
import './indenizacao-pre-database';
import './multas-normativas';
import './gratificacao-funcao';
import './reintegracao';
