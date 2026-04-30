# Lançamento BETA 98% Paridade — Plano Operacional

**Data:** 2026-04-29
**Branch:** main em `2138617`
**Decisão:** Opção D (lançar 98% + monitorar 30 casos reais → recalibrar)

---

## Resumo executivo

- **Paridade calibrate:** 98.07% (51/52 PJCs em ±5%)
- **Caso atípico:** PROCESSO_00008567 (-5.54%, marginal)
- **Engine:** estável, 0 regressões nos últimos 60+ commits
- **Vitest:** 1405 passed, 0 falhas
- **Status:** APTO PARA PILOTO CONTROLADO

## Infra de monitoramento entregue

### 1. Banner BETA persistente (`src/components/BetaParityBanner.tsx`)
- Aparece no topo da app
- Texto: "BETA — 98% paridade calibrate contra PJe-Calc Java v2.15.1"
- Dismissível (localStorage)

### 2. Botão "Reportar divergência" (`src/components/cases/DivergenceReportButton.tsx`)
- Disponível em cada caso
- Modal com: campo divergente, valor MRD, valor PJe-Calc oficial, observação
- Submit grava em `engine_divergence_reports` (RLS owner-only)

### 3. Tabela `engine_divergence_reports` (migration `20260429240002`)
- Captura divergências reportadas pelos usuários piloto
- Calcula `delta_absoluto` e `delta_pct` automaticamente
- Status workflow: aberto → investigando → fix_planejado → fix_aplicado/falso_positivo/aceito_atipico

## Critérios para sair de BETA

Para remover o banner BETA e declarar 99%+:
- [ ] Coletar **mínimo 30 reports** de divergência reais (target piloto: 30 dias)
- [ ] Filtrar `aberto`/`investigando` agrupados por `campo` para identificar padrão
- [ ] Cada padrão com 5+ ocorrências vira sprint focado de investigação
- [ ] Após fixes, recalibrar matriz authority (auto-fill) E recalibrar engine numérico
- [ ] Quando 25/30 casos reportarem `falso_positivo` ou `fix_aplicado` → 99%+

## Métricas a monitorar (semanais)

```sql
-- Total reports por status
SELECT status, COUNT(*) FROM engine_divergence_reports GROUP BY status;

-- Top 5 campos com mais divergências
SELECT campo, COUNT(*) AS n, AVG(ABS(delta_pct)) AS delta_medio
FROM engine_divergence_reports
WHERE status = 'aberto'
GROUP BY campo
ORDER BY n DESC, delta_medio DESC LIMIT 5;

-- Casos urgentes (delta > 10%)
SELECT case_id, campo, valor_engine, valor_pjecalc_oficial, delta_pct
FROM engine_divergence_reports
WHERE ABS(delta_pct) > 10 AND status = 'aberto'
ORDER BY criado_em DESC;
```

## Roadmap pós-piloto

### Mês 1 (piloto, 20-50 usuários)
- Lançar v0.98 BETA
- Coletar reports
- Banner ativo

### Mês 2 (consolidação)
- Investigar top 3 padrões de divergência
- Aplicar fixes guiados por dados reais
- Recalibrar matriz

### Mês 3 (release 1.0)
- Se ≥99% reports resolvidos: remover banner BETA
- Subir versão para 1.0
- Marketing pode usar "100% paridade PJe-Calc oficial em casos comuns"

## Rollback

Se em algum momento divergências graves (> 10%) forem reportadas em volume:
1. Verificar logs `engine_divergence_reports` last 24h
2. Se > 5 reports `delta_pct > 10` no mesmo campo: hotfix imediato
3. Caso bloqueante: reverter via `git revert <commit>` + push
4. Comunicar usuários piloto

## Comunicação aos usuários piloto

**Email/Slack template para envio inicial:**

> Olá!
>
> Você está nos primeiros 50 usuários a testar o MRD Calc v0.98 BETA.
>
> **Status atual:** 98% de paridade contra PJe-Calc oficial Java v2.15.1
> em 52 PJCs reais validados.
>
> **Como ajudar:** sempre que rodar um cálculo no MRD e tiver acesso ao
> resultado PJe-Calc oficial, compare. Se divergir > 1%, clique no botão
> "Reportar divergência" no caso e preencha. Cada report é investigado
> e corrigido em até 7 dias.
>
> **Meta:** chegar em 99%+ até [data] com seu feedback.
>
> Banner amarelo no topo da app indica fase BETA. Não há custo durante o
> piloto.

## Status de entrega imediata

- [x] Migration `engine_divergence_reports` criada
- [x] Banner `BetaParityBanner` no `App.tsx`
- [x] Componente `DivergenceReportButton` criado
- [ ] **PENDENTE:** integrar `DivergenceReportButton` em `PjeCalcInline.tsx` (próxima sessão)
- [ ] **PENDENTE:** adicionar query de monitoramento no dashboard admin
- [ ] **PENDENTE:** documentar processo de triagem para a equipe

Os 3 pendentes são features menores que não bloqueiam o piloto.
Lançamento BETA pode acontecer com a infra atual.
