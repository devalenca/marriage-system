# Arquitetura do Produto — marriage-system

Cockpit privado de gestão do casamento. pt-BR, BRL, dd/MM/yyyy, America/Sao_Paulo. Mobile-first.

## 1. Estrutura de telas

| Rota | Tela | Pergunta que responde |
|---|---|---|
| `/` | Redireciona para `/dashboard` (ou onboarding se não configurado) | — |
| `/dashboard` | **Início** — countdown, barra de orçamento, KPIs (meta, previsto, fechado, pago, pendente, saldo), próximos vencimentos, atrasados, tarefas do mês, resumo por categoria | "Como estamos?" |
| `/fornecedores` | Lista com busca + filtros por categoria e status | "Quem são nossos fornecedores?" |
| `/fornecedores/[id]` | Página do fornecedor: contato, valores, contrato, cronograma de pagamentos (entrada + parcelas), anexos (links) | "O que falta pagar/decidir aqui?" |
| `/financeiro` | Meta vs. gasto, breakdown por categoria (previsto/fechado/pago), vencimentos próximos e atrasados, parcelas restantes | "Para onde vai o dinheiro?" |
| `/checklist` | Cronograma mês a mês (lista) + visão calendário; tarefas com prazo, prioridade, responsável, status | "O que fazer agora?" |
| `/configuracoes` | Nomes do casal, data do casamento, meta de orçamento; regeneração do checklist | — |

Navegação: bottom tab bar no mobile (Início, Fornecedores, Financeiro, Checklist, Ajustes); sidebar no desktop. Tudo dentro do route group `app/(app)/` com shell compartilhado.

## 2. Modelo de dados (Convex)

Dinheiro sempre em **centavos inteiros**. Datas de domínio como string ISO `yyyy-MM-dd` (interpretada em America/Sao_Paulo).

### `settings` (singleton)
- `coupleNames: string` — ex.: "Gabriel & Fulana"
- `weddingDate: string` — ISO date
- `budgetGoalCents: number` — meta total (ex.: R$ 55.000,00 → 5500000)

### `vendors`
- `name: string`
- `category:` `espaco | buffet | decoracao | dj_banda | fotografia | filmagem | assessoria | celebrante | vestido_traje | beleza | doces_bolo | iluminacao | open_bar | mobiliario | convites | transporte | outros`
- `status:` `pesquisando | cotado | negociando | fechado | parcialmente_pago | pago | cancelado`
- `contactName? phone? instagram? website? notes?: string`
- `estimateCents?: number` — orçamento inicial
- `contractedCents?: number` — valor fechado
- `closedDate?: string` — data de fechamento (ISO)
- `paymentMethod?: string` — ex.: "PIX — entrada 30% + 6x"
- `links?: { label: string; url: string }[]` — contrato/anexos como links (upload de arquivos fica fora do MVP)
- Índice: `by_category`, `by_status`

### `payments`
- `vendorId: Id<"vendors">`
- `description: string` — "Entrada", "Parcela 2/6"…
- `amountCents: number`
- `dueDate: string` — ISO
- `isDownPayment?: boolean`
- `status:` `pendente | pago`
- `paidDate?: string` — data real do pagamento (ISO)
- Índices: `by_vendor`, `by_status_dueDate`
- "Atrasado" é **derivado** (pendente && dueDate < hoje), nunca armazenado.

### `tasks` (checklist)
- `title: string`, `notes?: string`
- `dueDate?: string` — ISO (calculada a partir da data do casamento na geração)
- `monthsBefore?: number` — bucket do cronograma (12, 10, 8, 6, 4, 3, 2, 1, 0)
- `priority:` `alta | media | baixa`
- `assignee?: string` — nome livre ("Gabriel", "Casal"…)
- `status:` `pendente | em_andamento | concluida`
- `isGenerated: boolean` — veio do template (regeneração não duplica)
- Índices: `by_status`, `by_dueDate`

## 3. Regras de cálculo (lib/domain — puro, testado)

- **Previsto** = Σ por fornecedor ativo: `contractedCents ?? estimateCents ?? 0`
- **Fechado** = Σ `contractedCents` de fornecedores fechados/parcialmente pagos/pagos
- **Pago** = Σ `payments` com status `pago`
- **Pendente** = Fechado − Pago
- **Saldo restante** = Meta − Fechado
- **% consumido** = Fechado ÷ Meta
- **Parcelas restantes** (por fornecedor e global) = nº de payments `pendente`
- **Vencimento próximo** = pendente com dueDate nos próximos 14 dias; **Atrasado** = pendente com dueDate < hoje (SP)
- Status do fornecedor sugerido automaticamente: ao registrar pagamento, `fechado → parcialmente_pago → pago` conforme Pago ÷ Fechado.

## 4. Fluxos principais

1. **Primeiro uso**: abrir app → sem `settings` → onboarding (nomes, data, meta) → gera checklist do template → dashboard.
2. **Contratar fornecedor**: criar em `pesquisando` com orçamento inicial → atualizar para `negociando` → fechar: informa valor fechado, data, forma de pagamento → cadastrar entrada + parcelas (gerador de parcelas: valor total, nº de parcelas, primeira data) → status `fechado`.
3. **Pagar parcela**: dashboard/financeiro mostra vencimento → marcar como pago (data real) → totais e status do fornecedor atualizam automaticamente → toast de celebração.
4. **Rotina mensal**: checklist do mês no dashboard → concluir/editar tarefas → adicionar tarefas próprias.
5. **Ajuste de meta**: configurações → muda meta → barra e saldo refletem na hora.

## 5. Cortes de escopo do MVP (conscientes)

- Anexos = links externos (sem upload de arquivos).
- Sem módulo de convidados/RSVP (referência Joy fica para v2).
- Sem auth/multiusuário — app local de uso pessoal (ver AGENTS.md).
- Visão calendário = grid mensal próprio somente leitura com navegação, sem arrastar/soltar.
