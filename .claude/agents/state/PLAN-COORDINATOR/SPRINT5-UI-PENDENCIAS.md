# Sprint 5 — UI: pendências documentadas

> **Data:** 2026-04-27
> **Status:** documentado para implementação posterior (requer migrations Supabase)

## Por que adiar implementação completa

1. **0/47 PJCs do corpus** ativam Pensão Alimentícia, Prev. Privada,
   Aprendiz/FGTS 2%, ou IRPF Honorário
2. **Migrations Supabase** necessárias para novos campos
3. **Sem ground-truth** para validar comportamento dos campos
4. **Risco alto** de criar UI sem testar fluxo end-to-end real
5. **ROI baixo** vs Sprint 6 (validação) e Sprint 7 (adicionais)

## Campos UI pendentes por módulo

### ModuloPensaoAlimenticia.tsx
Atual: `apurar`, `percentual`, `incidir_sobre_juros`, `base` (4 campos)

Falta:
- `incidencia_sobre_fgts` (boolean) — Java: `<incidenciaPensaoAlimenticia>` em `<Fgts>`
- `incidencia_sobre_multa_fgts` (boolean) — Java: `<incidenciaPensaoAlimenticiaSobreMulta>`
- `descontar_antes_ir` (boolean) — afeta base IR
- `dependentes` (lista: nome + CPF + data_nascimento)

### ModuloPrevidenciaPrivada.tsx
Atual: `apurar`, `periodos[].aliquota`

Hardcoded (precisam virar campos):
- `base_calculo` ('diferenca' / 'devido' / 'corrigido') — atualmente `'diferenca'` fixo
- `deduzir_ir` — atualmente `true` fixo
- `tetoMensal` — não existe na UI

Falta:
- `juros` ('trabalhista' / 'pago' / 'nenhum')

### ModuloSalarioFamilia.tsx
Atual: `apurar`, `qtd_filhos`, `filhos_detalhes`, `competencia_inicial/final`

Hardcoded:
- `cota` (R$ 62,04 fixo 2025) — precisa override por ano
- `teto_salarial` (R$ 1 819,26 fixo 2025) — idem

### ModuloFGTS.tsx
Falta:
- Aprendiz: alíquota 2% (atualmente `aliquota` aceita só 8 ou 2 mas UI não expõe)
- LC 110/2001 0,5% — extinta 2020 (manter para casos antigos)

### ModuloHonorarios.tsx
Falta na UI:
- `tipoCobrancaReclamante` (DESCONTAR_CREDITO / COBRAR)
- `aplicarJuros` + `dataApartirDeAplicarJuros`
- `apurarIRRF` + `tipoImpostoRenda` (PF tabela / PJ 1,5%)
- `tipoDeIndiceDeCorrecao` (TRABALHISTA / OUTRO)

### ModuloMultasCLT.tsx
Falta:
- Multa 523 CPC (10% descumprimento) — completamente ausente
- `tipoCobrancaReclamante` por multa

### ModuloIR.tsx
Falta:
- `rraMeses`, `rraNumeroParcelas` (RRA art. 12-A) — alto impacto em casos > 12m
- `incidirSobrePrincipalNaoTributavel` / `incidirSobrePrincipalTributavel`

### ModuloCS.tsx
Atual: completo. Faltam só campos órfãos TS sem UI:
- `com_correcao_trabalhista` (TS-only) — precisa expor
- `atualizar_inss_selic` (TS-only)
- `base_cs_segurado` (TS-only)
- `separar_reclamante_beneficiario` (TS-only)

## Tooltips inline (todos os módulos)

Cada checkbox/select deve ter tooltip explicando:
- O que faz quando MARCADO
- O que faz quando DESMARCADO
- Base legal (lei/súmula quando aplicável)
- Quando usar / quando não usar

## Estimativa de esforço

| Item | Horas | Migrations Supabase |
|------|------:|--------------------|
| Tooltips em 16 módulos | 8h | NÃO |
| Pensão (3 campos) | 2h | SIM (1 migration) |
| Prev. Privada (4 campos) | 2h | SIM |
| Salário-Família (override anual) | 2h | SIM (cotas anuais) |
| FGTS (aprendiz + LC110 0,5%) | 1h | NÃO (já tem TS) |
| Honorários (5 campos UI) | 3h | SIM |
| Multas (Multa 523 + tipoCobranca) | 2h | SIM |
| IR (RRA + principal trib/n_trib) | 3h | SIM |
| CS (4 campos órfãos TS) | 2h | NÃO |
| **Total** | **25h** | **6 migrations** |

## Quando implementar

Quando aparecer **caso real** que exercite a feature:
- Pensão alimentícia ativa → implementar pensão
- Caso > 12m com IR alto → implementar RRA
- Aprendiz → implementar 2% FGTS
- Multa 523 ativa → implementar UI
- etc.

Sem caso real, a implementação é especulativa e pode estar errada.

## Conclusão

Sprint 5 fica documentada como **dívida técnica priorizada** —
implementação aguarda demanda real. Foco atual: garantir que o cálculo
EXISTENTE está correto (Sprints 6 e 7).
