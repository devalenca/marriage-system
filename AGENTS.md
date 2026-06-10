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

## Constraints

- **No auth layer yet**: the app is single-user on a local anonymous Convex backend. Authentication and authorization MUST be added before this app is deployed or exposed beyond localhost.
- **Before deploying (e.g. Vercel)**: provision a Convex cloud deployment and add authentication; file uploads already use Convex storage, which works in production.

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
