/**
 * AutoFillReviewPanel — UI de revisao das propostas de auto-preenchimento.
 *
 * Mostra para o usuario:
 *  - Lista de propostas pendentes agrupadas por campo.
 *  - Para cada proposta: valor anterior vs valor proposto + fonte (documento)
 *    + score de confianca + conflitos (se houver).
 *  - Botoes: Aprovar (aplica no destino), Rejeitar, Ver evidencia.
 *  - Filtros: somente conflitos, somente alta confianca, etc.
 *
 * Acionado pela aba Calculo apos extract-and-fill rodar.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  AlertTriangle, Check, FileText, RotateCcw, Sparkles, X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  type PropostaPersistida,
  aprovarProposta,
  listarPropostas,
  rejeitarProposta,
  reverterProposta,
} from '@/lib/pjecalc/auto-fill/proposal-engine';
import { nomeDocumento, type CampoAutoFill } from '@/lib/pjecalc/auto-fill/document-authority';

interface Props {
  caseId: string;
  onAfterApply?: () => void;
}

/** Mapa campo → (tabela, coluna) onde aplicar o UPDATE. */
const DESTINO_CAMPO: Partial<Record<CampoAutoFill, { tabela: string; coluna: string }>> = {
  data_admissao:       { tabela: 'pjecalc_calculos', coluna: 'data_admissao' },
  data_demissao:       { tabela: 'pjecalc_calculos', coluna: 'data_demissao' },
  data_ajuizamento:    { tabela: 'pjecalc_calculos', coluna: 'data_ajuizamento' },
  numero_processo:     { tabela: 'pjecalc_calculos', coluna: 'processo_cnj' },
  tribunal:            { tabela: 'pjecalc_calculos', coluna: 'tribunal' },
  vara:                { tabela: 'pjecalc_calculos', coluna: 'vara' },
  reclamante_nome:     { tabela: 'pjecalc_calculos', coluna: 'reclamante_nome' },
  reclamante_cpf:      { tabela: 'pjecalc_calculos', coluna: 'reclamante_cpf' },
  reclamada_nome:      { tabela: 'pjecalc_calculos', coluna: 'reclamado_nome' },
  reclamada_cnpj:      { tabela: 'pjecalc_calculos', coluna: 'reclamado_cnpj' },
  cargo_funcao:        { tabela: 'pjecalc_calculos', coluna: 'cargo' },
  salario_base:        { tabela: 'pjecalc_parametros', coluna: 'salario_base' },
  tipo_demissao:       { tabela: 'pjecalc_calculos', coluna: 'tipo_demissao' },
  jornada:             { tabela: 'pjecalc_parametros', coluna: 'jornada_contratual' },
};

function nomeCampo(campo: string): string {
  const nomes: Record<string, string> = {
    data_admissao: 'Data de Admissão',
    data_demissao: 'Data de Demissão',
    data_ajuizamento: 'Data de Ajuizamento',
    numero_processo: 'Número do Processo',
    tribunal: 'Tribunal',
    vara: 'Vara',
    reclamante_nome: 'Nome do Reclamante',
    reclamante_cpf: 'CPF do Reclamante',
    reclamada_nome: 'Nome da Reclamada',
    reclamada_cnpj: 'CNPJ da Reclamada',
    cargo_funcao: 'Cargo / Função',
    salario_base: 'Salário Base',
    tipo_demissao: 'Tipo de Demissão',
    jornada: 'Jornada de Trabalho',
  };
  return nomes[campo] ?? campo;
}

function formatarValor(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return JSON.stringify(v);
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function AutoFillReviewPanel({ caseId, onAfterApply }: Props) {
  const [propostas, setPropostas] = useState<PropostaPersistida[]>([]);
  const [loading, setLoading] = useState(true);
  const [somenteConflitos, setSomenteConflitos] = useState(false);
  const [somenteAltaConfianca, setSomenteAltaConfianca] = useState(false);
  const [aplicando, setAplicando] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const rows = await listarPropostas(caseId, {
        status: 'pendente',
        somenteConflitantes: somenteConflitos,
      });
      setPropostas(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    const channel = supabase
      .channel(`auto-fill-${caseId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auto_fill_proposals', filter: `case_id=eq.${caseId}` },
        () => carregar(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, somenteConflitos]);

  const propostasFiltradas = useMemo(() => {
    if (!somenteAltaConfianca) return propostas;
    return propostas.filter(p => p.confianca >= 0.85 && p.score_final >= 80);
  }, [propostas, somenteAltaConfianca]);

  async function handleAprovar(p: PropostaPersistida) {
    setAplicando(p.id);
    try {
      const ok = await aprovarProposta(p.id, async (proposta) => {
        const destino = DESTINO_CAMPO[proposta.campo];
        if (!destino) {
          return { ok: false, error: `Sem destino mapeado para campo ${proposta.campo}` };
        }
        const { data: row } = await supabase
          .from(destino.tabela)
          .select('id')
          .eq('case_id', caseId)
          .maybeSingle();
        if (!row?.id) {
          return { ok: false, error: `Sem registro em ${destino.tabela} para o caso` };
        }
        const valor = proposta.valor_proposto;
        const update = { [destino.coluna]: valor as unknown };
        const { error } = await supabase.from(destino.tabela).update(update).eq('id', row.id);
        return { ok: !error, error: error?.message };
      });
      if (ok) {
        toast.success(`${nomeCampo(p.campo)} aplicado`);
        onAfterApply?.();
      } else {
        toast.error('Falha ao aplicar proposta');
      }
    } finally {
      setAplicando(null);
    }
  }

  async function handleRejeitar(p: PropostaPersistida) {
    const ok = await rejeitarProposta(p.id);
    if (ok) toast.success('Proposta rejeitada'); else toast.error('Erro ao rejeitar');
  }

  async function handleReverter(p: PropostaPersistida) {
    setAplicando(p.id);
    try {
      const ok = await reverterProposta(p.id, async (proposta) => {
        const destino = DESTINO_CAMPO[proposta.campo];
        if (!destino) return { ok: false, error: 'Sem destino' };
        const { data: row } = await supabase
          .from(destino.tabela)
          .select('id')
          .eq('case_id', caseId)
          .maybeSingle();
        if (!row?.id) return { ok: false, error: 'Sem registro' };
        const update = { [destino.coluna]: proposta.valor_anterior };
        const { error } = await supabase.from(destino.tabela).update(update).eq('id', row.id);
        return { ok: !error, error: error?.message };
      });
      if (ok) {
        toast.success('Proposta revertida');
        onAfterApply?.();
      } else {
        toast.error('Falha ao reverter');
      }
    } finally {
      setAplicando(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Revisão de Auto-Preenchimento
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Propostas de preenchimento geradas a partir dos documentos enviados.
              Aprovações aplicam o valor no cálculo; rejeições mantêm o estado atual.
            </p>
          </div>
          <Badge variant={propostasFiltradas.length > 0 ? 'default' : 'secondary'}>
            {propostasFiltradas.length} {propostasFiltradas.length === 1 ? 'proposta' : 'propostas'}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={somenteConflitos} onCheckedChange={setSomenteConflitos} />
            Apenas com conflito
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={somenteAltaConfianca} onCheckedChange={setSomenteAltaConfianca} />
            Apenas alta confiança (≥ 85%)
          </label>
        </div>
      </CardHeader>

      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Carregando propostas…</p>}
        {!loading && propostasFiltradas.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Sem propostas pendentes. Faça upload de documentos para gerar sugestões automáticas.
          </p>
        )}
        <div className="space-y-3">
          {propostasFiltradas.map(p => {
            const conflito = Array.isArray(p.conflitantes) && p.conflitantes.length > 0;
            const confiancaPct = Math.round(p.confianca * 100);
            const corConfianca =
              confiancaPct >= 85 ? 'bg-green-500/15 text-green-700 dark:text-green-300'
              : confiancaPct >= 65 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
              : 'bg-red-500/15 text-red-700 dark:text-red-300';
            return (
              <div key={p.id} className="rounded-lg border p-4 space-y-3 hover:bg-accent/30 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm">{nomeCampo(p.campo)}</h4>
                      {conflito && (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <AlertTriangle className="h-3 w-3" /> Conflito
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-xs ${corConfianca}`}>
                        {confiancaPct}% confiança
                      </Badge>
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <FileText className="h-3 w-3" /> {nomeDocumento(p.doc_tipo)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Score final: {p.score_final.toFixed(1)} • {p.motivo_resolucao && `Resolução: ${p.motivo_resolucao}`} •
                      Criada em {formatarData(p.criado_em)}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm" variant="default"
                      onClick={() => handleAprovar(p)}
                      disabled={aplicando === p.id}
                      className="gap-1"
                    >
                      <Check className="h-4 w-4" /> Aplicar
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => handleRejeitar(p)}
                      disabled={aplicando === p.id}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Valor atual</span>
                    <div className="rounded border border-dashed p-2 font-mono text-xs">
                      {formatarValor(p.valor_anterior)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-primary">Valor proposto</span>
                    <div className="rounded border border-primary/40 bg-primary/5 p-2 font-mono text-xs">
                      {formatarValor(p.valor_proposto)}
                    </div>
                  </div>
                </div>

                {conflito && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 space-y-1">
                    <span className="text-xs font-medium text-destructive">
                      Outros documentos sugeriram valores diferentes:
                    </span>
                    {p.conflitantes.map((c, idx) => (
                      <div key={idx} className="text-xs flex items-center gap-2">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{nomeDocumento(c.doc_tipo)}:</span>
                        <span className="font-mono">{formatarValor(c.valor)}</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {Math.round(c.score * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {p.evidencia && (
                  <p className="text-xs text-muted-foreground italic border-l-2 pl-2">
                    "{p.evidencia.slice(0, 200)}{p.evidencia.length > 200 ? '…' : ''}"
                  </p>
                )}

                {p.status === 'aplicada' && (
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => handleReverter(p)}
                    disabled={aplicando === p.id}
                    className="gap-1 text-xs"
                  >
                    <RotateCcw className="h-3 w-3" /> Reverter
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
