#!/usr/bin/env tsx
/**
 * Script de calibração Fase 4 — roda extrator + dispatcher + mappers
 * contra PDFs reais e reporta métricas.
 *
 * Como o extrator-geometrico.ts usa import dinâmico de esm.sh (Deno-only),
 * este script REPLICA a lógica em Node usando unpdf local (npm).
 * Lógica de clusterização e mappers vem dos módulos compartilhados.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  clusterizarLinhas,
  detectarTabelas,
  linhaParaTextoPlano,
} from '../supabase/functions/_shared/extrator-geometrico.ts';
import { escolherEMapear, escolherMappersCartaoPonto } from '../supabase/functions/_shared/mappers/dispatcher.ts';
import type {
  DocumentoTabular,
  PaginaTabular,
  TextoPosicionado,
} from '../supabase/functions/_shared/documento-tabular.ts';
import type { ParseCartaoPontoResultDominio } from '../supabase/functions/_shared/tipos-dominio.ts';

async function extrairLocal(bytes: Uint8Array): Promise<DocumentoTabular | null> {
  // @ts-ignore - dynamic import of npm unpdf
  const unpdf = await import('unpdf');
  // @ts-ignore
  const pdfjs = await unpdf.getResolvedPDFJS();

  let doc: { numPages: number; getPage: (n: number) => Promise<unknown> };
  try {
    doc = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise;
  } catch (e) {
    console.error('getDocument falhou:', (e as Error).message);
    return null;
  }

  const paginas: PaginaTabular[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    // @ts-ignore
    const pagina: any = await doc.getPage(i);
    const content = await pagina.getTextContent();
    const viewport = pagina.getViewport({ scale: 1.0 });

    const textos: TextoPosicionado[] = (content.items as any[])
      .filter((it) => 'str' in it && typeof it.str === 'string' && it.str.trim().length > 0)
      .map((it) => ({
        texto: it.str as string,
        x: it.transform[4] as number,
        y: (viewport.height as number) - (it.transform[5] as number),
        width: (it.width as number) ?? 0,
        height: (it.height as number) ?? 0,
        fontSize: (it.height as number) ?? 10,
      }));

    const linhas = clusterizarLinhas(textos);
    const tabelas = detectarTabelas(linhas);
    const textoPlano = linhas.map((l) => linhaParaTextoPlano(l)).join('\n');

    paginas.push({ numero: i, textos, tabelas, textoPlano });
  }

  const textoCompleto = paginas
    .map((p) => p.textoPlano)
    .join('\n\n--- PÁGINA SEPARADOR ---\n\n');
  const usefulChars = textoCompleto.replace(/\s+/g, '').length;
  if (usefulChars < 200) return null;

  return {
    numeroPaginas: doc.numPages,
    paginas,
    textoCompleto,
    extractor: 'pdfjs_geometric',
    qualidade: { score: 0.9, razao: `local calibration (${doc.numPages} pgs, ${usefulChars} chars)` },
  };
}

interface ResumoCalibracao {
  arquivo: string;
  tamanho_bytes: number;
  paginas: number;
  tabelas_total: number;
  textoCompleto_chars: number;
  mappers_aplicaveis: Array<{ slug: string; score: number; motivos: string[] }>;
  resultado?: {
    kind: string;
    mappers_executados?: string[];
    parser_version?: string;
    total_apuracoes?: number;
    apuracoes_com_batidas?: number;
    apuracoes_sem_batidas?: number;
    competencia_predominante?: string;
    data_inicial?: string;
    data_final?: string;
    competencias?: Record<string, number>;
    warnings_sample?: string[];
    ocorrencias_count?: Record<string, number>;
    dias_descartados_count?: number;
    dias_descartados_por_ocorrencia?: Record<string, number>;
    amostra_apuracoes?: Array<{ data: string; dow: string; ocorr: string; pares: number; obs?: string | null }>;
  };
}

async function calibrar(pdfPath: string): Promise<ResumoCalibracao> {
  const bytes = readFileSync(pdfPath);
  const u8 = new Uint8Array(bytes);
  const docTab = await extrairLocal(u8);

  const resumo: ResumoCalibracao = {
    arquivo: pdfPath.split('/').pop() ?? pdfPath,
    tamanho_bytes: bytes.length,
    paginas: docTab?.numeroPaginas ?? 0,
    tabelas_total: docTab?.paginas.reduce((s, p) => s + p.tabelas.length, 0) ?? 0,
    textoCompleto_chars: docTab?.textoCompleto.length ?? 0,
    mappers_aplicaveis: [],
  };

  if (!docTab) return resumo;

  // Quais mappers de cartao_ponto aplicam?
  const aplicaveis = escolherMappersCartaoPonto(docTab);
  resumo.mappers_aplicaveis = aplicaveis.map((a) => ({
    slug: a.mapper.slug,
    score: a.score,
    motivos: a.motivos,
  }));

  // Roda dispatcher completo
  const dispatch = escolherEMapear(docTab);
  if (dispatch.kind !== 'success') {
    resumo.resultado = { kind: dispatch.kind };
    return resumo;
  }

  const r = dispatch.executado.resultado as ParseCartaoPontoResultDominio;
  const apComBatidas = r.apuracoes.filter((a) => a.marcacoes.length > 0).length;
  const apSemBatidas = r.apuracoes.length - apComBatidas;
  const ocorrenciasCount: Record<string, number> = {};
  for (const a of r.apuracoes) {
    ocorrenciasCount[a.ocorrencia] = (ocorrenciasCount[a.ocorrencia] ?? 0) + 1;
  }

  const descartados = (r as any).dias_classificados_descartados ?? [];
  const descartadosCount: Record<string, number> = {};
  for (const d of descartados) {
    descartadosCount[d.ocorrencia] = (descartadosCount[d.ocorrencia] ?? 0) + 1;
  }

  resumo.resultado = {
    kind: 'success',
    mappers_executados: dispatch.executado.mappers_executados,
    parser_version: r.parser_version,
    total_apuracoes: r.apuracoes.length,
    apuracoes_com_batidas: apComBatidas,
    apuracoes_sem_batidas: apSemBatidas,
    competencia_predominante: r.competencia_predominante,
    data_inicial: r.data_inicial,
    data_final: r.data_final,
    competencias: Object.fromEntries(r.competencias),
    warnings_sample: r.warnings.slice(0, 10),
    ocorrencias_count: ocorrenciasCount,
    dias_descartados_count: descartados.length,
    dias_descartados_por_ocorrencia: descartadosCount,
    amostra_apuracoes: r.apuracoes.slice(0, 5).map((a) => ({
      data: a.data,
      dow: a.dia_semana ?? '',
      ocorr: a.ocorrencia,
      pares: a.marcacoes.length,
      obs: a.observacao,
    })),
  };

  return resumo;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Uso: tsx scripts/calibrar-sprint3.ts <PDF1> [PDF2 ...]');
    process.exit(1);
  }
  for (const arg of args) {
    const p = resolve(arg);
    console.log(`\n${'='.repeat(80)}\nCALIBRAÇÃO: ${p}\n${'='.repeat(80)}`);
    try {
      const r = await calibrar(p);
      console.log(JSON.stringify(r, null, 2));
    } catch (e) {
      console.error('ERRO:', (e as Error).message);
      console.error((e as Error).stack);
    }
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
