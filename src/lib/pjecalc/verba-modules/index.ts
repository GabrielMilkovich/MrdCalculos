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
