import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import {
  Banknote, Scale, Percent, Users, TrendingUp, CalendarDays,
  Receipt, DollarSign, Bus, ShieldCheck, BookOpen, Search, Info,
} from "lucide-react";

// =====================================================
// TABELAS GLOBAIS — Catálogo consolidado das 13 telas do PJe-Calc
// =====================================================
// Expõe read-only as séries históricas semeadas no Supabase via migrations:
//   - 20260326000001_seed_pjecalc_indices_correcao.sql (IPCA-E, SELIC, IPCA,
//     INPC, IGP-M, IGP-DI, TR)
//   - 20260330100001_seed_inss_ir_historico_2003_2022.sql (INSS + IR faixas)
//   - 20260327000008_seed_pjecalc_inpc_indices.sql
//   - pjecalc_salario_minimo, pjecalc_inss_faixas, pjecalc_ir_faixas, etc.
//
// O módulo apenas LÊ essas tabelas; edição é feita por admin via SQL.
// =====================================================

type TabKey =
  | 'salario_minimo' | 'inss' | 'irpf' | 'salario_familia'
  | 'seguro_desemprego' | 'vale_transporte' | 'salario_categoria'
  | 'feriados' | 'custas_fixas' | 'juros' | 'indices' | 'verbas';

const TABS: Array<{ key: TabKey; label: string; icon: typeof Banknote }> = [
  { key: 'salario_minimo', label: 'Salário Mínimo', icon: Banknote },
  { key: 'inss', label: 'Tabela INSS', icon: Percent },
  { key: 'irpf', label: 'Tabela IRPF', icon: Receipt },
  { key: 'salario_familia', label: 'Salário-Família', icon: Users },
  { key: 'seguro_desemprego', label: 'Seguro-Desemp.', icon: ShieldCheck },
  { key: 'vale_transporte', label: 'Vale-Transporte', icon: Bus },
  { key: 'salario_categoria', label: 'Salário Categoria', icon: DollarSign },
  { key: 'feriados', label: 'Feriados', icon: CalendarDays },
  { key: 'custas_fixas', label: 'Custas Fixas', icon: Scale },
  { key: 'juros', label: 'Juros', icon: TrendingUp },
  { key: 'indices', label: 'Índices Gerais', icon: TrendingUp },
  { key: 'verbas', label: 'Catálogo Verbas', icon: BookOpen },
];

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtPct = (v: number) => `${v.toFixed(2).replace('.', ',')}%`;
const fmtDate = (s: string | null) => s ? new Date(s + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

// Generic table query (with simple fallback when Supabase types don't cover the table)
function useTableQuery(tableName: string, orderBy: string, ascending = true) {
  return useQuery({
    queryKey: ["pjecalc_tabela_global", tableName],
    queryFn: async () => {
       
      const q = (supabase as any).from(tableName).select("*").order(orderBy, { ascending });
      const { data, error } = await q;
      if (error) {
        logger.warn(`[TabelasGlobais] ${tableName} fetch failed`, { error: error.message });
        return [];
      }
      return (data || []) as Record<string, unknown>[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function ModuloTabelasGlobais() {
  const [tab, setTab] = useState<TabKey>('salario_minimo');
  const [search, setSearch] = useState('');

  const { data: smRows = [] } = useTableQuery('pjecalc_salario_minimo', 'vigencia_inicio', false);
  const { data: inssRows = [] } = useTableQuery('pjecalc_inss_faixas', 'competencia_inicio', false);
  const { data: irRows = [] } = useTableQuery('pjecalc_ir_faixas', 'competencia_inicio', false);
  const { data: sfRows = [] } = useTableQuery('pjecalc_salario_familia_tabela', 'vigencia', false);
  const { data: sdRows = [] } = useTableQuery('pjecalc_seguro_desemprego_tabela', 'vigencia', false);
  const { data: vtRows = [] } = useTableQuery('pjecalc_vale_transporte', 'uf', true);
  const { data: feriadoRows = [] } = useTableQuery('pjecalc_feriados', 'data', true);
  const { data: custasRows = [] } = useTableQuery('pjecalc_custas_fixas', 'descricao', true);
  const { data: jurosRows = [] } = useTableQuery('pjecalc_correcao_monetaria', 'competencia', false);
  const { data: verbaRows = [] } = useTableQuery('pjecalc_verbas_catalogo', 'codigo', true);

  const filter = <T extends Record<string, unknown>>(rows: T[], keys: string[]): T[] => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter(r =>
      keys.some(k => {
        const v = r[k];
        return v !== null && v !== undefined && String(v).toLowerCase().includes(s);
      })
    );
  };

  const selectedTab = useMemo(() => TABS.find(t => t.key === tab)!, [tab]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <selectedTab.icon className="h-5 w-5 text-primary" />
          Tabelas Globais — {selectedTab.label}
        </h2>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border pb-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md transition-colors ${
              tab === t.key ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-2">
          <div className="flex items-start gap-2 text-[10px] text-muted-foreground p-2 bg-muted/30 rounded">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>Tabelas carregadas diretamente do Supabase (seeds de migrations). Somente leitura — edições via SQL.</span>
          </div>
        </CardContent>
      </Card>

      {/* ═══ SALÁRIO MÍNIMO ═══ */}
      {tab === 'salario_minimo' && (
        <TableView
          rows={filter(smRows as Record<string, unknown>[], ['valor', 'vigencia_inicio', 'fonte'])}
          columns={[
            { key: 'valor', label: 'Valor', align: 'right', render: v => fmt(Number(v)) },
            { key: 'vigencia_inicio', label: 'Vigência Início', render: v => fmtDate(String(v || '')) },
            { key: 'vigencia_fim', label: 'Vigência Fim', render: v => fmtDate(String(v || '')) },
            { key: 'fonte', label: 'Fonte' },
          ]}
        />
      )}

      {/* ═══ INSS ═══ */}
      {tab === 'inss' && (
        <TableView
          rows={filter(inssRows as Record<string, unknown>[], ['competencia_inicio'])}
          columns={[
            { key: 'competencia_inicio', label: 'Vigência Início', render: v => fmtDate(String(v || '')) },
            { key: 'competencia_fim', label: 'Vigência Fim', render: v => fmtDate(String(v || '')) },
            { key: 'faixa', label: 'Faixa', align: 'center', render: v => <Badge variant="secondary" className="text-[9px]">{String(v)}</Badge> },
            { key: 'valor_ate', label: 'Valor até', align: 'right', render: v => fmt(Number(v)) },
            { key: 'aliquota', label: 'Alíquota', align: 'right', render: v => fmtPct(Number(v) * (Number(v) > 1 ? 1 : 100)) },
          ]}
        />
      )}

      {/* ═══ IRPF ═══ */}
      {tab === 'irpf' && (
        <TableView
          rows={filter(irRows as Record<string, unknown>[], ['competencia_inicio'])}
          columns={[
            { key: 'competencia_inicio', label: 'Vigência Início', render: v => fmtDate(String(v || '')) },
            { key: 'competencia_fim', label: 'Vigência Fim', render: v => fmtDate(String(v || '')) },
            { key: 'faixa', label: 'Faixa', align: 'center', render: v => <Badge variant="secondary" className="text-[9px]">{String(v)}</Badge> },
            { key: 'base_ate', label: 'Base Até', align: 'right', render: v => fmt(Number(v)) },
            { key: 'aliquota', label: 'Alíquota', align: 'right', render: v => fmtPct(Number(v) * (Number(v) > 1 ? 1 : 100)) },
            { key: 'deducao', label: 'Dedução', align: 'right', render: v => fmt(Number(v ?? 0)) },
          ]}
        />
      )}

      {/* ═══ SALÁRIO-FAMÍLIA ═══ */}
      {tab === 'salario_familia' && (
        <TableView
          rows={filter(sfRows as Record<string, unknown>[], ['vigencia'])}
          columns={[
            { key: 'vigencia', label: 'Vigência' },
            { key: 'ate_salario', label: 'Remuneração até', align: 'right', render: v => fmt(Number(v)) },
            { key: 'valor_cota', label: 'Cota', align: 'right', render: v => fmt(Number(v)) },
            { key: 'fonte', label: 'Fonte' },
          ]}
          empty="Nenhuma faixa cadastrada. Consulte Portaria MPS vigente."
        />
      )}

      {/* ═══ SEGURO-DESEMPREGO ═══ */}
      {tab === 'seguro_desemprego' && (
        <TableView
          rows={filter(sdRows as Record<string, unknown>[], ['vigencia'])}
          columns={[
            { key: 'vigencia', label: 'Vigência' },
            { key: 'faixa', label: 'Faixa', render: v => <Badge variant="secondary" className="text-[9px]">{String(v)}</Badge> },
            { key: 'de', label: 'De', align: 'right', render: v => fmt(Number(v)) },
            { key: 'ate', label: 'Até', align: 'right', render: v => fmt(Number(v)) },
            { key: 'formula', label: 'Fórmula' },
          ]}
          empty="Consulte Res. CODEFAT 957/2022."
        />
      )}

      {/* ═══ VALE-TRANSPORTE ═══ */}
      {tab === 'vale_transporte' && (
        <TableView
          rows={filter(vtRows as Record<string, unknown>[], ['cidade', 'uf'])}
          columns={[
            { key: 'cidade', label: 'Cidade' },
            { key: 'uf', label: 'UF', align: 'center', render: v => <Badge variant="outline" className="text-[9px]">{String(v)}</Badge> },
            { key: 'tarifa_onibus', label: 'Ônibus', align: 'right', render: v => fmt(Number(v)) },
            { key: 'tarifa_metro', label: 'Metrô', align: 'right', render: v => v ? fmt(Number(v)) : '—' },
            { key: 'vigencia', label: 'Vigência' },
          ]}
        />
      )}

      {/* ═══ SALÁRIO CATEGORIA ═══ */}
      {tab === 'salario_categoria' && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Pisos regionais disponíveis em <strong>ModuloTabelasRegionais</strong> (SP, RJ, PR, RS, SC).
        </CardContent></Card>
      )}

      {/* ═══ FERIADOS ═══ */}
      {tab === 'feriados' && (
        <TableView
          rows={filter(feriadoRows as Record<string, unknown>[], ['nome', 'tipo', 'uf'])}
          columns={[
            { key: 'data', label: 'Data', render: v => fmtDate(String(v || '')) },
            { key: 'nome', label: 'Nome' },
            { key: 'tipo', label: 'Tipo', render: v => <Badge variant="outline" className="text-[9px]">{String(v)}</Badge> },
            { key: 'uf', label: 'UF', align: 'center' },
            { key: 'municipio', label: 'Município' },
          ]}
        />
      )}

      {/* ═══ CUSTAS FIXAS ═══ */}
      {tab === 'custas_fixas' && (
        <TableView
          rows={filter(custasRows as Record<string, unknown>[], ['descricao'])}
          columns={[
            { key: 'descricao', label: 'Descrição' },
            { key: 'valor', label: 'Valor', align: 'right', render: v => fmt(Number(v)) },
            { key: 'vigencia', label: 'Vigência' },
            { key: 'fonte', label: 'Fonte' },
          ]}
        />
      )}

      {/* ═══ JUROS ═══ */}
      {tab === 'juros' && (
        <TableView
          rows={filter(jurosRows as Record<string, unknown>[], ['indice', 'competencia'])}
          columns={[
            { key: 'indice', label: 'Índice', render: v => <Badge variant="outline" className="text-[9px]">{String(v)}</Badge> },
            { key: 'competencia', label: 'Competência', render: v => String(v || '').slice(0, 7) },
            { key: 'valor', label: 'Taxa Mês (%)', align: 'right', render: v => Number(v).toFixed(4) },
            { key: 'acumulado', label: 'Acumulado', align: 'right', render: v => v != null ? Number(v).toFixed(6) : '—' },
            { key: 'fonte', label: 'Fonte' },
          ]}
        />
      )}

      {/* ═══ ÍNDICES GERAIS ═══ */}
      {tab === 'indices' && (
        <TableView
          rows={filter(jurosRows as Record<string, unknown>[], ['indice', 'competencia'])}
          columns={[
            { key: 'indice', label: 'Índice' },
            { key: 'competencia', label: 'Competência', render: v => String(v || '').slice(0, 7) },
            { key: 'valor', label: 'Taxa Mês (%)', align: 'right', render: v => Number(v).toFixed(4) },
            { key: 'acumulado', label: 'Acum.', align: 'right', render: v => v != null ? Number(v).toFixed(4) : '—' },
            { key: 'fonte', label: 'Fonte' },
          ]}
        />
      )}

      {/* ═══ CATÁLOGO DE VERBAS ═══ */}
      {tab === 'verbas' && (
        <TableView
          rows={filter(verbaRows as Record<string, unknown>[], ['codigo', 'nome', 'tipo'])}
          columns={[
            { key: 'codigo', label: 'Código' },
            { key: 'nome', label: 'Nome' },
            { key: 'tipo', label: 'Tipo', render: v => <Badge variant="secondary" className="text-[9px]">{String(v)}</Badge> },
            { key: 'incidencia_fgts', label: 'FGTS', align: 'center', render: v => v ? '✓' : '—' },
            { key: 'incidencia_inss', label: 'INSS', align: 'center', render: v => v ? '✓' : '—' },
            { key: 'incidencia_ir', label: 'IR', align: 'center', render: v => v ? '✓' : '—' },
          ]}
          empty="Catálogo disponível no módulo Catálogo de Verbas do caso."
        />
      )}
    </div>
  );
}

// ─── Componente interno: tabela genérica ───

interface Col {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (v: unknown) => React.ReactNode;
}

function TableView({ rows, columns, empty }: { rows: Record<string, unknown>[]; columns: Col[]; empty?: string }) {
  if (rows.length === 0) {
    return (
      <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
        {empty || 'Nenhum registro encontrado.'}
      </CardContent></Card>
    );
  }

  return (
    <div className="overflow-x-auto border border-border rounded">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            {columns.map(col => (
              <th
                key={col.key}
                className={`p-2 font-medium ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 500).map((row, i) => (
            <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
              {columns.map(col => {
                const v = row[col.key];
                return (
                  <td
                    key={col.key}
                    className={`p-2 ${
                      col.align === 'right' ? 'text-right font-mono' :
                      col.align === 'center' ? 'text-center' : ''
                    }`}
                  >
                    {col.render ? col.render(v) : (v !== null && v !== undefined ? String(v) : '—')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 500 && (
        <p className="text-[10px] text-muted-foreground text-center py-2">
          {rows.length} registros no total — exibindo primeiros 500. Use a busca para filtrar.
        </p>
      )}
    </div>
  );
}
