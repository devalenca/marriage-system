# Nosso Casamento 💍

Cockpit privado de planejamento de casamento para o casal — fornecedores, orçamento, pagamentos e parcelas, checklist mês a mês e contagem regressiva até o grande dia.

Interface em português (pt-BR), valores em Real (R$), datas `dd/MM/aaaa`, fuso `America/Sao_Paulo`. Mobile-first.

## Funcionalidades

- **Início** — contagem regressiva, resumo do orçamento (meta, previsto, fechado, pago, pendente, saldo), próximos vencimentos, atrasados, tarefas do mês, situação dos convidados e um versículo diário.
- **Fornecedores** — cadastro por categoria e status, página do fornecedor com contato, contrato e **anexos** (upload de arquivos), cronograma de **entrada + parcelas**.
- **Financeiro** — visão por categoria e por **forma de pagamento**, gráfico de previsão por mês, histórico de pagamentos com **comprovantes**, parcelamentos por fornecedor e **exportação em CSV**.
- **Checklist** — cronograma gerado a partir da data do casamento (editável), em lista, quadro e calendário, com prazo, prioridade e responsável.
- **Convidados** — convites e convidados, RSVP registrado pelo casal, **check-in no dia** (com busca), exportação em CSV e folha para impressão.
- **Inspirações e Anexos** — moodboards de referências e um índice único de todos os arquivos do casamento.
- **Ajustes** — dados do casamento, **tema do casal** (5 cores + claro/escuro), minha conta (trocar senha e e-mail), acessos por convite, notificações e canal de feedback.
- **E-mails transacionais** — boas-vindas, convite de acesso, redefinição de senha e lembretes diários de vencimento (cron às 8h30 BRT).

## Stack

Next.js (App Router) · TypeScript · Convex · Tailwind v4 · shadcn/ui · Biome · Vitest · Resend (e-mail).

## Rodando localmente

Pré-requisitos: Node.js 20+ e npm.

```bash
npm install
npm run dev
```

`npm run dev` sobe o Next.js e um backend Convex local anônimo em paralelo — sem precisar de contas ou chaves. Acesse http://localhost:3000.

Sem `RESEND_API_KEY` configurada, os envios de e-mail viram no-ops e o código de verificação aparece no log do backend — os fluxos continuam testáveis de ponta a ponta.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Next.js + Convex local |
| `npm run lint` / `npm run format` | Biome |
| `npm run typecheck` / `npm run typecheck:convex` | TypeScript |
| `npm test` | Vitest |

## Notas

- Os dados ficam no backend Convex local desta máquina — nada é enviado para a internet em desenvolvimento.
- **Antes de publicar/deploy** (ex.: Vercel): provisione um deployment Convex na nuvem e configure as variáveis de ambiente de autenticação e e-mail (veja `AGENTS.md`). O upload de arquivos já usa o storage do Convex, que funciona em produção.
