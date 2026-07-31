# Arquitetura do Produto — marriage-system

Cockpit de planejamento do casamento, vendido como assinatura para casais.
pt-BR, BRL, dd/MM/yyyy, America/Sao_Paulo. Mobile-first.

## 1. Estrutura de telas

| Rota | Tela | Pergunta que responde |
|---|---|---|
| `/` | Landing pública (proposta, personalização ao vivo, 14 dias grátis) | "Vale a pena?" |
| `/cadastro` · `/login` · `/convite` | Criar conta, entrar (com "esqueci minha senha") e aceitar convite definindo a própria senha | — |
| `/dashboard` | **Início** — countdown, versículo do dia, resumo do orçamento, próximos vencimentos, atrasados, tarefas do mês, convidados, resumo por categoria | "Como estamos?" |
| `/fornecedores` · `/fornecedores/[id]` | Lista com busca e filtros; página do fornecedor com contato, valores, cronograma de pagamentos e anexos | "Quem são e o que falta pagar?" |
| `/financeiro` | Meta vs. gasto, por categoria e por forma de pagamento, previsão de 6 meses, atrasados/próximos, histórico e exportação CSV | "Para onde vai o dinheiro?" |
| `/checklist` | Cronograma mês a mês em lista, quadro e calendário | "O que fazer agora?" |
| `/convidados` · `/convidados/check-in` | Convites e convidados com RSVP manual; modo check-in do dia com busca | "Quem vem?" |
| `/inspiracoes` · `/anexos` | Moodboards de referências; índice único dos arquivos do casamento | — |
| `/configuracoes` | Dados do casamento, tema do casal, minha conta, acessos, notificações, feedback, exclusão da conta | — |
| `/admin` | Painel do superadmin: provisionar casais, assinatura, feedback | — |

Navegação: barra superior + drawer no mobile; sidebar recolhível no desktop
(atalhos 1–8 e paleta ⌘K/Ctrl+K). Tudo dentro do route group `app/(app)/`
com shell compartilhado e `components/auth-gate.tsx` na frente.

## 2. Multi-tenancy e autenticação

- O tenant é uma linha de **`weddings`**; usuários chegam nele por **`memberships`**
  (`admin` | `member`), uma por usuário.
- `convex/lib/auth.ts` é o único módulo que toca `ctx.auth` e exporta os builders
  `authedQuery/Mutation`, `weddingQuery/Mutation`, `weddingAdminMutation` e
  `superadminQuery/Mutation`. Toda função de feature usa um deles.
- Assinatura vencida deixa o app em **somente leitura** (`assertWritable` lança
  `SUBSCRIPTION_EXPIRED`); queries continuam funcionando e a exclusão LGPD também.
- Detalhes de contas, convites e e-mail: ver `AGENTS.md`.

## 3. Modelo de dados (Convex)

Dinheiro sempre em **centavos inteiros**. Datas de domínio como string ISO
`yyyy-MM-dd` (interpretada em America/Sao_Paulo); carimbos usam epoch ms.

| Tabela | Conteúdo |
|---|---|
| `weddings` | Nomes do casal, data, meta, locais, horário, tema, `subscriptionActiveUntil`, aceite dos termos |
| `memberships` | Vínculo usuário ↔ casamento com papel |
| `invitations` · `emailChangeRequests` | Convites e trocas de e-mail pendentes (token/código **hasheado**, com expiração) |
| `notificationPrefs` | Opt-outs por usuário dos lembretes diários |
| `vendors` | Fornecedor: categoria (17), status (7), contato, `estimateCents`, `contractedCents`, forma de pagamento, links |
| `payments` | Parcela de um fornecedor: descrição, valor, vencimento, `pendente \| pago`, data real |
| `attachments` | Arquivo no storage do Convex, preso a um fornecedor **ou** a um pagamento |
| `galleries` · `inspirationImages` | Moodboards e suas imagens |
| `invites` · `guests` | Convite (família/grupo) e seus convidados com RSVP e check-in |
| `tasks` | Tarefa do checklist: prazo, `monthsBefore`, prioridade, responsável, status, `isGenerated` |
| `verses` · `feedback` | Conteúdo global do versículo diário; caixa de entrada de feedback |

Toda tabela do tenant carrega `weddingId` e tem índice `by_wedding`.
"Atrasado" é **derivado** (pendente && vencimento < hoje), nunca armazenado.

## 4. Regras de cálculo (`lib/domain` — puro, testado)

- **Previsto** = Σ por fornecedor ativo: `contractedCents ?? estimateCents ?? 0`
- **Fechado** = Σ `contractedCents` de fornecedores fechados/parcialmente pagos/pagos
- **Pago** = Σ `payments` com status `pago`
- **Pendente** = Fechado − Pago · **Saldo** = Meta − Fechado · **% consumido** = Fechado ÷ Meta
- **Vencimento próximo** = pendente nos próximos 14 dias; **Atrasado** = pendente com vencimento < hoje (SP)
- Status do fornecedor é recalculado a cada pagamento: `fechado → parcialmente_pago → pago`
- Gerador de parcelas distribui o resto em centavos nas primeiras parcelas, para a soma fechar exata
- Lembretes diários (`lib/domain/notifications.ts`) disparam em D-7, D-3, D-1, no dia e no dia seguinte

## 5. Fluxos principais

1. **Primeiro uso**: `/cadastro` (casal, data, meta) → conta + casamento + trial de 14 dias → checklist gerado → e-mail de boas-vindas → dashboard.
2. **Convidar o par**: Ajustes → Acessos → e-mail → a pessoa recebe o link, escolhe a própria senha em `/convite` e entra.
3. **Contratar fornecedor**: criar em `pesquisando` → `negociando` → fechar com valor e forma de pagamento → gerar entrada + parcelas → status vira `fechado`.
4. **Pagar parcela**: marcar como pago (data real) → totais e status do fornecedor se atualizam.
5. **Não esquecer vencimento**: o cron diário manda o resumo por e-mail; o casal controla isso em Ajustes → Notificações.

## 6. Cortes de escopo conscientes

- RSVP é registrado pelo casal — não existe link público para o convidado responder.
- Cobrança é manual: o superadmin estende `subscriptionActiveUntil` após o pagamento; não há checkout no app.
- Calendário é somente leitura (sem arrastar/soltar) e o quadro não tem drag-and-drop.
- Sem mapa de mesas, sem importação em massa de convidados, sem PWA instalável.
