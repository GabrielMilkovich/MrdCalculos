# Spec — Advogados

> **Seção 3/16** — paridade de input PJe-Calc Cidadão **v2.15.1**.
> Aba sob "Dados do Cálculo". Lista de advogados por parte (1-N).
>
> | Fonte | Path | Usado p/ |
> |---|---|---|
> | Java (canônico p/ regra) | `pjecalc-fonte/negocio/.../dominio/processo/Advogado.java` | tipos, validação |
> | Enum | `pjecalc-fonte/.../constantes/TipoAdvogadoEnum.java` | RT/RD |
> | App PJe-Calc | screenshot | labels/ordem |

---

## 0. Domínio
Entidade `Advogado` (`Advogado.java:48`, `@Entity TBADVOGADO`, seq `SQADVOGADO`).
`@ManyToOne` → `Processo` (`IIDPROCESSOCALCULO`, L67-69). Em `Processo`, dividido em
duas listas por `@Where(STPADVOGADO='RT'/'RD')`. Validação: `Advogado.validar()` (L137-165).

> **Nota de wiring:** advogados são **metadados** (relatórios/honorários), **não
> entram no cálculo financeiro** — `getAdvogados` não faz parte de `loadCaseData`/
> `toEngineParams`. O "campo chega ao engine de input" aqui significa: persiste e é
> lido de volta pelo serviço que relatórios consomem (`svc.getAdvogados`). Sem órfão.

## 1. Campos canônicos
| # | Campo (label) | Tipo Java | Col. JPA | Obrig. | Validação | Origem |
|---|---|---|---|---|---|---|
| 1 | **Nome** | String(150) | `SNMADVOGADO` | **sim** | `nome` null/vazio → MSG0003 "Nome" | `Advogado.java:55-56`, `validar:140-142` |
| 2 | **Documento — Tipo** | `TipoDocumentoFiscalEnum` (CPF/CNPJ/CEI) | `STPDOCFISCALADVOGADO` CHAR(4) | não | — | `:57-59` |
| 3 | **Documento — Número** | String(14) | `SNRDOCFISCALADVOGADO` | não | **se ≠ null**, valida dígito por tipo → MSG0004 "Número" | `:60-61`, `validar:143-160` |
| 4 | **OAB** | String(9) | `SNROABADVOGADO` | não | **nunca validado** (capturado/persistido só) | `:62-63` |
| 5 | (discriminador) **Tipo** | `TipoAdvogadoEnum` (RT/RD) | `STPADVOGADO` VARCHAR(2) | — | — | `:64-66`; enum `TipoAdvogadoEnum.java` |

- `numeroDocumento` setter **NÃO** remove não-dígitos (contraste com `ParticipanteProcesso`) — `:109-111`.
- **Caveat Java:** se `numeroDocumento != null` mas `tipoDocumento == null`, o `switch` (L144) lança NPE (sem guard). Na nossa impl, tratamos tipo sempre definido (default CPF) → sem NPE.
- `Advogado.validar()` **não** é chamado por `Calculo.validar`/`Processo.validar` — roda na camada de serviço/UI.

### Enums
| Enum | Valores (constante → nome / valor DB) | Arquivo |
|---|---|---|
| `TipoAdvogadoEnum` | RECLAMANTE→"Reclamante"/"RT"; RECLAMADO→"Reclamado"/"RD" | `TipoAdvogadoEnum.java:6-8` |
| `TipoDocumentoFiscalEnum` | CPF; CNPJ; CEI | (Seção 1) |

## 2. Estado atual no MRD (verificado contra prod)
- Tabela **`pjecalc_advogados`** (relkind `r`), RLS `Owner access via calculo` = `user_owns_calculo(calculo_id)`.
- Colunas: id, calculo_id, participante_id, nome, oab, oab_uf, cpf, email, telefone, representa, ativo, created_at, case_id.
- Módulo `ModuloAdvogados.tsx` já existe (sidebar `advogados`). Tinha só **Nome + OAB + UF**, e exigia **OAB** (divergência: Java exige só Nome).
- **Gap de paridade:** faltavam **Documento Fiscal (tipo + número)**. `oab_uf`, `email`, `telefone` são **extras MRD** (mantidos, fora de paridade).

### Migração aditiva (aplicada via MCP)
`+tipo_documento text default 'CPF'` (CHECK CPF/CNPJ/CEI) + `+numero_documento text`. `cpf` legado mantido (retrocompat).

## 3. Wiring
`svc.getAdvogados(caseId)` → `AdvogadoRow[]` (consumido por relatórios/honorários). Prova (Etapa 4): teste do schema garantindo cada campo no payload de insert; round-trip via MCP.

## 4. Definition of Done (output real — 2026-05-29)
- [x] `tsc --noEmit` → **exit 0**
- [x] `vitest run` suíte completa → **3205 passed | 45 skipped | 0 failed** (era 3200 → +5, zero regressão)
- [x] testes da seção: `advogado-schema.test.ts` = **5 verdes**
- [x] eslint limpo (exit 0)
- [x] ≥1 teste de validação — Nome obrigatório (MSG0003); doc por tipo só se preenchido (MSG0004); OAB não bloqueia (paridade Java)
- [x] persistência via MCP — round-trip de tipo_documento/numero_documento confirmado; linha de teste removida (prod limpo)
- [x] Playwright e2e → **2 passed (26.7s), exit 0** — `e2e/fluxos/10-advogados.spec.ts` (adiciona→persiste; nome vazio→bloqueia MSG0003)
- [x] migração aditiva aplicada via MCP + spec commitada
- [x] commit isolado da seção
