# Design

Visual system for the wedding cockpit. Register: product. Light-first, warm, premium, functional.

## Theme

"Campo realista de casamento": the **entire app opens over a cinematic outdoor wedding scene**. A realistic green field, blue sky and wooden pergola live as a fixed ambient backdrop behind every screen (`public/wedding-field-hero.png`). Content sits on translucent glass/paper cards with warm blur, soft shadows and high contrast for money and dates. The dashboard hero uses the full photographic scene; operational screens keep the same image in the background while cards remain readable and functional.

Espresso ink, deep sage-olive brand and champagne gold remain the core wedding palette. Finance gets one intentional exception: a dark plum card inspired by premium credit-card statements, used only for the budget forecast chart. Airy spacing, soft large radii, no cold grays, and no visual clutter over the photo.

## Colors

Tokens live in `app/globals.css` (shadcn variables, OKLCH). Reference roles:

| Role | Use |
|---|---|
| `background` | fallback page background behind the photo |
| `card` | translucent glass/paper cards |
| `foreground` | primary text (espresso) |
| `muted` | subtle fills (linen/sage) |
| `muted-foreground` | secondary text |
| `primary` | brand olive: buttons, active nav, links |
| `primary-foreground` | text on primary |
| `accent` | champagne highlights |
| `gold` | celebratory numbers, progress accents |
| `destructive` | overdue, destructive actions |
| `success` | paid / done |
| `warning` | due soon |
| `border` | glass hairlines |
| `ring` | focus rings |

Dark mode is not a launch goal; tokens exist but light is canonical.

## Typography

- **Display / headings**: Fraunces (next/font/google, `--font-display`), weights 500-600, used for screen titles, vendor names, the countdown number and big money figures.
- **Body / UI**: Geist Sans (`--font-geist-sans`) for everything else, weights 400-600.
- **Numbers**: always `tabular-nums` for money, dates and counts; money uses `R$ 12.345,67` pt-BR formatting.
- Scale (mobile-first): screen title 24/32 (display), section title 17/24 semibold, body 15/22, caption 13/18, big KPI 30-36 (display).

## Components

- shadcn/ui (Base UI) as the component base; customized via tokens, never inline hex except for the isolated dark finance gradient.
- **Cards**: large radii, glass blur, warm hairline ring and elevated shadows. Numbers must stay readable over the photo.
- **Hero card**: photo-led, with dark translucent chips for countdown/couple/date.
- **Budget forecast card**: dark premium "credit-card statement" surface with total budget, paid/closed progress and animated monthly bars for upcoming installments.
- **Status badges**: soft tinted background + dot/icon + label (e.g. "Fechado", "Pago", "Atrasado"); never color alone.
- **Progress**: rounded bars; budget bar uses olive-to-gold gradient when healthy, terracotta when over budget.
- **Forms**: stacked labels, 44px+ inputs, currency inputs with `R$` prefix and centavo masking; one form = one job.
- **Empty states**: warm copy + a single clear CTA ("Cadastre seu primeiro fornecedor").

## Layout

- Mobile (default): single column, 16px gutters, bottom tab bar with 5 destinations (Início, Fornecedores, Financeiro, Checklist, Ajustes), content bottom-padded to clear it.
- >=768px: bottom bar becomes a left glass sidebar (icon + label), content max-width 1024px centered.
- Dashboard: hero + budget/forecast on the left, actions/tasks on the right, category summary below.
- Financeiro: budget overview + premium forecast chart first, category/payment detail below.
- Lists are card-based on mobile; dense tables are avoided unless they clearly improve scanning.

## Motion

Purposeful and cinematic: screens enter with a short lift/fade, cards have gentle hover elevation, the dashboard hero floats subtly, and finance bars rise in a staggered sequence. Keep motion under control so the app still feels like a planning cockpit, not a marketing page. A single celebratory moment is allowed when a payment is marked paid or a task completed (toast). Respect `prefers-reduced-motion`.
