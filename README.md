# Nosso Casamento 💍

Cockpit privado de planejamento de casamento para o casal — fornecedores, orçamento, pagamentos e parcelas, checklist mês a mês e contagem regressiva até o grande dia.

Interface em português (pt-BR), valores em Real (R$), datas `dd/MM/aaaa`, fuso `America/Sao_Paulo`. Mobile-first.

## Funcionalidades

- **Dashboard** — contagem regressiva, barra de orçamento (meta, previsto, fechado, pago, pendente, saldo), próximos vencimentos, atrasados e tarefas do mês.
- **Fornecedores** — cadastro por categoria e status, página do fornecedor com contato, contrato e **anexos** (upload de arquivos), cronograma de **entrada + parcelas**.
- **Financeiro** — visão por categoria e por **forma de pagamento**, gráfico de previsão por mês, histórico de pagamentos com **comprovantes**, parcelamentos por fornecedor e **exportação em CSV**.
- **Checklist** — cronograma gerado a partir da data do casamento (editável), em lista e calendário, com prazo, prioridade e responsável.

## Stack

Next.js (App Router) · TypeScript · Convex · Tailwind v4 · shadcn/ui · Biome · Vitest.

## Rodando localmente

Pré-requisitos: Node.js 20+ e npm.

```bash
npm install
npm run dev
```

`npm run dev` sobe o Next.js e um backend Convex local anônimo em paralelo — sem precisar de contas ou chaves. Acesse http://localhost:3000.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Next.js + Convex local |
| `npm run lint` / `npm run format` | Biome |
| `npm run typecheck` / `npm run typecheck:convex` | TypeScript |
| `npm test` | Vitest |

## Notas

- Os dados ficam no backend Convex local desta máquina — nada é enviado para a internet em desenvolvimento.
- **Antes de publicar/deploy** (ex.: Vercel): é preciso provisionar um deployment Convex na nuvem e adicionar autenticação. O upload de arquivos já usa o storage do Convex, que funciona em produção.
