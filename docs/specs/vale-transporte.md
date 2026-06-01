# Spec — Vale Transporte

> **Seção 14/16** — paridade de input PJe-Calc Cidadão **v2.15.1**.
> Aba sob "Verbas e Ocorrências".
>
> | Fonte | Path | Usado p/ |
> |---|---|---|
> | Java (canônico) | `pjecalc-fonte/negocio/.../dominio/valetransporte/ValeTransporte.java` + `ValorValeTransporte.java` + `termo/ValeTransporteProxy.java` | tipos, validação |
> | App PJe-Calc | aba "Vale Transporte" | labels |

---

## 0. Domínio (Java) — catálogo standalone (padrão HistoricoSalarial)
`ValeTransporte` (`@Entity TBVALETRANSPORTE`, `:67-71`) é **catálogo standalone** de linhas de transporte — **cadastrado pelo gestor regional, NÃO é filho de `Calculo`** (zero refs em `Calculo.java`). Padrão idêntico a HistoricoSalarial+Ocorrência:
- **`ValeTransporte`** (cabeçalho da linha): `descricaoLinha` (VARCHAR100, @Required), `tipoDeLinha` (`TipoDeLinhaEnum` URBANO/INTERURBANO, default URBANO, @Required), `estado` (@Required), `municipio` (@Required **só se URBANO**), `dataEncerramentoLinha` (@LimitedTo100Years).
- **`ValorValeTransporte`** (ocorrência/vigência, `TBOCORRENCIAVALETRANSPORTE`): `dataInicio` (@Required+@LimitedTo100Years), `dataTermino` (encadeado), `valor` (**NUMERIC(19,2)**, @Required). Ordenadas por dataInicio DESC. Encadeamento de vigência (`adicionar`: nova dataInicio > fim anterior senão MSG0051; auto-preenche término anterior).
- Validação `ValeTransporte.validar()` (`:186-207`): ≥1 ocorrência (MSG0047); regras de encerramento (MSG0058/MSG0007).
- Consumo: `ValeTransporteProxy.resolverValor` (termo de fórmula) soma valor×dias do período; vínculo a verba via `ValeTransporteDaVerba` (BASE/PAGO).

> **⚠️ NÃO há regra de 6% / desconto / valor≥0 no domínio Java** (grep confirmou vazio em `valetransporte/` + `ValeTransporteProxy`). VT é só catálogo de valor bruto; qualquer desconto seria a jusante numa verba.

### Enums
| Enum | Valores (label/DB) | Arquivo |
|---|---|---|
| `TipoDeLinhaEnum` | URBANO "Urbano"/"U" (default); INTERURBANO "Interurbano"/"I" | `TipoDeLinhaEnum.java:6-8` |
| `BaseDeCalculoDoPrincipalEnum.VALE_TRANSPORTE` | "Vale Transporte"/"VT" → ValeTransporteProxy | (Seção 11) |

## 1. Estado atual no MRD (verificado contra prod) — DIVERGÊNCIA de modelagem
- 3 tabelas: `pjecalc_vale_transporte` (competência/valor/desconto/uf/municipio/vigência — **mais próxima do Java**, mas não usada pelo módulo ativo), `pjecalc_vale_transporte_config` (apurar, desconto_empregado_pct), `pjecalc_vale_transporte_linhas` (descricao, tipo URBANO/INTERMUNICIPAL/INTERESTADUAL, valor_passagem, quantidade_dia).
- Módulo ativo `ModuloValeTransporte`: usa **config + linhas** — design **MRD-específico** com `apurar` toggle + `desconto_empregado_pct` (6% cap via `Math.min(6,…)`).
- **Divergência registrada:** o modelo config+6% do MRD **não tem respaldo no Java** (Java = catálogo linha+vigência+estado/município, sem 6%). É design próprio do MRD. Mantido (não desmonto; fonte-da-verdade Java é p/ regra, mas não invento alterar o modelo de consumo do MRD nem o motor). VT **não é engine-wired** no MRD (orchestrator/resolver não leem) — feature ainda não aplicada ao cálculo.

### 🐞 Bugs/gaps encontrados
1. **Linhas não persistem edição:** inputs de descrição/tipo/valor_passagem/quantidade_dia têm `defaultValue` mas **nenhum `onChange`/`onBlur`** (`ModuloValeTransporte.tsx:122-132`); e **não existe `updateValeTransporteLinha`** no service (só insert/delete). → editar uma linha não salva. **Corrigir.**
2. Sem validação de valor_passagem/quantidade_dia.

### Gap de paridade (escopo desta seção)
| Aspecto | Java | MRD | Ação |
|---|---|---|---|
| desconto 6% | **não existe** | config (Math.min 6) | manter (regra MRD); validar 0–6 |
| valor ≥ 0 | **não valida** | ausente | +schema (guard MRD-level; documentado) |
| edição de linha persiste | (catálogo) | **BUG: não persiste** | **fix: +updateValeTransporteLinha + onChange** |
| descrição/tipo obrigatórios | @Required | parcial | +schema |

> **Decisão (autonomia):** (1) `vale-transporte-schema.ts` (zod: descrição obrigatória; valor_passagem≥0; quantidade_dia≥0; desconto 0–6). (2) Adicionar `updateValeTransporteLinha` no service + fiar `onBlur` nos inputs da linha (corrige o bug de persistência). Decimal p/ valor. Não desmonto o modelo config+linhas do MRD nem o motor. Divergência vs catálogo Java registrada como dívida.

## 2. Definition of Done (output real — 2026-05-29)
- [x] `tsc --noEmit` → **exit 0**
- [x] `vitest run` suíte completa → **3304 passed | 45 skipped | 0 failed** (era 3296 → +8, zero regressão)
- [x] testes da seção: `vale-transporte-schema.test.ts` = **8 verdes**
- [x] eslint limpo (exit 0)
- [x] ≥1 teste validação — descrição obrigatória; valor_passagem≥0; quantidade_dia inteira≥0; desconto 0–6 + clamp
- [x] **fix bug:** edição de linha persiste — novo `updateValeTransporteLinha` (service) + `onBlur`/`onValueChange` nos inputs (antes display-only, sem update)
- [x] persistência via MCP — round-trip `pjecalc_vale_transporte_linhas` (UPDATE valor 4.50→5.25 em statement separado, prova o fix); rows removidas
- [x] Playwright e2e → **2 passed (11.1s), exit 0** — `e2e/fluxos/19-vale-transporte.spec.ts` (add linha→edita→persiste; valor negativo→bloqueia)
- [x] spec commitada / commit isolado da seção

## 3. Dívidas
- **Divergência de modelagem:** MRD usa config+linhas+6% (sem respaldo Java); Java é catálogo standalone linha+vigência (`ValeTransporte`/`ValorValeTransporte`) com estado/município e sem 6%. Alinhamento ao catálogo Java = trabalho futuro maior (fora do escopo de validação desta seção).
- VT não é engine-wired no MRD (não chega ao cálculo) — feature pendente.
- `pjecalc_vale_transporte` (tabela competência/valor, mais fiel ao Java) coexiste mas não é usada pelo módulo ativo.
