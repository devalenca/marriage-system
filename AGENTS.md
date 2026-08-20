<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# marriage-system

A private wedding-planning cockpit for the couple: vendors, budget, payments/installments, timeline checklist and progress tracking up to the wedding day.

- **Owner**: Gabriel
- **Scope**: personal, single-user project.
- **Language**: UI copy in Brazilian Portuguese (pt-BR); source code, identifiers, comments and tests in English.
- **Locale rules**: currency BRL (`R$`), dates `dd/MM/yyyy`, timezone `America/Sao_Paulo`.

## Stack

Next.js (App Router) + TypeScript (strict) + Convex (anonymous local backend) + Tailwind v4 + shadcn/ui + Biome + Vitest.

## Auth

- **Convex Auth (password)**: every Convex function rejects anonymous callers via `authedQuery`/`authedMutation` from `convex/lib/auth.ts` — the only module allowed to touch `ctx.auth`. Auth is **client-side** (`ConvexAuthProvider`, tokens in the browser — no SSR cookies/middleware, which fought Next 16 in prod). Route gating is `components/auth-gate.tsx` wrapping the `(app)` layout; it is UX only, the real protection is server-side.
- **Public self-signup** at `/cadastro` (couple creates its own account + wedding + 14-day trial). Kill it with `AUTH_SIGNUP_DISABLED=true`; invited e-mails can still create their account. `convex/lib/userCreation.ts` is the single account-creation policy, enforced in the `createOrUpdateUser` callback.
- **Superadmin** = `AUTH_ADMIN_EMAIL` (comma/semicolon list). The first operator's account is seeded from `AUTH_ADMIN_EMAIL` + `AUTH_ADMIN_PASSWORD` the first time the login page loads with zero users. `users.bootstrapStatus`, `users.ensureAdminSeeded` and `access.invitationByToken`/`acceptInvitation` (token-gated) are the deliberately public functions.
- **Self-service credentials**: "esqueci minha senha" on the login page (8-digit code by e-mail, `convex/passwordReset.ts` wired into `Password({ reset })`) and Ajustes → Minha conta (change own password; change own e-mail with a code sent to the new address — blocked for the superadmin, whose e-mail is pinned by env). Members are invited by e-mail and pick their own password at `/convite`.
- **Persistent sessions**: cookie and session last up to 365 days (90-day inactivity window), refreshed automatically.
- **Deployment env vars**: `JWT_PRIVATE_KEY` + `JWKS` (generate with `node scripts/generate-auth-keys.mjs <outDir>`, then `npx convex env set -- NAME "$(cat file)"` — never let a shell eat the JSON quotes), `SITE_URL` (also the base for e-mailed links), `AUTH_ADMIN_EMAIL`, `AUTH_ADMIN_PASSWORD` (8+ chars; seeds the admin account).

## E-mail

`convex/lib/email.ts` owns templates and transport choice; whichever credentials the **Convex** deployment carries decides how a message leaves.

- **Relay** (`EMAIL_RELAY_SECRET`) — the current setup: a personal mailbox, which needs no domain and delivers to anyone. SMTP needs a TCP socket and Convex's runtime only speaks HTTP, so `sendEmail` POSTs the message to `${SITE_URL}/api/email` with the secret as a bearer token, and `app/api/email/route.ts` (Node runtime, nodemailer) does the SMTP. **Do not turn this into a `"use node"` Convex action**: the anonymous local backend refuses to deploy Node actions unless Node 18–24 is installed, which breaks `npm run dev` outright on a machine running a newer Node.
  - On the **web app** (`.env.local` / Vercel): `EMAIL_RELAY_SECRET`, `SMTP_USER`, `SMTP_PASSWORD`, optional `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT` (defaults `smtp.gmail.com`/`465`; 587 switches to STARTTLS). Gmail requires an **app password**, not the account password, and caps a free account at ~500 messages/day.
  - On **Convex**: the same `EMAIL_RELAY_SECRET` plus `SITE_URL` pointing at the app's public URL (which must not sit behind Vercel deployment protection, or the relay call gets an auth wall instead of the route).
- **Resend** (`RESEND_API_KEY`) — a direct HTTP call, no SDK. Wins over the relay when both are set: it is where this goes once the product has its own domain. Until then its test sender only delivers to the account owner.
- **Neither** — every send is a logged no-op, so local dev and tests need no setup at all (reset codes are printed to the backend log instead).
- `EMAIL_FROM` sets the sender; over SMTP it must be the authenticated mailbox or one of its aliases, so it defaults to `SMTP_USER`. `emailFrom()` is shared by both sides of the relay.
- Configurações → Notificações has **Enviar teste** (`notifications.sendTestEmail`), which mails the signed-in user and surfaces the mailbox's own error — the way to prove a deployment's setup, especially in production.
- Transactional sends: welcome (`convex/emails.ts`), invitation and password reset, plus the daily reminder digest. Feedback submissions alert the superadmin.
- **Daily cron** (`convex/crons.ts`, 11:30 UTC = 08:30 BRT) runs `notifications.runDailyReminders`: payment digests on D-7/D-3/D-1/D-0/D+1 and subscription-expiry warnings on D-7/D-3/D-1. Selection logic is pure in `lib/domain/notifications.ts`; per-user opt-outs live in `notificationPrefs`.

## Constraints

- **Before deploying (e.g. Vercel)**: provision a Convex cloud deployment, set the auth env vars above on it, migrate local data (`npx convex export` / `import`), and configure the Vercel build as `npx convex deploy --cmd 'npm run build'` with `CONVEX_DEPLOY_KEY` so `NEXT_PUBLIC_CONVEX_URL` is injected. File uploads already use Convex storage, which works in production.

## Commands

- `npm run dev` — Next.js + local Convex backend in parallel (no accounts/keys needed)
- `npm run lint` / `npm run format` — Biome
- `npm run typecheck` / `npm run typecheck:convex` — TypeScript gates
- `npm test` — Vitest (projects: `tests/convex/**` on edge-runtime, `tests/unit/**` on jsdom)

## Architecture

- Server-first App Router; `'use client'` only for interactive islands and Convex React hooks.
- Business logic and durable data live in Convex functions; pure domain calculations live in `lib/domain/` so they are unit-testable without a backend.
- Money is stored as **integer centavos** everywhere (`number`); formatting to `R$` happens only at the UI edge.
- Dates owned by the domain (due dates, wedding date) are stored as ISO `yyyy-MM-dd` strings interpreted in America/Sao_Paulo; timestamps use `Date.now()` epoch ms.
- **Theming**: the couple's accent is three raw CSS parts (`--theme-hue/-chroma/-l`) set by `[data-wedding-theme]` in `app/globals.css`; every other token and the ambient wash derive from them. Because custom properties substitute `var()` where they are *declared*, the derived block must match both `:root` and `[data-wedding-theme]` — otherwise a scoped preview keeps the root colour. Light/dark is a separate axis (`next-themes`, `.dark` class).
- **Text needs a surface, not a darker ink**: the page's floor is a photograph (`body::before`). Contrast against it is a lottery — on /checklist the same six month labels, same colour and size, measured from **1.92:1 to 15.3:1** purely by which part of the picture they landed on (WCAG AA wants 4.5:1). So any surface that carries text over that floor is opaque (`background-color` alpha ≥ 0.85 — cards, the page header, the nav rail, auth panels, banners); translucency is only allowed where an opaque surface already sits above the photo, e.g. a `bg-card/45` tile inside a `Card`. Keep the frosted character in `backdrop-filter`, the border and the shadow — not in letting the grass through.
