"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
	CalendarClock,
	Check,
	Clock3,
	ListChecks,
	Mail,
	Users,
	UserX,
} from "lucide-react";
import {
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { formatBRL } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * HERO_DEMO_VIDEO — the product reel, once it exists.
 *
 * 1. Drop `/public/demo/hero-demo.mp4` (H.264, 16:10, no audio, ≤ 8 MB) and
 *    optionally `/public/demo/hero-demo.webm` next to it.
 * 2. Poster (its first frame): `/public/demo/hero-demo-poster.jpg`.
 * 3. Point the constant at it: `"/demo/hero-demo.mp4"`.
 *
 * The frame then renders `<video autoPlay muted loop playsInline
 * preload="metadata" poster=…>` in place of the scenes and the tabs
 * disappear. The HTML scenes remain the fallback for
 * `prefers-reduced-motion` and for the video's `onError`. Nothing else
 * changes.
 */
const HERO_DEMO_VIDEO: string | null = null;
const HERO_DEMO_POSTER = "/demo/hero-demo-poster.jpg";

// Money is integer centavos everywhere (see AGENTS.md); formatting happens
// here at the UI edge. The figures are fictional but sized like a real
// Brazilian wedding — inherited from the old CockpitPreview so the marketing
// numbers stay consistent across the page.
const GOAL_CENTS = 9_600_000;
const PAID_CENTS = 4_480_000;
const CONTRACTED_CENTS = 7_840_000;
const REMAINING_CENTS = CONTRACTED_CENTS - PAID_CENTS;

const PAID_PERCENT = (PAID_CENTS / GOAL_CENTS) * 100;
const CONTRACTED_PERCENT = (REMAINING_CENTS / GOAL_CENTS) * 100;
const COMMITTED_PERCENT = Math.round((CONTRACTED_CENTS / GOAL_CENTS) * 100);

/** Pending installments per month, mirroring the real budget forecast strip. */
const FORECAST = [
	{ month: "ago", compact: "4,2k", height: 44 },
	{ month: "set", compact: "6,8k", height: 71 },
	{ month: "out", compact: "5,4k", height: 56 },
	{ month: "nov", compact: "7,6k", height: 79 },
	{ month: "dez", compact: "9,6k", height: 100 },
] as const;

// Checklist scene: one task checks itself off mid-scene, 34 → 35 of 52.
const TASKS_TOTAL = 52;
const TASKS_DONE_BEFORE = 34;
const TASKS_DONE_AFTER = 35;
const TASKS_BEFORE_PERCENT = (TASKS_DONE_BEFORE / TASKS_TOTAL) * 100;
const TASKS_AFTER_PERCENT = (TASKS_DONE_AFTER / TASKS_TOTAL) * 100;

// Guests scene: the confirmation counter counts up to its real value.
const GUESTS_TOTAL = 148;
const GUESTS_CONFIRMED = 96;
const GUEST_COUNT_FROM = 58;

const SCENE_SECONDS = 4.5;
const RING_RADIUS = 6.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const SCENES = [
	{ id: "painel", label: "Painel", caption: "O orçamento sob controle" },
	{
		id: "checklist",
		label: "Checklist",
		caption: "O sistema trabalha com vocês",
	},
	{
		id: "convidados",
		label: "Convidados",
		caption: "Confirmações em tempo real",
	},
] as const;

const SCENE_CLASS =
	"absolute inset-0 flex flex-col gap-3 p-4 sm:gap-3.5 sm:p-6";

/** Scenes 2 and 3 ship hidden inline so the no-JS page shows scene 1 only. */
const HIDDEN_SCENE_STYLE = {
	opacity: 0,
	visibility: "hidden",
} as const;

/**
 * The hero stage: a browser-framed, self-animating demo of the product that
 * stands in for the reel until the real video exists (contract above).
 *
 * - SSR / no-JS: scene 1 (the dashboard) renders complete and final — meters
 *   filled via inline styles — never an empty rectangle.
 * - Desktop, motion allowed: an infinite GSAP loop crossfades the three
 *   scenes (~4.5s each); the active tab draws a progress ring; clicking a tab
 *   seeks the loop, which then resumes on its own. The loop pauses while the
 *   frame is off-screen.
 * - Mobile (< 768px) and `prefers-reduced-motion`: no loop — scene 1 shows
 *   complete; tabs still swap scenes instantly (`gsap.set`, no motion).
 *
 * All animation lives here, on `data-demo-*` hooks. The landing timeline in
 * landing-motion.tsx only handles the frame's *entrance* via the
 * `data-hero-visual` wrapper that page.tsx puts around this component — no
 * `data-hero-*` attribute exists inside the frame.
 */
export function ProductDemo({ className }: { className?: string }) {
	const rootRef = useRef<HTMLDivElement>(null);
	const timelineRef = useRef<gsap.core.Timeline | null>(null);
	const [active, setActive] = useState(0);
	const [videoFailed, setVideoFailed] = useState(false);
	const prefersReducedMotion = usePrefersReducedMotion();

	const showVideo =
		HERO_DEMO_VIDEO !== null && !videoFailed && !prefersReducedMotion;

	useGSAP(
		() => {
			if (showVideo) return;
			const root = rootRef.current;
			if (!root) return;

			const mm = gsap.matchMedia();

			// Desktop with motion allowed: the scene loop. Everything else keeps
			// the static server markup (scene 1 complete) and tab-driven swaps.
			mm.add(
				"(prefers-reduced-motion: no-preference) and (min-width: 768px)",
				() => {
					const scenes = gsap.utils.toArray<HTMLElement>(
						"[data-demo-scene]",
						root,
					);
					const rings = gsap.utils.toArray<SVGCircleElement>(
						"[data-demo-ring]",
						root,
					);
					if (scenes.length === 0) return;

					const tl = gsap.timeline({
						repeat: -1,
						paused: true,
						defaults: { ease: "power2.out" },
					});

					scenes.forEach((scene, index) => {
						const at = index * SCENE_SECONDS;
						tl.addLabel(`scene-${index}`, at);
						// A hair after the label so the callback also fires when a tab
						// click seeks exactly to it.
						tl.call(() => setActive(index), undefined, at + 0.01);
						scenes.forEach((other, otherIndex) => {
							if (otherIndex !== index) {
								tl.to(
									other,
									{
										autoAlpha: 0,
										y: -10,
										duration: 0.35,
										ease: "power2.in",
										overwrite: "auto",
									},
									at,
								);
							}
						});
						tl.fromTo(
							scene,
							{ autoAlpha: 0, y: 14 },
							{ autoAlpha: 1, y: 0, duration: 0.55, overwrite: "auto" },
							at,
						);
						const ring = rings[index];
						if (ring) {
							tl.fromTo(
								ring,
								{ attr: { "stroke-dashoffset": RING_CIRCUMFERENCE } },
								{
									attr: { "stroke-dashoffset": 0 },
									duration: SCENE_SECONDS - 0.05,
									ease: "none",
								},
								at,
							);
						}
					});

					// Scene 1 — the meters grow after the panel settles.
					tl.fromTo(
						"[data-demo-bar]",
						{ scaleX: 0 },
						{
							scaleX: 1,
							transformOrigin: "left center",
							duration: 0.8,
							stagger: 0.12,
						},
						0.4,
					);
					tl.fromTo(
						"[data-demo-column]",
						{ scaleY: 0 },
						{
							scaleY: 1,
							transformOrigin: "center bottom",
							duration: 0.55,
							stagger: 0.07,
							ease: "back.out(1.5)",
						},
						0.6,
					);

					// Scene 2 — one task checks itself off mid-scene (34 → 35). The
					// plain `.to` tweens don't reset on repeat, so the sets at the
					// label restore the "before" state each cycle.
					const checklistAt = SCENE_SECONDS;
					tl.set("[data-demo-count-before]", { autoAlpha: 1 }, checklistAt);
					tl.set("[data-demo-count-after]", { autoAlpha: 0 }, checklistAt);
					tl.set("[data-demo-due]", { autoAlpha: 1 }, checklistAt);
					tl.fromTo(
						"[data-demo-check]",
						{ autoAlpha: 0, scale: 0.3 },
						{
							autoAlpha: 1,
							scale: 1,
							duration: 0.45,
							ease: "back.out(2.4)",
						},
						checklistAt + 1.2,
					);
					tl.fromTo(
						"[data-demo-strike]",
						{ scaleX: 0 },
						{
							scaleX: 1,
							transformOrigin: "left center",
							duration: 0.35,
							ease: "power2.inOut",
						},
						checklistAt + 1.35,
					);
					tl.to(
						"[data-demo-due]",
						{ autoAlpha: 0.35, duration: 0.3 },
						checklistAt + 1.35,
					);
					tl.to(
						"[data-demo-count-before]",
						{ autoAlpha: 0, duration: 0.25 },
						checklistAt + 1.4,
					);
					tl.to(
						"[data-demo-count-after]",
						{ autoAlpha: 1, duration: 0.25 },
						checklistAt + 1.5,
					);
					tl.fromTo(
						"[data-demo-task-bar]",
						{ width: `${TASKS_BEFORE_PERCENT}%` },
						{ width: `${TASKS_AFTER_PERCENT}%`, duration: 0.5 },
						checklistAt + 1.45,
					);

					// Scene 3 — confirmations count up in real time. `tabular-nums`
					// plus a reserved min-width on the span keep the layout still.
					const guestsAt = SCENE_SECONDS * 2;
					const countElement = root.querySelector("[data-demo-guest-count]");
					if (countElement) {
						const counter = { value: GUESTS_CONFIRMED };
						tl.fromTo(
							counter,
							{ value: GUEST_COUNT_FROM },
							{
								value: GUESTS_CONFIRMED,
								duration: 1.6,
								ease: "power1.out",
								onUpdate: () => {
									countElement.textContent = String(Math.round(counter.value));
								},
							},
							guestsAt + 0.4,
						);
					}
					tl.fromTo(
						"[data-demo-guest-bar]",
						{ scaleX: GUEST_COUNT_FROM / GUESTS_CONFIRMED },
						{
							scaleX: 1,
							transformOrigin: "left center",
							duration: 1.6,
							ease: "power1.out",
						},
						guestsAt + 0.4,
					);
					const tiles = root.querySelector("[data-demo-tiles]");
					if (tiles) {
						tl.fromTo(
							Array.from(tiles.children),
							{ autoAlpha: 0, y: 10 },
							{ autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1 },
							guestsAt + 0.35,
						);
					}

					// Don't loop while nobody can see it.
					const trigger = ScrollTrigger.create({
						trigger: root,
						start: "top bottom",
						end: "bottom top",
						onToggle: (self) => {
							if (self.isActive) {
								tl.play();
							} else {
								tl.pause();
							}
						},
					});
					if (trigger.isActive) tl.play();

					timelineRef.current = tl;
					return () => {
						timelineRef.current = null;
					};
				},
			);

			return () => mm.revert();
		},
		{ scope: rootRef, dependencies: [showVideo], revertOnUpdate: true },
	);

	/** Tab click/keyboard: seek the loop, or hard-swap when there is no loop. */
	const selectScene = (index: number) => {
		setActive(index);
		const tl = timelineRef.current;
		if (tl) {
			tl.play(`scene-${index}`);
			return;
		}
		const root = rootRef.current;
		if (!root) return;
		const scenes = root.querySelectorAll<HTMLElement>("[data-demo-scene]");
		scenes.forEach((scene, sceneIndex) => {
			gsap.set(scene, { autoAlpha: sceneIndex === index ? 1 : 0 });
		});
	};

	const onTablistKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
		event.preventDefault();
		const delta = event.key === "ArrowRight" ? 1 : -1;
		const next = (active + delta + SCENES.length) % SCENES.length;
		const scene = SCENES[next];
		if (!scene) return;
		selectScene(next);
		rootRef.current
			?.querySelector<HTMLButtonElement>(`#demo-tab-${scene.id}`)
			?.focus();
	};

	return (
		<div ref={rootRef} className={cn("w-full max-w-4xl", className)}>
			{/* The browser frame. Opaque by the legibility invariant: the field
			    photograph must not show through a surface that carries copy. */}
			<div
				data-demo-frame
				className="overflow-hidden rounded-2xl bg-card/95 shadow-[0_34px_90px_oklch(0_0_0_/_0.35)] ring-1 ring-border"
			>
				{/* Chrome bar — collapses below `sm`, where the frame reads as a
				    plain card. */}
				<div
					aria-hidden
					className="hidden items-center gap-2 border-b border-border/60 px-4 py-2.5 sm:flex"
				>
					<span className="size-2.5 rounded-full bg-foreground/15" />
					<span className="size-2.5 rounded-full bg-foreground/15" />
					<span className="size-2.5 rounded-full bg-foreground/15" />
					<span className="mx-auto rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
						app.nossocasamento.com.br
					</span>
					{/* Balances the traffic lights so the address pill sits centered. */}
					<span className="w-[3.75rem]" />
				</div>

				{/* Fixed aspect ratio reserves the stage's space up front (no CLS).
				    4/5 looked hollow on phones only because the forecast strip was
				    hidden there; with the strip back, the same box measures ~12px
				    of slack instead of ~90px of green void. */}
				<div className="relative aspect-[4/5] sm:aspect-[16/10]">
					{showVideo ? (
						<video
							className="absolute inset-0 size-full object-cover"
							src={HERO_DEMO_VIDEO ?? undefined}
							poster={HERO_DEMO_POSTER}
							autoPlay
							muted
							loop
							playsInline
							preload="metadata"
							aria-label="Demonstração do sistema em vídeo"
							onError={() => setVideoFailed(true)}
						/>
					) : (
						<>
							{/* Scene 1 — Painel. Renders final on the server: the meters
							    carry their resting sizes inline, so without JavaScript
							    (and under reduced motion) the dashboard is complete. */}
							<div
								data-demo-scene
								role="tabpanel"
								id="demo-panel-painel"
								aria-labelledby="demo-tab-painel"
								className={SCENE_CLASS}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
											Nosso Casamento
										</p>
										<p className="font-display text-base font-semibold text-primary sm:text-lg">
											Marina &amp; Rafael
										</p>
									</div>
									<span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent/70 px-3 py-1 text-xs font-medium text-accent-foreground ring-1 ring-border">
										<CalendarClock className="size-3.5" aria-hidden />
										<span className="tabular-nums">05/12/2026</span>
									</span>
								</div>

								<div className="flex items-center gap-3 rounded-2xl bg-accent/55 px-4 py-2.5 ring-1 ring-border">
									<p className="font-display text-3xl leading-none font-light tabular-nums text-primary sm:text-4xl">
										124
									</p>
									<p className="text-xs text-muted-foreground">
										dias para o grande dia
									</p>
									<p className="ml-auto hidden truncate text-[11px] text-muted-foreground sm:block">
										Fazenda Vista Verde
									</p>
								</div>

								<div className="finance-glow-card relative min-h-0 flex-1 overflow-hidden rounded-2xl p-4 text-white sm:p-5">
									<div className="flex items-baseline justify-between gap-2">
										<p className="text-xs font-medium tracking-wide text-white/70">
											Orçamento
										</p>
										<p className="text-[11px] font-semibold text-white/80 tabular-nums">
											{COMMITTED_PERCENT}% comprometido
										</p>
									</div>
									<p className="mt-1 font-display text-2xl font-semibold tabular-nums sm:text-3xl">
										{formatBRL(GOAL_CENTS)}
									</p>

									<div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/15">
										<div
											data-demo-bar
											className="bg-gold"
											style={{ width: `${PAID_PERCENT}%` }}
										/>
										<div
											data-demo-bar
											className="bg-white/45"
											style={{ width: `${CONTRACTED_PERCENT}%` }}
										/>
									</div>
									<div className="mt-2 flex items-center justify-between text-[11px] text-white/75">
										<span className="tabular-nums">
											Pago {formatBRL(PAID_CENTS)}
										</span>
										<span className="tabular-nums">
											Falta {formatBRL(REMAINING_CENTS)}
										</span>
									</div>

									{/* Payment forecast. It was dropped on narrow screens, but
									    hiding it is what hollowed the card out: flex-1 kept the
									    green surface at full height with nothing inside. The
									    strip is compact enough for 390px — five columns of
									    small type — so it stays. */}
									<div className="mt-4 flex items-end gap-2">
										{FORECAST.map((column, index) => (
											<div
												key={column.month}
												className="flex flex-1 flex-col items-center gap-1"
											>
												<span className="text-[10px] text-white/70 tabular-nums">
													{column.compact}
												</span>
												<div className="flex h-14 w-full items-end">
													<div
														data-demo-column
														className={cn(
															"w-full rounded-t-md bg-gradient-to-t",
															// The heaviest month gets the gold.
															index === FORECAST.length - 1
																? "from-gold/45 to-gold/80"
																: "from-white/20 to-white/55",
														)}
														style={{ height: `${column.height}%` }}
													/>
												</div>
												<span className="text-[10px] text-white/60">
													{column.month}
												</span>
											</div>
										))}
									</div>
								</div>

								<p className="mt-auto text-center text-[11px] text-muted-foreground sm:text-xs">
									{SCENES[0].caption}
								</p>
							</div>

							{/* Scene 2 — Checklist. Ships in the "before" state (34 of 52,
							    third task open); the loop checks the task off live. */}
							<div
								data-demo-scene
								role="tabpanel"
								id="demo-panel-checklist"
								aria-labelledby="demo-tab-checklist"
								className={SCENE_CLASS}
								style={HIDDEN_SCENE_STYLE}
							>
								<div className="flex items-center justify-between gap-2">
									<p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
										<ListChecks className="size-4" aria-hidden />
										Tarefas
									</p>
									<span className="relative text-xs font-semibold text-primary tabular-nums">
										<span data-demo-count-before>
											{TASKS_DONE_BEFORE} de {TASKS_TOTAL} concluídas
										</span>
										<span
											data-demo-count-after
											aria-hidden
											className="absolute inset-0"
											style={HIDDEN_SCENE_STYLE}
										>
											{TASKS_DONE_AFTER} de {TASKS_TOTAL} concluídas
										</span>
									</span>
								</div>
								<div className="h-1.5 overflow-hidden rounded-full bg-muted">
									<div
										data-demo-task-bar
										className="h-full rounded-full bg-gradient-to-r from-primary to-gold"
										style={{ width: `${TASKS_BEFORE_PERCENT}%` }}
									/>
								</div>
								<ul className="flex flex-col gap-2">
									<li className="flex items-center gap-2 rounded-xl bg-card/45 px-3 py-2 ring-1 ring-border/60">
										<DoneMark />
										<span className="truncate text-xs text-foreground/70 line-through">
											Prova do menu com o buffet
										</span>
									</li>
									<li className="flex items-center gap-2 rounded-xl bg-card/45 px-3 py-2 ring-1 ring-border/60">
										<DoneMark />
										<span className="truncate text-xs text-foreground/70 line-through">
											Fechar contrato da fotografia
										</span>
									</li>
									{/* The task the loop completes before the visitor's eyes. */}
									<li className="flex items-center gap-2 rounded-xl bg-card/45 px-3 py-2 ring-1 ring-border/60">
										<span aria-hidden className="relative size-4 shrink-0">
											<span className="absolute inset-0 rounded-full border border-warning/60" />
											<span
												data-demo-check
												className="absolute inset-0 flex items-center justify-center rounded-full bg-success/15 text-success"
												style={HIDDEN_SCENE_STYLE}
											>
												<Check className="size-3" />
											</span>
										</span>
										<span className="relative min-w-0 text-xs text-foreground">
											<span className="truncate">Escolher o bolo</span>
											<span
												data-demo-strike
												aria-hidden
												className="absolute top-1/2 left-0 h-px w-full bg-foreground/60"
												style={{
													transform: "scaleX(0)",
													transformOrigin: "left center",
												}}
											/>
										</span>
										<span
											data-demo-due
											className="ml-auto shrink-0 text-[11px] font-medium text-warning"
										>
											até 20/08
										</span>
									</li>
									<li className="flex items-center gap-2 rounded-xl bg-card/45 px-3 py-2 ring-1 ring-border/60">
										<span
											aria-hidden
											className="size-4 shrink-0 rounded-full border border-border"
										/>
										<span className="truncate text-xs text-foreground">
											Enviar convites aos padrinhos
										</span>
										<span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
											até 05/09
										</span>
									</li>
								</ul>
								<p className="mt-auto text-center text-[11px] text-muted-foreground sm:text-xs">
									{SCENES[1].caption}
								</p>
							</div>

							{/* Scene 3 — Convidados. The confirmation counter counts up;
							    the reserved width keeps the line from reflowing. */}
							<div
								data-demo-scene
								role="tabpanel"
								id="demo-panel-convidados"
								aria-labelledby="demo-tab-convidados"
								className={SCENE_CLASS}
								style={HIDDEN_SCENE_STYLE}
							>
								<p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
									<Users className="size-4" aria-hidden />
									Convidados
								</p>
								<div className="flex items-baseline gap-2">
									<p className="font-display text-4xl font-semibold tabular-nums text-foreground sm:text-5xl">
										<span
											data-demo-guest-count
											className="inline-block min-w-[3ch]"
										>
											{GUESTS_CONFIRMED}
										</span>
									</p>
									<p className="text-xs text-muted-foreground sm:text-sm">
										de {GUESTS_TOTAL} confirmados
									</p>
								</div>
								<div className="h-1.5 overflow-hidden rounded-full bg-muted">
									<div
										data-demo-guest-bar
										className="h-full rounded-full bg-gradient-to-r from-primary to-gold"
										style={{
											width: `${(GUESTS_CONFIRMED / GUESTS_TOTAL) * 100}%`,
										}}
									/>
								</div>
								<div data-demo-tiles className="grid gap-2 sm:grid-cols-3">
									<StatTile
										icon={<Mail className="size-3.5" aria-hidden />}
										label="Convites enviados"
										value={String(GUESTS_TOTAL)}
										caption="todos os grupos"
									/>
									<StatTile
										icon={<Clock3 className="size-3.5" aria-hidden />}
										label="Pendentes"
										value="38"
										caption="aguardando resposta"
									/>
									<StatTile
										icon={<UserX className="size-3.5" aria-hidden />}
										label="Recusados"
										value="14"
										caption="lista sempre em dia"
									/>
								</div>
								<p className="mt-auto text-center text-[11px] text-muted-foreground sm:text-xs">
									{SCENES[2].caption}
								</p>
							</div>
						</>
					)}
				</div>
			</div>

			{/* Scene tabs. Hidden once the real video exists. The pill is opaque
			    (legibility invariant: labels never sit straight on the photo). */}
			{!showVideo && (
				<div className="mt-4 flex justify-center sm:mt-5">
					<div
						role="tablist"
						aria-label="Cenas da demonstração"
						onKeyDown={onTablistKeyDown}
						className="flex items-center gap-1 rounded-full bg-card/95 p-1 shadow-lg ring-1 ring-border"
					>
						{SCENES.map((scene, index) => (
							<button
								key={scene.id}
								type="button"
								role="tab"
								id={`demo-tab-${scene.id}`}
								aria-selected={active === index}
								aria-controls={`demo-panel-${scene.id}`}
								tabIndex={active === index ? 0 : -1}
								onClick={() => selectScene(index)}
								className={cn(
									"group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
									active === index
										? "bg-accent text-accent-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{/* Progress ring: the loop drains the dashoffset over the
								    scene's 4.5s. Static modes show it complete. */}
								<svg
									viewBox="0 0 16 16"
									aria-hidden="true"
									className="size-3.5 -rotate-90 opacity-0 transition-opacity group-aria-selected:opacity-100"
								>
									<circle
										cx="8"
										cy="8"
										r={RING_RADIUS}
										fill="none"
										stroke="currentColor"
										strokeOpacity="0.25"
										strokeWidth="1.8"
									/>
									<circle
										data-demo-ring
										cx="8"
										cy="8"
										r={RING_RADIUS}
										fill="none"
										stroke="currentColor"
										strokeWidth="1.8"
										strokeLinecap="round"
										strokeDasharray={RING_CIRCUMFERENCE}
										strokeDashoffset="0"
									/>
								</svg>
								{scene.label}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

/** A completed checklist row's check bubble. */
function DoneMark() {
	return (
		<span
			aria-hidden
			className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
		>
			<Check className="size-3" />
		</span>
	);
}

/**
 * Wide stat tile (inherited from the old CockpitPreview): a compact row on
 * phones, a roomy column on the desktop three-up grid.
 */
function StatTile({
	icon,
	label,
	value,
	caption,
}: {
	icon: ReactNode;
	label: string;
	value: string;
	caption: string;
}) {
	return (
		<div className="flex items-center gap-2.5 rounded-2xl bg-card/45 px-3 py-2.5 ring-1 ring-border/60 sm:flex-col sm:items-start sm:gap-1 sm:p-3.5">
			<p className="flex min-w-0 items-center gap-1.5 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
				{icon}
				<span className="truncate">{label}</span>
			</p>
			<p className="ml-auto font-display text-lg font-semibold text-foreground tabular-nums sm:ml-0 sm:text-2xl">
				{value}
			</p>
			<p className="hidden text-[10px] leading-tight text-muted-foreground sm:block">
				{caption}
			</p>
		</div>
	);
}

/** Live `prefers-reduced-motion` — only consulted by the video branch. */
function usePrefersReducedMotion(): boolean {
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReduced(query.matches);
		const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
		query.addEventListener("change", onChange);
		return () => query.removeEventListener("change", onChange);
	}, []);
	return reduced;
}
