# PJCs Necessários para Desbloquear Phase 2

> **Data:** 2026-04-27
> **Objetivo:** listar PJCs reais com features que o corpus atual de 47 PJCs
> NÃO contém — sem essas amostras, implementação engine das Phase 2 features
> seria especulativa.

## O que o corpus atual NÃO cobre

Após auditoria detalhada nos 47 PJCs:

| Feature | Status corpus | O que precisa |
|---------|--------------|---------------|
| **Pensão alimentícia ativa** | 0/47 | PJC com `<percentualPensao>X</percentualPensao>` > 0 |
| **Previdência privada ativa** | 0/47 | PJC com `<apurarPrevidenciaPrivada>true</apurarPrevidenciaPrivada>` |
| **RRA Art. 12-A explícito** | 0/47 | PJC com `<rraMeses>N</rraMeses>` > 0 |
| **`tipoCobrancaReclamante=COBRAR`** | 0/47 | PJC com hono cobrado à parte (não desconta) |
| **`apurarIRRF=true`** honorário | 0/47 | PJC com IRPF retido sobre honorário |
| **`apurarIRRF` PJ 1,5%** honorário | 0/47 | Variante PJ |
| **Aprendiz FGTS 2%** | 0/47 | `<aliquotaDoFgtsEnum>DOIS_POR_CENTO</...>` |
| **Adicional noturno** | 0/47 | Verba "ADICIONAL NOTURNO" >R$ 0 |
| **Periculosidade** | 0/47 | Verba "PERICULOSIDADE" >R$ 0 |
| **Insalubridade** | 1/47 (PROCESSO_00107350...) | Mais casos |
| **Justiça gratuita** | 0/47 | PJC com flag de gratuidade |
| **Empregado doméstico** | 0/47 | LC 150/2015 |
| **Casos pré-2017** (sem reforma) | 1/47 | `<dataAjuizamento>` < 2017-11-11 |
| **Multa 467 ativa** | 1/47 (carla) | Mais casos |
| **Multa 477 §8º ativa** | 0/47 | Caso real |
| **Multa 523 CPC ativa** | 0/47 | Execução com descumprimento |

## Como obter

### Opção 1 — Pedir ao usuário
Cada feature acima precisa de **1 PJC real** onde a feature está ativa
para servir de ground-truth na implementação.

Sugerimos pedir ao MRD Calc usuários reais (advogados que têm casos
diversos) para enviar PJCs com:
1. Pensão alimentícia (filhos menores)
2. Previdência privada ativa (Petros, Funcef etc.)
3. Caso de mais de 12 meses com IR alto (RRA)
4. Honorário PJ (escritório com CNPJ)

### Opção 2 — Gerar manualmente
Em **PJe-Calc Java oficial** (instalação local), criar 1 caso por feature:
1. Cadastrar reclamante fictício
2. Marcar feature específica
3. Calcular
4. Exportar `.pjc`
5. Submeter como ground-truth

### Opção 3 — TRTs públicos
Alguns processos com cálculos `.pjc` são públicos via PJe (sistema do CSJT).
Buscar processos arquivados que envolvam:
- Pensão alimentícia (juízos de família)
- Falência de empresa (massa falida)
- Empregado doméstico
- Estagiário (raro)
- Ações 2010-2017 (pré-reforma)

## Quando cada feature é desbloqueada

Para CADA PJC recebido:

1. **Validar parser**: `analyzePJC(xml)` extrai a feature
2. **Validar adapter**: `convertPjcToEngineInputs(a)` mapeia
3. **Investigar Java**: ler MaquinaDeCalculoDeXxx.java para entender fórmula exata
4. **Implementar engine**: replicar fórmula em TS
5. **Validar com planilha item-a-item** (igual antonio):
   - Componentes individuais batem ±2%?
   - Líquido bate ±0,5%?
6. **Property-based test**: garantir invariantes
7. **Calibrate**: rodar em todos os 47 + novo PJC

## Estimativa de implementação por feature

| Feature | Esforço | Probabilidade |
|---------|--------:|--------------|
| Pensão alimentícia (com FGTS) | 4-6h | 80% |
| Previdência privada completa (teto, juros) | 4-6h | 80% |
| RRA Art. 12-A (cálculo mensalizado) | 6-8h | 70% |
| `tipoCobrancaReclamante=COBRAR` | 1-2h | 90% |
| IRPF honorário PF/PJ | 3-4h | 85% |
| Aprendiz FGTS 2% | 1h | 100% |
| Adicional noturno | 3-4h | 85% |
| Periculosidade/Insalubridade | 4-5h | 80% |
| Justiça gratuita | 2-3h | 90% |
| Multa 523 CPC unificada | 2h | 95% |
| **Total** | **30-43h** | **85% médio** |

## Conclusão

**Sem os PJCs ground-truth, implementar Phase 2 é especulação.**
A documentação `PHASE2-FEATURES-PENDING.md` lista o que está pronto em
tipos/parser/adapter/UI mas o engine não calcula.

Quando cada PJC chegar:
1. Re-rodar este documento confirmando feature aparece no XML
2. Implementar engine seguindo metodologia validada (planilha antonio)
3. Validar contra o PJC ground-truth
4. Remover badge "🔬 Em estudo" da UI

## Próximos passos imediatos (sem precisar de PJC novo)

Mesmo sem ground-truth, podemos:

1. **Unificar Multa 523 CPC** entre `correcaoConfig.multa_523` e `multasConfig.apurar_523_cpc` — alinhar mapeamento (~1h)
2. **Aprendiz FGTS 2%** — engine já suporta via `aliquota=2`, só precisa garantir UI persiste (1h)
3. **`tipoCobrancaReclamante=COBRAR`** — implementação engine simples: somar honorário em totalizador separado (2h)
4. **Documentar limitações conhecidas** ao usuário final (1h)

Total: ~5h de progresso real sem depender de PJCs novos.
