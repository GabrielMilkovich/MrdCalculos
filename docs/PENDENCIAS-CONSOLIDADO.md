# Pendências Consolidadas — sessão 24/05/2026

> Mapa de pendências pós-sessão longa que diagnosticou padrão "3 frentes abertas, 0 fechada".
> Próxima sessão começa lendo este arquivo.

## Prioridade 1 — Validar Holerite V2 end-to-end (SMOKE MANUAL)

**Não é trabalho de Claude Code. É trabalho manual do operador em produção.**

### Procedimento

1. Acessar `mrdcalc.vercel.app`
2. Logar com `gabriel.wrldd@gmail.com` (senha trocada após sessão de 24/05)
3. Abrir case ROSICLEIA: `5d9782f0-d404-4d52-a6ab-b6241fdbefb9`
4. Abrir doc `f9a67e48-5960-4bd9-a1e9-481cd8fadc48` ("Contracheques ate 06.2021.pdf")
5. Aba "Validação" → botão "Revisar e baixar ZIP"
6. **Esperado**: banner "Ontologia de classificação" monta com "190 não-classificadas de 572"
7. Se banner aparece:
   - Classificar 1 rubrica `NAO_CLASSIFICADO` escolhendo categoria V2 (COMISSOES_PRODUTOS, DSR_S_COMISSOES, PREMIOS, DESCONSIDERADAS)
   - Fechar dialog → reabrir → classificação deve persistir com ícone ↩
   - Clicar "Confirmar e baixar ZIP" → toast "1 classificação salva para futuros casos"
8. Se passou nos 7: **Sprint V2 Holerite FECHADA**. Marca este item como concluído neste arquivo.

### Se banner NÃO monta

- Causa provável: fix do commit `dda555c4` não pegou em prod
- Arquivo a debugar: `src/features/data-extraction/export/per-doc/index.ts` (helper `extrairResumoClassificacaoDoV6`)
- Validação no banco (via MCP): `SELECT parsed->'resumo_classificacao' FROM documents WHERE id = 'f9a67e48-5960-4bd9-a1e9-481cd8fadc48'` deve retornar objeto com `nao_classificadas > 0`
- **NÃO atacar Ficha Financeira até banner V2 estar visível em prod**

---

## Prioridade 2 — Pipeline Ficha Financeira (30-60h, sessão dedicada)

**NÃO COMEÇAR sem fechar Prioridade 1.**

### Escopo real (descoberto na auditoria de 24/05)

- Tipo `ficha_financeira` **NÃO EXISTE** no enum `tipo_extracao` (tipos atuais: cartao_ponto, ctps, holerite, nao_extrair)
- Pipeline `parse-ficha-financeira` **NUNCA é chamado** pelo orchestrator
- 3 commits mergeados em 24/05 são **código morto** até trigger ser construído:
  - `66665605` (Claude Sonnet + PDF + blocklist)
  - `db73c7a7` (parser determinístico ADP/Via Varejo)
  - parte do blocklist em commits anteriores

### Trabalho necessário (ordem importa)

1. **Migration**: `ALTER TYPE tipo_extracao ADD VALUE 'ficha_financeira'`
2. **Classificador no upload**: heurística que detecta Ficha vs Holerite
   - Ficha: título contém "Ficha Financeira" + 12 meses de competências distintas no body
   - Holerite: 1 competência única + estrutura mensal
3. **Trigger no pipeline** (`process-document-start`): se `tipo_extracao = 'ficha_financeira'` → chama `parse-ficha-financeira` (já existe, é só pluggar)
4. **UI específica**: nova tela ou adaptação do `HoleritePreviewDialog` (que hoje assume holerite mensal único, não tabela anual)
5. **Exporter ZIP** no formato Via Varejo correto:
   - `historico_salarial.csv`: **1 linha POR COMPETÊNCIA MENSAL** (não 1 linha 06/2021)
   - `auditoria_completa.csv`: códigos preenchidos, categorias variadas (não 100% salario_fixo)
   - Validador: `sum(rubricas Incluido=S) ≈ Total do PDF ± 1%`

### Código pré-requisito JÁ EXISTENTE (reusar)

- `supabase/functions/parse-ficha-financeira/` — parser determinístico ADP
- Blocklist: códigos 6xxx (provisões), 8xxx (encargos patronais), 9920-9961 (FGTS empregador)
- Mapper V2 ontologia (`rubrica_aliases` + `rubrica_aliases_tentativa`)

### Validação obrigatória antes de declarar feature pronta

Importar ZIP gerado no **PJe-Calc 2.15.1 desktop** + comparar cálculo gerado com cálculo manual de referência (±5% delta).

---

## Prioridade 3 — CTPS (depois de Prioridade 2)

### Pré-requisito (faz ANTES de codar)

Schema PJe-Calc para CTPS é desconhecido. Antes de qualquer linha de código:

1. Abrir PJe-Calc 2.15.1 desktop
2. Criar caso dummy: 1 funcionário com 2 períodos de férias + 1 afastamento
3. Exportar CTPS desse caso
4. Anexar export ao próximo Claude para derivar schema correto

### Estado atual

Fix `19918a40` (CTPS férias↔faltas inversão) está em main mas **não foi validado em smoke real**. Pode estar correto ou não.

---

## Pendências menores

- [ ] Trocar senha `gabriel.wrldd@gmail.com` no Supabase Dashboard (60s, ação manual)
- [ ] Item P1 hardening: substituir `https://esm.sh/@supabase/supabase-js@2` por `npm:@supabase/supabase-js@2` nas 13 edge functions afetadas (evita deploy fail por CDN externa, ~2-3h)
- [ ] Conflict UX dialog secundário (Sprint V2 item 2, 4-6h)
- [ ] Bug #6 orchestrator: `executarLiquidacao` apaga TODAS ocorrências em `pjecalc_ocorr_calculo` sem filtrar `origem='CALCULADA'` (Sprint Hotfix antiga, contexto em sessão anterior do projeto MRD Calc Sprint Hotfix)
- [ ] `mrdcalc.com.br` não resolve em DNS — adicionar custom domain no Vercel ou padronizar uso de `mrdcalc.vercel.app`

---

## Aprendizado de processo (não repetir)

### Padrão diagnosticado nesta sessão

"3 frentes abertas, 0 fechada":
- Sprint V2 Holerite mergeada mas banner não validado visualmente em prod
- Fix CTPS mergeado mas não testado em smoke
- Parser Ficha mergeado mas pipeline inexistente (código morto)

### Regras pra próximas sessões

1. **Fechar 1 frente totalmente** (com smoke real em prod, não MCP, não script) antes de abrir outra
2. **Smoke manual em produção é obrigatório** antes de declarar feature pronta. Compilar verde + testes verde ≠ funciona.
3. **Não confundir "código mergeado" com "feature funcionando"**
4. **Validar histórico de mensagens** antes de questionar — em conversas longas é fácil perder rastro, mas embutir acusação em vez de pedir reconstrução custa relação
5. **Quando assistente recomendar parar e validar antes de codar mais**, considerar seriamente. Sessão 24/05 acumulou 4 commits sob pressão de "preciso disso pronto agora" e descobriu na auditoria que metade era inerte.

---

## Commits desta sessão (referência)

Todos em `main`:
- `db73c7a7` feat(parse-ficha): parser determinístico ADP/Via Varejo — **código morto**
- `614e7440` docs+fix: CLAUDE.md V2 + testes .skip (CI verde)
- `19918a40` fix(ctps): parser faltas exclui HISTÓRICO DE FÉRIAS — **não validado**
- `66665605` feat(parse-ficha): Claude Sonnet + PDF + blocklist — **código morto**
- `128c23ab` merge: verify-ai PDF source — **não validado**
- `dda555c4` merge: banner resumo_classificacao fix — **não validado visualmente**
- `6778ce90` docs(hardening): plano consolidado
- (12 commits anteriores da Sprint V2 ontologia)

---

## Próxima sessão

Abrir conversa nova com mensagem:

> Próxima sessão. Vou fazer smoke do Holerite V2 conforme PENDENCIAS-CONSOLIDADO.md Prioridade 1. Depois decidimos Ficha Financeira.
