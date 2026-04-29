/**
 * ⚠️ DEPRECATED — Use pjc-analyzer.ts (analyzePJC) as the canonical PJC parser.
 * This file is kept for backward compatibility only.
 * The canonical format is the real PJe-Calc .PJC XML with <Calculo> root.
 * 
 * @deprecated Use analyzePJC() from pjc-analyzer.ts + convertPjcToEngineInputs() from pjc-to-engine.ts
 */

import { supabase } from "@/integrations/supabase/client";
import { DOMParser as NodeDOMParser } from '@xmldom/xmldom';
import { logger } from "@/lib/logger";

// Polyfill: usar xmldom no Node.js, DOMParser nativo no browser
const getParser = (): DOMParser => {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser();
  }
  return new NodeDOMParser() as unknown as DOMParser;
};

/** @deprecated Use analyzePJC from pjc-analyzer.ts */
interface XmlParseResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  dados_processo?: { numero?: string; reclamante?: string };
  resumo?: Record<string, number>;
  verbas?: { nome: string; tipo: string; total_devido: number; total_pago: number; total_diferenca: number; ocorrencias: { competencia: string; devido: number; pago: number; diferenca: number }[] }[];
  fgts?: { total_depositos: number; multa_valor: number; total_fgts: number };
  ir?: { base_calculo: number; deducoes: number; meses_rra: number; imposto_devido: number };
}

function getTextContent(parent: Element, tag: string): string {
  const el = parent.getElementsByTagName(tag)[0];
  return el?.textContent?.trim() || '';
}

function getNumAttr(el: Element, attr: string): number {
  return parseFloat(el.getAttribute(attr) || '0') || 0;
}

/** @deprecated Use analyzePJC from pjc-analyzer.ts */
export function parseXML(xmlString: string): XmlParseResult {
  logger.warn('[DEPRECATED] parseXML() is deprecated. Use analyzePJC() from pjc-analyzer.ts for real PJC parsing.');
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parser = getParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { success: false, errors: ['XML inválido: ' + parseError.textContent?.slice(0, 200)], warnings };
    }

    const root = doc.documentElement;
    if (root.tagName !== 'pjecalc') {
      warnings.push(`Elemento raiz "${root.tagName}" — esperado "pjecalc". Use analyzePJC() para formato real <Calculo>.`);
    }

    const processoEl = root.getElementsByTagName('processo')[0];
    const dados_processo = processoEl ? {
      numero: processoEl.getAttribute('numero') || undefined,
      reclamante: processoEl.getAttribute('reclamante') || undefined,
    } : undefined;

    const resumoEl = root.getElementsByTagName('resumo')[0];
    const resumo: Record<string, number> = {};
    if (resumoEl) {
      for (const child of Array.from(resumoEl.children)) {
        resumo[child.tagName] = parseFloat(child.textContent || '0') || 0;
      }
    }

    const verbasEl = root.getElementsByTagName('verbas')[0];
    const verbas: XmlParseResult['verbas'] = [];
    if (verbasEl) {
      const verbaEls = verbasEl.getElementsByTagName('verba');
      for (const vel of Array.from(verbaEls)) {
        const ocorrenciasEl = vel.getElementsByTagName('ocorrencia');
        const ocorrencias = Array.from(ocorrenciasEl).map(oel => ({
          competencia: oel.getAttribute('competencia') || '',
          devido: getNumAttr(oel, 'devido'),
          pago: getNumAttr(oel, 'pago'),
          diferenca: getNumAttr(oel, 'diferenca'),
        }));

        verbas.push({
          nome: vel.getAttribute('nome') || `Verba ${verbas.length + 1}`,
          tipo: vel.getAttribute('tipo') || 'principal',
          total_devido: parseFloat(getTextContent(vel, 'total_devido')) || 0,
          total_pago: parseFloat(getTextContent(vel, 'total_pago')) || 0,
          total_diferenca: parseFloat(getTextContent(vel, 'total_diferenca')) || 0,
          ocorrencias,
        });
      }
    }

    const fgtsEl = root.getElementsByTagName('fgts')[0];
    const fgts = fgtsEl ? {
      total_depositos: parseFloat(getTextContent(fgtsEl, 'total_depositos')) || 0,
      multa_valor: parseFloat(getTextContent(fgtsEl, 'multa_valor')) || 0,
      total_fgts: parseFloat(getTextContent(fgtsEl, 'total_fgts')) || 0,
    } : undefined;

    const irEl = root.getElementsByTagName('imposto_renda')[0];
    const ir = irEl ? {
      base_calculo: parseFloat(getTextContent(irEl, 'base_calculo')) || 0,
      deducoes: parseFloat(getTextContent(irEl, 'deducoes')) || 0,
      meses_rra: parseInt(getTextContent(irEl, 'meses_rra')) || 0,
      imposto_devido: parseFloat(getTextContent(irEl, 'imposto_devido')) || 0,
    } : undefined;

    if (verbas.length === 0) warnings.push('Nenhuma verba encontrada no XML');

    return { success: true, errors, warnings, dados_processo, resumo, verbas, fgts, ir };
  } catch (e) {
    return { success: false, errors: ['Erro ao processar XML: ' + (e as Error).message], warnings };
  }
}

/** @deprecated Use convertPjcToEngineInputs from pjc-to-engine.ts */
export async function importarXMLParaCalculo(caseId: string, xmlString: string): Promise<{ success: boolean; message: string; warnings: string[] }> {
  logger.warn('[DEPRECATED] importarXMLParaCalculo() is deprecated. Use analyzePJC() + convertPjcToEngineInputs().');
  const parsed = parseXML(xmlString);
  if (!parsed.success) {
    return { success: false, message: parsed.errors.join('; '), warnings: parsed.warnings };
  }

  try {
    if (parsed.verbas && parsed.verbas.length > 0) {
      await supabase.from("pjecalc_verbas" as any).delete().eq("case_id", caseId);

      for (let i = 0; i < parsed.verbas.length; i++) {
        const v = parsed.verbas[i];
        await supabase.from("pjecalc_verbas" as any).insert({
          case_id: caseId,
          nome: v.nome,
          tipo: v.tipo,
          caracteristica: 'comum',
          ocorrencia_pagamento: 'mensal',
          multiplicador: 1,
          divisor_informado: 30,
          periodo_inicio: v.ocorrencias[0]?.competencia ? v.ocorrencias[0].competencia + '-01' : new Date().toISOString().slice(0, 10),
          periodo_fim: v.ocorrencias[v.ocorrencias.length - 1]?.competencia ? v.ocorrencias[v.ocorrencias.length - 1].competencia + '-28' : new Date().toISOString().slice(0, 10),
          ordem: i,
          valor_informado_devido: v.total_devido,
          valor_informado_pago: v.total_pago,
        });
      }
    }

    if (parsed.dados_processo) {
      const payload: any = { case_id: caseId };
      if (parsed.dados_processo.numero) payload.numero_processo = parsed.dados_processo.numero;

      const existing = await supabase.from("pjecalc_dados_processo" as any).select("id").eq("case_id", caseId).maybeSingle();
      if (existing.data) {
        // tabela custom fora do schema gerado
        const existingId = (existing.data as { id: string }).id;
        await supabase.from("pjecalc_dados_processo" as any).update(payload).eq("id", existingId);
      } else {
        await supabase.from("pjecalc_dados_processo" as any).insert(payload);
      }
    }

    return {
      success: true,
      message: `Importadas ${parsed.verbas?.length || 0} verbas do XML`,
      warnings: parsed.warnings,
    };
  } catch (e) {
    return { success: false, message: 'Erro ao gravar: ' + (e as Error).message, warnings: parsed.warnings };
  }
}
/**
 * ⚠️ DEPRECATED — Use pjc-analyzer.ts (analyzePJC) as the canonical PJC parser.
 * This file is kept for backward compatibility only.
 * The canonical format is the real PJe-Calc .PJC XML with <Calculo> root.
 * 
 * @deprecated Use analyzePJC() from pjc-analyzer.ts + convertPjcToEngineInputs() from pjc-to-engine.ts
 */

import { supabase } from "@/integrations/supabase/client";

/** @deprecated Use analyzePJC from pjc-analyzer.ts */
interface XmlParseResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  dados_processo?: { numero?: string; reclamante?: string };
  resumo?: Record<string, number>;
  verbas?: { nome: string; tipo: string; total_devido: number; total_pago: number; total_diferenca: number; ocorrencias: { competencia: string; devido: number; pago: number; diferenca: number }[] }[];
  fgts?: { total_depositos: number; multa_valor: number; total_fgts: number };
  ir?: { base_calculo: number; deducoes: number; meses_rra: number; imposto_devido: number };
}

function getTextContent(parent: Element, tag: string): string {
  const el = parent.getElementsByTagName(tag)[0];
  return el?.textContent?.trim() || '';
}

function getNumAttr(el: Element, attr: string): number {
  return parseFloat(el.getAttribute(attr) || '0') || 0;
}

/** @deprecated Use analyzePJC from pjc-analyzer.ts */
export function parseXML(xmlString: string): XmlParseResult {
  logger.warn('[DEPRECATED] parseXML() is deprecated. Use analyzePJC() from pjc-analyzer.ts for real PJC parsing.');
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { success: false, errors: ['XML inválido: ' + parseError.textContent?.slice(0, 200)], warnings };
    }

    const root = doc.documentElement;
    if (root.tagName !== 'pjecalc') {
      warnings.push(`Elemento raiz "${root.tagName}" — esperado "pjecalc". Use analyzePJC() para formato real <Calculo>.`);
    }

    const processoEl = root.getElementsByTagName('processo')[0];
    const dados_processo = processoEl ? {
      numero: processoEl.getAttribute('numero') || undefined,
      reclamante: processoEl.getAttribute('reclamante') || undefined,
    } : undefined;

    const resumoEl = root.getElementsByTagName('resumo')[0];
    const resumo: Record<string, number> = {};
    if (resumoEl) {
      for (const child of Array.from(resumoEl.children)) {
        resumo[child.tagName] = parseFloat(child.textContent || '0') || 0;
      }
    }

    const verbasEl = root.getElementsByTagName('verbas')[0];
    const verbas: XmlParseResult['verbas'] = [];
    if (verbasEl) {
      const verbaEls = verbasEl.getElementsByTagName('verba');
      for (const vel of Array.from(verbaEls)) {
        const ocorrenciasEl = vel.getElementsByTagName('ocorrencia');
        const ocorrencias = Array.from(ocorrenciasEl).map(oel => ({
          competencia: oel.getAttribute('competencia') || '',
          devido: getNumAttr(oel, 'devido'),
          pago: getNumAttr(oel, 'pago'),
          diferenca: getNumAttr(oel, 'diferenca'),
        }));

        verbas.push({
          nome: vel.getAttribute('nome') || `Verba ${verbas.length + 1}`,
          tipo: vel.getAttribute('tipo') || 'principal',
          total_devido: parseFloat(getTextContent(vel, 'total_devido')) || 0,
          total_pago: parseFloat(getTextContent(vel, 'total_pago')) || 0,
          total_diferenca: parseFloat(getTextContent(vel, 'total_diferenca')) || 0,
          ocorrencias,
        });
      }
    }

    const fgtsEl = root.getElementsByTagName('fgts')[0];
    const fgts = fgtsEl ? {
      total_depositos: parseFloat(getTextContent(fgtsEl, 'total_depositos')) || 0,
      multa_valor: parseFloat(getTextContent(fgtsEl, 'multa_valor')) || 0,
      total_fgts: parseFloat(getTextContent(fgtsEl, 'total_fgts')) || 0,
    } : undefined;

    const irEl = root.getElementsByTagName('imposto_renda')[0];
    const ir = irEl ? {
      base_calculo: parseFloat(getTextContent(irEl, 'base_calculo')) || 0,
      deducoes: parseFloat(getTextContent(irEl, 'deducoes')) || 0,
      meses_rra: parseInt(getTextContent(irEl, 'meses_rra')) || 0,
      imposto_devido: parseFloat(getTextContent(irEl, 'imposto_devido')) || 0,
    } : undefined;

    if (verbas.length === 0) warnings.push('Nenhuma verba encontrada no XML');

    return { success: true, errors, warnings, dados_processo, resumo, verbas, fgts, ir };
  } catch (e) {
    return { success: false, errors: ['Erro ao processar XML: ' + (e as Error).message], warnings };
  }
}

/** @deprecated Use convertPjcToEngineInputs from pjc-to-engine.ts */
export async function importarXMLParaCalculo(caseId: string, xmlString: string): Promise<{ success: boolean; message: string; warnings: string[] }> {
  logger.warn('[DEPRECATED] importarXMLParaCalculo() is deprecated. Use analyzePJC() + convertPjcToEngineInputs().');
  const parsed = parseXML(xmlString);
  if (!parsed.success) {
    return { success: false, message: parsed.errors.join('; '), warnings: parsed.warnings };
  }

  try {
    if (parsed.verbas && parsed.verbas.length > 0) {
      await supabase.from("pjecalc_verbas" as any).delete().eq("case_id", caseId);

      for (let i = 0; i < parsed.verbas.length; i++) {
        const v = parsed.verbas[i];
        await supabase.from("pjecalc_verbas" as any).insert({
          case_id: caseId,
          nome: v.nome,
          tipo: v.tipo,
          caracteristica: 'comum',
          ocorrencia_pagamento: 'mensal',
          multiplicador: 1,
          divisor_informado: 30,
          periodo_inicio: v.ocorrencias[0]?.competencia ? v.ocorrencias[0].competencia + '-01' : new Date().toISOString().slice(0, 10),
          periodo_fim: v.ocorrencias[v.ocorrencias.length - 1]?.competencia ? v.ocorrencias[v.ocorrencias.length - 1].competencia + '-28' : new Date().toISOString().slice(0, 10),
          ordem: i,
          valor_informado_devido: v.total_devido,
          valor_informado_pago: v.total_pago,
        });
      }
    }

    if (parsed.dados_processo) {
      const payload: any = { case_id: caseId };
      if (parsed.dados_processo.numero) payload.numero_processo = parsed.dados_processo.numero;

      const existing = await supabase.from("pjecalc_dados_processo" as any).select("id").eq("case_id", caseId).maybeSingle();
      if (existing.data) {
        // tabela custom fora do schema gerado
        const existingId = (existing.data as { id: string }).id;
        await supabase.from("pjecalc_dados_processo" as any).update(payload).eq("id", existingId);
      } else {
        await supabase.from("pjecalc_dados_processo" as any).insert(payload);
      }
    }

    return {
      success: true,
      message: `Importadas ${parsed.verbas?.length || 0} verbas do XML`,
      warnings: parsed.warnings,
    };
  } catch (e) {
    return { success: false, message: 'Erro ao gravar: ' + (e as Error).message, warnings: parsed.warnings };
  }
}
