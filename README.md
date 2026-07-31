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

Next.js (App Router) · TypeScript · Convex · Tailwind v4 · shadcn/ui · Biome · Vitest · e-mail por SMTP ou Resend.

## Rodando localmente

Pré-requisitos: Node.js 20+ e npm.

```bash
npm install
npm run dev
```

`npm run dev` sobe o Next.js e um backend Convex local anônimo em paralelo — sem precisar de contas ou chaves. Acesse http://localhost:3000.

Sem e-mail configurado, os envios viram no-ops e o código de verificação aparece no log do backend — os fluxos continuam testáveis de ponta a ponta.

### Enviando de verdade pela sua caixa do Gmail

O Convex não consegue abrir uma conexão SMTP (o runtime dele só fala HTTP), então quem conversa com o Gmail é a rota `/api/email` do próprio app, que roda em Node. O Convex entrega a mensagem para ela usando um segredo compartilhado. Por isso as variáveis ficam **dos dois lados**:

1. No Gmail, crie uma **senha de app** (Conta Google → Segurança → Verificação em duas etapas → Senhas de app). A senha da conta não funciona.
2. No app (`.env.local` local, ou as Environment Variables da Vercel em produção): `EMAIL_RELAY_SECRET` (qualquer valor aleatório e longo), `SMTP_USER`, `SMTP_PASSWORD` e, se quiser, `EMAIL_FROM`. O `.env.local` já vem com essas linhas comentadas.
3. No deployment Convex, o mesmo segredo e a URL pública do app:

```bash
npx convex env set EMAIL_RELAY_SECRET "o-mesmo-valor-do-app"
npx convex env set SITE_URL "https://seu-app.vercel.app"
```

Depois entre no app e use **Configurações → Notificações por e-mail → Enviar teste**: ele manda um e-mail para o seu próprio endereço e, se algo estiver errado, mostra a resposta exata do Gmail. Em produção é o mesmo caminho, com `npx convex env set --prod`.

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
