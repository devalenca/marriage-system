"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { PartyPopper } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OnboardingCard } from "@/components/dashboard/onboarding-card";
import {
	type PayTarget,
	QuickPayDialog,
} from "@/components/payments/quick-pay-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { monthGrid } from "@/lib/domain/calendar";
import { CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/domain/categories";
import { formatDateBR, todayInSaoPaulo } from "@/lib/domain/dates";
import { formatBRL } from "@/lib/domain/money";
import { notifyError } from "@/lib/notify";

type Summary = FunctionReturnType<typeof api.dashboard.summary>;
type PendingPayment = FunctionReturnType<
	typeof api.payments.listPending
>[number];

const HERO_IMAGE = "/wedding-field-hero.png";

const WEEKDAYS = [
	{ key: "dom", label: "D" },
	{ key: "seg", label: "S" },
	{ key: "ter", label: "T" },
	{ key: "qua", label: "Q" },
	{ key: "qui", label: "Q" },
	{ key: "sex", label: "S" },
	{ key: "sab", label: "S" },
] as const;

export function DashboardContent() {
	const today = useMemo(() => todayInSaoPaulo(), []);
	const summary = useQuery(api.dashboard.summary, { today });
	const pending = useQuery(api.payments.listPending, {});

	if (summary === undefined || pending === undefined)
		return <DashboardSkeleton />;
	if (!summary.settings) return <OnboardingCard />;

	return (
		<div className="animate-screen-enter flex flex-col gap-[18px]">
			<Hero summary={summary} />
			<FinanceStrip finance={summary.finance} />
			<InsightBanner
				finance={summary.finance}
				categories={summary.categories}
			/>

			<div className="grid items-start gap-[22px] lg:grid-cols-[1.5fr_1fr]">
				<div className="flex flex-col gap-[22px]">
					<NowCard overdue={summary.overdue} dueSoon={summary.dueSoon} />
					<BudgetCard
						finance={summary.finance}
						pending={pending}
						today={today}
					/>
				</div>
				<div className="flex flex-col gap-[22px]">
					<MonthTasksCard tasks={summary.monthTasks} />
					<MiniMonthCard
						today={today}
						tasks={summary.monthTasks}
						pending={pending}
						overdue={summary.overdue}
					/>
				</div>
			</div>

			<CategoriesCard categories={summary.categories} />
		</div>
	);
}

/* ------------------------------- Hero ---------------------------------- */

function Hero({ summary }: { summary: Summary }) {
	const { settings, countdownDays } = summary;
	const shown = useCountUp(
		countdownDays && countdownDays > 0 ? countdownDays : 0,
	);
	if (!settings || countdownDays === null) return null;

	return (
		<div className="animate-fadeup relative h-[340px] overflow-hidden rounded-[26px] shadow-[0_18px_50px_-20px_rgba(46,52,40,.5)] sm:h-[392px]">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={HERO_IMAGE}
				alt="Campo ao entardecer com arco de casamento"
				className="absolute inset-0 size-full object-cover [object-position:center_42%]"
			/>
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_58%_68%_at_50%_52%,rgba(26,34,26,.44)_0%,rgba(26,34,26,.14)_54%,transparent_78%),linear-gradient(180deg,rgba(38,48,38,.34)_0%,rgba(38,48,38,.04)_28%,rgba(38,48,38,0)_58%,rgba(38,48,38,.4)_100%)]" />

			{/* names */}
			<div className="absolute top-6 left-1/2 -translate-x-1/2 rounded-full border border-white/40 bg-[rgba(252,250,245,.2)] px-6 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,.4)] backdrop-blur-md">
				<span className="font-display text-lg font-semibold tracking-[0.02em] text-white [text-shadow:0_1px_6px_rgba(30,40,30,.4)] sm:text-xl">
					{settings.coupleNames}
				</span>
			</div>

			{/* countdown glass — flex-centered so it never collides with the pills */}
			<div className="absolute inset-0 flex items-center justify-center">
				<div className="hero-float rounded-[26px] border border-white/40 bg-[rgba(250,248,242,.17)] px-12 py-6 text-center shadow-[0_10px_44px_-12px_rgba(30,40,30,.45),inset_0_1px_0_rgba(255,255,255,.45)] backdrop-blur-[16px] backdrop-saturate-[1.1] sm:px-14 sm:py-7">
					{countdownDays > 0 ? (
						<>
							<div className="text-xs font-bold tracking-[0.24em] text-[#f4e8cf] uppercase [text-shadow:0_1px_4px_rgba(30,40,30,.5)]">
								Faltam
							</div>
							<div className="mt-1 font-display text-[80px] leading-[0.86] font-semibold tracking-[-0.01em] text-white [text-shadow:0_2px_22px_rgba(30,40,30,.45)] sm:text-[108px]">
								{shown}
							</div>
							<div className="mt-1.5 font-display text-lg font-medium text-white/95 italic [text-shadow:0_1px_6px_rgba(30,40,30,.45)] sm:text-[22px]">
								{countdownDays === 1
									? "dia para o grande dia"
									: "dias para o grande dia"}
							</div>
						</>
					) : (
						<div className="flex items-center gap-2 font-display text-2xl font-semibold text-white [text-shadow:0_2px_18px_rgba(30,40,30,.45)] sm:text-3xl">
							<PartyPopper className="size-7 text-[#f4e8cf]" aria-hidden />
							{countdownDays === 0 ? "É hoje!" : "Felizes para sempre!"}
						</div>
					)}
				</div>
			</div>

			{/* date */}
			<div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-[rgba(38,48,38,.34)] px-5 py-2 backdrop-blur-sm">
				<span className="text-sm font-semibold tracking-[0.04em] text-white">
					{formatDateBR(settings.weddingDate)}
				</span>
			</div>
		</div>
	);
}

/** Counts up to `target` once on mount for a touch of delight (respects reduced motion). */
function useCountUp(target: number): number {
	const [value, setValue] = useState(target);
	useEffect(() => {
		if (typeof window === "undefined") return;
		// Treat a missing matchMedia/rAF (SSR-ish or test env) as reduced motion:
		// snap straight to the target rather than animating.
		const reduce =
			window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true;
		if (reduce || target <= 0 || typeof requestAnimationFrame === "undefined") {
			setValue(target);
			return;
		}
		let frame = 0;
		const duration = 900;
		const start = performance.now();
		const tick = (now: number) => {
			const t = Math.min((now - start) / duration, 1);
			const eased = 1 - (1 - t) ** 3;
			setValue(Math.round(eased * target));
			if (t < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [target]);
	return value;
}

/* --------------------------- Finance strip ----------------------------- */

function FinanceStrip({ finance }: { finance: Summary["finance"] }) {
	// "Comprometido" = previsto (contratado + estimativas) vs. a meta — a leitura
	// honesta de quanto o casamento deve custar no total.
	const committedPercent =
		finance.goalCents > 0
			? Math.round((finance.plannedCents / finance.goalCents) * 100)
			: 0;
	const cells = [
		{
			key: "meta",
			label: "META",
			shortLabel: "META",
			full: formatBRLWhole(finance.goalCents),
			compact: compactReais(finance.goalCents),
			tone: "text-foreground",
		},
		{
			key: "comprometido",
			label: `COMPROMETIDO · ${committedPercent}%`,
			shortLabel: `COMPROM. · ${committedPercent}%`,
			full: formatBRLWhole(finance.plannedCents),
			compact: compactReais(finance.plannedCents),
			tone: "text-[#3c5741]",
		},
		{
			key: "pago",
			label: "PAGO",
			shortLabel: "PAGO",
			full: formatBRLWhole(finance.paidCents),
			compact: compactReais(finance.paidCents),
			tone: "text-[#b8924f]",
		},
	];
	return (
		<div className="grid grid-cols-3 gap-2.5 sm:gap-4">
			{cells.map((cell) => (
				<div
					key={cell.key}
					className="rounded-[18px] border border-border bg-card px-3 py-3.5 text-center sm:px-[22px] sm:py-[18px] sm:text-left"
				>
					<div className="truncate text-[9px] font-bold tracking-[0.04em] text-muted-foreground uppercase sm:text-[11px] sm:tracking-[0.06em]">
						<span className="sm:hidden">{cell.shortLabel}</span>
						<span className="hidden sm:inline">{cell.label}</span>
					</div>
					<div
						className={`mt-0.5 font-display font-semibold tabular-nums ${cell.tone}`}
					>
						<span className="text-[19px] sm:hidden">{cell.compact}</span>
						<span className="hidden text-3xl sm:inline">{cell.full}</span>
					</div>
				</div>
			))}
		</div>
	);
}

/* --------------------------- Insight banner ---------------------------- */

function InsightBanner({
	finance,
	categories,
}: {
	finance: Summary["finance"];
	categories: Summary["categories"];
}) {
	// Folga = quanto ainda cabe na meta depois do previsto (contratado + estimado).
	const slack = finance.goalCents - finance.plannedCents;
	const open = categories
		.filter((row) => row.contractedCents === 0 && row.plannedCents > 0)
		.map((row) => CATEGORY_LABELS[row.category]);
	const onTrack = slack >= 0;

	return (
		<div
			className={`flex items-center gap-3 rounded-[14px] border px-[18px] py-3 ${
				onTrack
					? "border-[#d4e1cf] bg-[#eef3ec]"
					: "border-[#f0d6cf] bg-[#fbeeeb]"
			}`}
		>
			<span
				className={`size-[9px] shrink-0 rounded-full ${onTrack ? "bg-[#4b6b4f]" : "bg-destructive"}`}
			/>
			<div className="text-[13.5px] leading-snug text-[#3c5741]">
				{onTrack ? (
					<>
						<b>No ritmo atual você fecha dentro da meta</b> — folga de{" "}
						{formatBRL(slack)}.
					</>
				) : (
					<>
						<b className="text-destructive">
							Atenção: o fechado já passou da meta
						</b>{" "}
						em {formatBRL(-slack)}.
					</>
				)}
				{open.length > 0 && (
					<span className="text-[#9a7a3e]">
						{" "}
						Falta fechar {open.slice(0, 3).join(", ")}
						{open.length > 3 ? " e outros" : ""}.
					</span>
				)}
			</div>
		</div>
	);
}

/* ----------------------------- Now card -------------------------------- */

function NowCard({
	overdue,
	dueSoon,
}: {
	overdue: Summary["overdue"];
	dueSoon: Summary["dueSoon"];
}) {
	const hasNothing = overdue.length === 0 && dueSoon.length === 0;
	const [payTarget, setPayTarget] = useState<PayTarget | null>(null);

	return (
		<section className="animate-fadeup rounded-[22px] border border-border bg-card px-[26px] py-6 [animation-delay:.05s]">
			<h2 className="font-display text-[22px] font-semibold text-foreground">
				O que fazer agora
			</h2>

			{hasNothing && (
				<p className="mt-3 text-sm text-muted-foreground">
					Nenhuma cobrança pendente por aqui. Respira — está tudo em dia. 🌿
				</p>
			)}

			{overdue.length > 0 && (
				<>
					<SectionTag
						color="#b5523f"
						label="Atrasado"
						className="mt-3.5 mb-2"
					/>
					<div className="flex flex-col gap-2">
						{overdue.map((p) => (
							<PayRow key={p._id} payment={p} onPay={setPayTarget} overdue />
						))}
					</div>
				</>
			)}

			{dueSoon.length > 0 && (
				<>
					<div className="mt-[18px] mb-2 text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
						Próximos vencimentos
					</div>
					<div className="flex flex-col gap-2">
						{dueSoon.map((p) => (
							<PayRow key={p._id} payment={p} onPay={setPayTarget} />
						))}
					</div>
				</>
			)}

			<QuickPayDialog
				target={payTarget}
				onOpenChange={(o) => {
					if (!o) setPayTarget(null);
				}}
			/>
		</section>
	);
}

function SectionTag({
	color,
	label,
	className = "",
}: {
	color: string;
	label: string;
	className?: string;
}) {
	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<span
				className="size-2 rounded-full"
				style={{ backgroundColor: color }}
			/>
			<span
				className="text-xs font-extrabold tracking-[0.06em] uppercase"
				style={{ color }}
			>
				{label}
			</span>
		</div>
	);
}

function PayRow({
	payment,
	onPay,
	overdue = false,
}: {
	payment: Summary["overdue"][number];
	onPay: (target: PayTarget) => void;
	overdue?: boolean;
}) {
	function handlePay() {
		onPay({
			_id: payment._id,
			amountCents: payment.amountCents,
			description: payment.description,
			vendorName: payment.vendorName,
		});
	}

	return (
		<div
			className={`flex items-center justify-between gap-3 rounded-[14px] border px-4 py-3 ${
				overdue ? "border-[#f0d6cf] bg-[#fbeeeb]" : "border-border"
			}`}
		>
			<div className="min-w-0">
				<div className="truncate text-[15px] font-semibold text-foreground">
					{payment.vendorName}
				</div>
				<div
					className={`mt-0.5 text-[12.5px] ${overdue ? "text-[#a0584a]" : "text-muted-foreground"}`}
				>
					{payment.description}
					{overdue ? " · venceu " : " · "}
					{formatDateBR(payment.dueDate)}
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-3">
				<div className="text-[15px] font-bold tabular-nums text-foreground">
					{formatBRL(payment.amountCents)}
				</div>
				<button
					type="button"
					onClick={handlePay}
					className={`cursor-pointer rounded-full px-[18px] py-2 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
						overdue
							? "bg-destructive text-white hover:brightness-95"
							: "border border-[#cdbfa8] text-[#3c5741] hover:bg-secondary"
					}`}
				>
					Pagar
				</button>
			</div>
		</div>
	);
}

/* ---------------------------- Budget card ------------------------------ */

function BudgetCard({
	finance,
	pending,
	today,
}: {
	finance: Summary["finance"];
	pending: PendingPayment[];
	today: string;
}) {
	const goal = Math.max(finance.goalCents, 1);
	const paidPct = Math.min((finance.paidCents / goal) * 100, 100);
	const contractedRemaining = Math.max(
		finance.contractedCents - finance.paidCents,
		0,
	);
	const contractedPct = Math.min(
		(contractedRemaining / goal) * 100,
		100 - paidPct,
	);
	const committedPercent = Math.round((finance.contractedCents / goal) * 100);
	const forecast = useMemo(
		() => buildForecast(pending, today, 6),
		[pending, today],
	);
	const maxMonth = Math.max(...forecast.map((m) => m.amountCents), 1);

	return (
		<section className="animate-fadeup rounded-[22px] border border-border bg-card px-[26px] py-6 [animation-delay:.1s]">
			<div className="flex items-baseline justify-between">
				<h2 className="font-display text-[22px] font-semibold text-foreground">
					Orçamento
				</h2>
				<div className="text-[13px] font-bold text-[#9a7a3e]">
					{committedPercent}% comprometido
				</div>
			</div>

			<div className="mt-4 mb-2 flex h-3.5 overflow-hidden rounded-full bg-[#eee4d4]">
				<div
					className="grow-x bg-[#b8924f] [animation-delay:.2s]"
					style={{ width: `${paidPct}%` }}
				/>
				<div
					className="grow-x bg-[#7a9078] [animation-delay:.35s]"
					style={{ width: `${contractedPct}%` }}
				/>
			</div>
			<div className="flex flex-wrap gap-x-[18px] gap-y-1 text-xs text-muted-foreground">
				<LegendDot
					color="#b8924f"
					label={`Pago ${formatBRL(finance.paidCents)}`}
				/>
				<LegendDot
					color="#7a9078"
					label={`A pagar ${formatBRL(contractedRemaining)}`}
				/>
				<span className="ml-auto font-bold text-[#3c5741]">
					Saldo livre {formatBRL(finance.remainingCents)}
				</span>
			</div>

			<div className="mt-5 border-t border-[#eee4d4] pt-[18px]">
				<div className="mb-3.5 text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
					Previsão dos próximos meses
				</div>
				<div
					className="flex h-24 items-end gap-3.5"
					role="img"
					aria-label="Previsão de pagamentos por mês"
				>
					{forecast.map((month) => {
						const heightPct =
							month.amountCents > 0
								? Math.max(Math.round((month.amountCents / maxMonth) * 100), 8)
								: 4;
						return (
							<div
								key={month.month}
								title={`${month.label}: ${formatBRL(month.amountCents)}`}
								className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
							>
								<div
									className={`text-[10.5px] font-semibold tabular-nums ${month.amountCents > 0 ? "text-muted-foreground" : "text-[#cdbfa8]"}`}
								>
									{month.amountCents > 0 ? compactBRL(month.amountCents) : "—"}
								</div>
								<div
									className={`grow-y w-full max-w-[38px] rounded-t-lg ${month.amountCents > 0 ? "bg-[#8aa07f]" : "bg-[#e0d6c4]"}`}
									style={{ height: `${heightPct}%` }}
								/>
								<div className="text-[11px] text-muted-foreground">
									{month.shortLabel}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}

function LegendDot({ color, label }: { color: string; label: string }) {
	return (
		<span className="flex items-center gap-1.5">
			<span
				className="size-[9px] rounded-[3px]"
				style={{ backgroundColor: color }}
			/>
			{label}
		</span>
	);
}

/* ---------------------------- Tasks card ------------------------------- */

function MonthTasksCard({ tasks }: { tasks: Summary["monthTasks"] }) {
	const updateTask = useMutation(api.tasks.update);

	async function complete(id: Id<"tasks">) {
		try {
			await updateTask({ id, status: "concluida" });
			toast.success("Tarefa concluída");
		} catch (error) {
			notifyError(error, "Não foi possível concluir");
		}
	}

	return (
		<section className="animate-fadeup rounded-[22px] border border-border bg-card px-[26px] py-6 [animation-delay:.15s]">
			<div className="mb-1.5 flex items-baseline justify-between">
				<h2 className="font-display text-[22px] font-semibold text-foreground">
					Tarefas do mês
				</h2>
				<Link
					href="/checklist"
					className="text-[12.5px] font-semibold text-[#9a7a3e] hover:underline"
				>
					{tasks.length} pendentes · Ver tudo →
				</Link>
			</div>

			{tasks.length === 0 ? (
				<p className="py-2 text-sm text-muted-foreground">
					Nenhuma tarefa pendente neste mês. Respira, está tudo em dia.
				</p>
			) : (
				<ul>
					{tasks.map((task, index) => (
						<li key={task._id}>
							<TaskRow
								task={task}
								last={index === tasks.length - 1}
								onComplete={() => complete(task._id)}
							/>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

const PRIORITY_PILL: Record<Doc<"tasks">["priority"], string> = {
	alta: "text-destructive bg-[#f7e9e6]",
	media: "text-[#9a7a3e] bg-[#f4ecd9]",
	baixa: "text-[#4b6b4f] bg-[#eef3ec]",
};

function TaskRow({
	task,
	last,
	onComplete,
}: {
	task: Summary["monthTasks"][number];
	last: boolean;
	onComplete: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onComplete}
			className={`flex w-full items-center gap-3 py-3 text-left ${last ? "" : "border-b border-[#f0e8d9]"}`}
		>
			<span className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 border-[#cdbfa8] text-transparent transition-colors hover:border-[#4b6b4f] hover:text-[#4b6b4f]">
				✓
			</span>
			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-medium text-foreground">
					{task.title}
				</div>
				{(task.dueDate || task.assignee) && (
					<div className="text-xs text-muted-foreground">
						{task.dueDate ? `até ${formatDateBR(task.dueDate)}` : ""}
						{task.dueDate && task.assignee ? " · " : ""}
						{task.assignee ?? ""}
					</div>
				)}
			</div>
			<span
				className={`shrink-0 rounded-full px-[9px] py-[3px] text-[11px] font-bold ${PRIORITY_PILL[task.priority]}`}
			>
				{PRIORITY_LABELS[task.priority]}
			</span>
		</button>
	);
}

/* --------------------------- Mini month -------------------------------- */

type DayKinds = { task: boolean; invoice: boolean; overdue: boolean };

function MiniMonthCard({
	today,
	tasks,
	pending,
	overdue,
}: {
	today: string;
	tasks: Summary["monthTasks"];
	pending: PendingPayment[];
	overdue: Summary["overdue"];
}) {
	const month = today.slice(0, 7);
	const grid = useMemo(() => monthGrid(month), [month]);
	const byDay = useMemo(() => {
		const map = new Map<string, DayKinds>();
		const ensure = (d: string) =>
			map.get(d) ?? { task: false, invoice: false, overdue: false };
		for (const t of tasks) {
			if (t.dueDate) map.set(t.dueDate, { ...ensure(t.dueDate), task: true });
		}
		for (const p of pending) {
			map.set(p.dueDate, { ...ensure(p.dueDate), invoice: true });
		}
		for (const o of overdue) {
			map.set(o.dueDate, { ...ensure(o.dueDate), overdue: true });
		}
		return map;
	}, [tasks, pending, overdue]);

	return (
		<section className="animate-fadeup rounded-[22px] border border-border bg-card px-[22px] py-5 [animation-delay:.18s]">
			<div className="mb-3 flex items-baseline justify-between">
				<h2 className="font-display text-xl font-semibold text-foreground capitalize">
					{monthTitle(month)}
				</h2>
				<Link
					href="/checklist"
					className="text-xs font-semibold text-[#9a7a3e] hover:underline"
				>
					Abrir checklist →
				</Link>
			</div>
			<div className="mb-1 grid grid-cols-7 gap-[3px]">
				{WEEKDAYS.map((w) => (
					<div
						key={w.key}
						className="text-center text-[9.5px] font-bold text-[#b0a594]"
					>
						{w.label}
					</div>
				))}
			</div>
			<div className="grid grid-cols-7 gap-[3px]">
				{grid.map((cell) => {
					const kinds = byDay.get(cell.date);
					const isToday = cell.date === today;
					return (
						<div
							key={cell.date}
							className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg ${
								cell.inMonth ? "" : "opacity-35"
							} ${isToday ? "bg-[#4b6b4f] text-white" : "text-foreground"}`}
						>
							<span className="text-[11px] font-medium tabular-nums">
								{Number(cell.date.slice(8, 10))}
							</span>
							<div className="flex min-h-[5px] justify-center gap-[2px]">
								{kinds?.overdue && <Dot color="#b5523f" on={isToday} />}
								{kinds?.invoice && !kinds.overdue && (
									<Dot color="#b8924f" on={isToday} />
								)}
								{kinds?.task && <Dot color="#4b6b4f" on={isToday} />}
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

function Dot({ color, on }: { color: string; on: boolean }) {
	return (
		<span
			className="size-[5px] rounded-full"
			style={{ backgroundColor: on ? "#ffffff" : color }}
		/>
	);
}

/* --------------------------- Categories -------------------------------- */

function CategoriesCard({ categories }: { categories: Summary["categories"] }) {
	const rows = categories.slice(0, 6);
	return (
		<section className="animate-fadeup rounded-[22px] border border-border bg-card px-[26px] py-6 [animation-delay:.2s]">
			<h2 className="mb-4 font-display text-[22px] font-semibold text-foreground">
				Por categoria
			</h2>
			{rows.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Cadastre fornecedores para acompanhar o orçamento por categoria.
				</p>
			) : (
				<div className="grid gap-x-8 gap-y-[15px] md:grid-cols-2 xl:grid-cols-3">
					{rows.map((row) => {
						const planned = Math.max(row.plannedCents, 1);
						const pct = Math.min(
							Math.round((row.paidCents / planned) * 100),
							100,
						);
						return (
							<div key={row.category}>
								<div className="mb-1.5 flex justify-between text-[13px]">
									<span className="font-medium text-foreground">
										{CATEGORY_LABELS[row.category]}
									</span>
									<span className="text-muted-foreground tabular-nums">
										{formatBRL(row.paidCents)} / {formatBRL(row.plannedCents)}
									</span>
								</div>
								<div className="h-2 overflow-hidden rounded-full bg-[#eee4d4]">
									<div
										className="grow-x h-full bg-[#4b6b4f]"
										style={{ width: `${Math.max(pct, 2)}%` }}
									/>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
}

/* ----------------------------- Helpers --------------------------------- */

function buildForecast(
	payments: PendingPayment[],
	today: string,
	count: number,
) {
	const startMonth = today.slice(0, 7);
	const totals = new Map<string, number>();
	for (const p of payments) {
		const m = p.dueDate.slice(0, 7);
		totals.set(m, (totals.get(m) ?? 0) + p.amountCents);
	}
	return Array.from({ length: count }, (_, i) => {
		const month = shiftMonthLocal(startMonth, i);
		return {
			month,
			label: monthTitle(month),
			shortLabel: monthShort(month),
			amountCents: totals.get(month) ?? 0,
		};
	});
}

const MONTHS_PT = [
	"jan",
	"fev",
	"mar",
	"abr",
	"mai",
	"jun",
	"jul",
	"ago",
	"set",
	"out",
	"nov",
	"dez",
];

function shiftMonthLocal(month: string, delta: number): string {
	const y = Number(month.slice(0, 4));
	const m = Number(month.slice(5, 7));
	const date = new Date(y, m - 1 + delta, 1);
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	return `${date.getFullYear()}-${mm}`;
}

function monthShort(month: string): string {
	return MONTHS_PT[Number(month.slice(5, 7)) - 1] ?? "";
}

function monthTitle(month: string): string {
	const idx = Number(month.slice(5, 7)) - 1;
	const full = [
		"Janeiro",
		"Fevereiro",
		"Março",
		"Abril",
		"Maio",
		"Junho",
		"Julho",
		"Agosto",
		"Setembro",
		"Outubro",
		"Novembro",
		"Dezembro",
	];
	return full[idx] ?? "";
}

/** Whole-reais BRL for the headline strip: "R$ 80.000" (no centavos). */
function formatBRLWhole(cents: number): string {
	return `R$ ${Math.round(cents / 100).toLocaleString("pt-BR")}`;
}

/** Compact reais for the mobile strip: "80k", "70,5k", "850". */
function compactReais(cents: number): string {
	const reais = Math.round(cents / 100);
	if (reais < 1000) return reais.toLocaleString("pt-BR");
	const k = reais / 1000;
	return `${k.toLocaleString("pt-BR", {
		maximumFractionDigits: k < 100 && !Number.isInteger(k) ? 1 : 0,
	})}k`;
}

function compactBRL(cents: number): string {
	const reais = cents / 100;
	if (reais < 1000)
		return `R$ ${reais.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
	const k = reais / 1000;
	return `${k.toLocaleString("pt-BR", { maximumFractionDigits: k < 100 && !Number.isInteger(k) ? 1 : 0 })}k`;
}

function DashboardSkeleton() {
	return (
		<div className="flex flex-col gap-[18px]" aria-busy>
			<Skeleton className="h-[340px] rounded-[26px] sm:h-[392px]" />
			<div className="grid grid-cols-3 gap-4">
				<Skeleton className="h-20 rounded-[18px]" />
				<Skeleton className="h-20 rounded-[18px]" />
				<Skeleton className="h-20 rounded-[18px]" />
			</div>
			<div className="grid gap-[22px] lg:grid-cols-[1.5fr_1fr]">
				<Skeleton className="h-72 rounded-[22px]" />
				<Skeleton className="h-72 rounded-[22px]" />
			</div>
		</div>
	);
}
