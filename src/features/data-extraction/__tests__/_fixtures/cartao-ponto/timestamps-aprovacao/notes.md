# Fixture sintética — timestamps de aprovação eletrônica

## Bug coberto

Parser estava criando batidas fantasmas a partir de frases de assinatura/
aprovação eletrônica do rodapé do espelho:

```
aprovado pelo usuário no dia 20/12/2021 às 10:14
aprovado pelo colaborador no dia 29/12/2021 às 14:42
```

→ Gerava no CSV:
```
20/12/2021;10:14;;;;;;;;;;;
29/12/2021;14:42;;;;;;;;;;;
```

CRÍTICO: inverteu o problema dos bugs anteriores — antes omitia batidas,
agora inventava jornada onde não houve trabalho.

## Origem

Auditoria do usuário sobre o caso Rosicleia (jun-dez/2021), espelho
encerrado em 15/12/2021. As datas 20/12 e 29/12 só apareciam nas frases
de assinatura/aprovação no rodapé do PDF, mas o parser as estava
processando como apurações diárias.

## Correção

`parsers/cartao-ponto.ts`:
- `RE_METADADO_LINHA` estendido com APROVADO/HOMOLOGADO/REGISTRADO
  ELETRONICAMENTE/VALIDADO/CONFIRMADO.
- Novo padrão `RE_TIMESTAMP_APROVACAO` casa "no dia DD/MM/YYYY às HH:MM"
  e "em DD/MM/YYYY às HH:MM" — sinal canônico de timestamp de aprovação.
- Linhas que casam qualquer um dos dois são puladas antes do split de
  batidas/eventos, garantindo zero criação de apuração.

## Cobertura adicional na fixture

A fixture inclui cinco variantes de timestamp de aprovação (usuário/
colaborador/gestor/eletronicamente/registrado) para garantir robustez
contra padrões parecidos.
