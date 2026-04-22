# OCR Samples (Fixtures)

Amostras de OCR **reais** extraídas do Supabase, **anonimizadas** para uso em testes de regressão dos parsers SQL (`parse_cartao_ponto_from_ocr`, `parse_holerite_from_ocr`, etc).

## Convenções de anonimização

Toda amostra real tem:
- Nome do trabalhador substituído por `FUNCIONARIO TESTE N` (onde N é sequencial dentro da fixture).
- CPF substituído por `000.000.000-00`.
- Matrícula substituída por `00000001`.
- RG / PIS / endereço pessoal removidos.
- Número do processo judicial zerado: `0000000-00.AAAA.5.UU.0000`.
- Assinaturas digitais (`Assinado eletronicamente por: ...`) removidas.
- URL de visualização PJe removida.
- Razão social, CNPJ, nome de filial: **mantidos** (não são dados pessoais; são identificadores de layout úteis para o parser).
- Valores monetários, datas de trabalho, horários, códigos de rubrica: **mantidos** (essência do teste).

## Arquivos

| Arquivo | Layout | Extensão | Fonte |
|---------|--------|---------:|-------|
| `cartao-ponto-via-varejo.md` | Matricial multi-mês | trecho ~3 meses | Real, documento `bfe297eb-...`, 1 funcionário, ciclo 21-20 |

Sintéticos para tipos sem corpus real (TRCT, FGTS extrato) ficam em arquivos separados claramente marcados `// SYNTHETIC`.

## Uso

Fixtures são lidas por testes Vitest em `src/lib/__tests__/parsers-sql-regression.test.ts` e inseridas como `documents.ocr_text` em Supabase dev (via `.rpc()` ou upload direto) para validar os parsers.
