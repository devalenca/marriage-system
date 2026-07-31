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

## E-mail (Resend)

- `convex/lib/email.ts` posts to the Resend HTTP API — no SDK. Without `RESEND_API_KEY` every send is a logged no-op, so local dev and tests never need a key (reset codes are printed to the backend log instead).
- Env vars on the **Convex** deployment (not Vercel): `RESEND_API_KEY`, `EMAIL_FROM` (verified sender, e.g. `Nosso Casamento <contato@dominio.com.br>`; falls back to Resend's test sender, which only delivers to the account owner).
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
