"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ArrowRight, Check, PartyPopper } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";
import { OnboardingCard } from "@/components/dashboard/onboarding-card";
import { BudgetOverviewCard } from "@/components/finance/budget-overview-card";
import { PaymentListCard } from "@/components/payment-list-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORY_LABELS } from "@/lib/domain/categories";
import { formatDateBR, todayInSaoPaulo } from "@/lib/domain/dates";
import { formatBRL } from "@/lib/domain/money";
import { notifyError } from "@/lib/notify";

type Summary = FunctionReturnType<typeof api.dashboard.summary>;

export function DashboardContent() {
	const today = useMemo(() => todayInSaoPaulo(), []);
	const summary = useQuery(api.dashboard.summary, { today });
	const pending = useQuery(api.payments.listPending, {});

	if (summary === undefined || pending === undefined)
		return <DashboardSkeleton />;
	if (!summary.settings) return <OnboardingCard />;

	return (
		<div className="animate-screen-enter flex flex-col gap-4">
			<CountdownCard summary={summary} />
			<BudgetOverviewCard
				finance={summary.finance}
				pending={pending}
				today={today}
			/>
			{(summary.overdue.length > 0 || summary.dueSoon.length > 0) && (
				<div
					className={`grid items-start gap-4 ${
						summary.overdue.length > 0 && summary.dueSoon.length > 0
							? "lg:grid-cols-2"
							: ""
					}`}
				>
					{summary.overdue.length > 0 && (
						<PaymentListCard
							title="Pagamentos atrasados"
							tone="overdue"
							payments={summary.overdue}
						/>
					)}
					{summary.dueSoon.length > 0 && (
						<PaymentListCard
							title="Próximos vencimentos"
							tone="dueSoon"
							payments={summary.dueSoon}
						/>
					)}
				</div>
			)}
			<MonthTasksCard tasks={summary.monthTasks} />
			<CategorySummaryCard categories={summary.categories} />
		</div>
	);
}

function CountdownCard({ summary }: { summary: Summary }) {
	const { settings, countdownDays } = summary;
	if (!settings || countdownDays === null) return null;

	return (
		<Card className="hero-wash relative min-h-[24rem] overflow-hidden border-0 text-center text-white ring-0">
			<CardContent className="relative z-10 flex min-h-[24rem] flex-col items-center justify-between gap-4 py-7">
				<p className="hero-subject rounded-full bg-black/25 px-4 py-1.5 font-display text-base font-medium text-white/90 shadow-sm ring-1 ring-white/20 backdrop-blur-md">
					{settings.coupleNames}
				</p>
				{countdownDays > 0 ? (
					<div className="hero-subject rounded-[2rem] bg-black/28 px-8 py-4 shadow-[0_24px_70px_oklch(0.12_0.04_88_/_0.28)] ring-1 ring-white/20 backdrop-blur-md">
						<p className="font-display text-7xl font-semibold leading-none text-white tabular-nums sm:text-8xl">
							{countdownDays}
						</p>
						<p className="mt-1 text-sm font-medium text-white/78">
							{countdownDays === 1 ? "dia para" : "dias para"} o grande dia
						</p>
					</div>
				) : countdownDays === 0 ? (
					<p className="hero-subject flex items-center gap-2 rounded-[2rem] bg-black/28 px-6 py-4 font-display text-3xl font-semibold shadow-sm ring-1 ring-white/20 backdrop-blur-md">
						<PartyPopper className="size-7 text-gold" aria-hidden />É hoje!
					</p>
				) : (
					<p className="hero-subject flex items-center gap-2 rounded-[2rem] bg-black/28 px-6 py-4 font-display text-3xl font-semibold shadow-sm ring-1 ring-white/20 backdrop-blur-md">
						<PartyPopper className="size-7 text-gold" aria-hidden />
						Felizes para sempre!
					</p>
				)}
				<p className="hero-subject rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-white/75 shadow-sm ring-1 ring-white/20 backdrop-blur-md">
					{formatDateBR(settings.weddingDate)}
				</p>
			</CardContent>
		</Card>
	);
}

function MonthTasksCard({ tasks }: { tasks: Summary["monthTasks"] }) {
	const updateTask = useMutation(api.tasks.update);

	async function handleComplete(id: Id<"tasks">) {
		try {
			await updateTask({ id, status: "concluida" });
			toast.success("Tarefa concluída");
		} catch (error) {
			notifyError(error, "Não foi possível concluir");
		}
	}

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between">
				<CardTitle className="font-display text-lg">Tarefas do mês</CardTitle>
				<Button variant="ghost" size="sm" render={<Link href="/checklist" />}>
					Ver tudo
					<ArrowRight data-icon="inline-end" aria-hidden />
				</Button>
			</CardHeader>
			<CardContent>
				{tasks.length === 0 ? (
					<p className="py-2 text-sm text-muted-foreground">
						Nenhuma tarefa pendente neste mês. Respira, está tudo em dia.
					</p>
				) : (
					<ul className="flex flex-col divide-y">
						{tasks.map((task) => (
							<li
								key={task._id}
								className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
							>
								<button
									type="button"
									onClick={() => handleComplete(task._id)}
									aria-label={`Concluir tarefa: ${task.title}`}
									className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-transparent transition-colors hover:border-success hover:text-success"
								>
									<Check className="size-3.5" aria-hidden />
								</button>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium">{task.title}</p>
									{task.dueDate ? (
										<p className="text-xs text-muted-foreground">
											até {formatDateBR(task.dueDate)}
										</p>
									) : null}
								</div>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

function CategorySummaryCard({
	categories,
}: {
	categories: Summary["categories"];
}) {
	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between">
				<CardTitle className="font-display text-lg">Por categoria</CardTitle>
				<Button variant="ghost" size="sm" render={<Link href="/financeiro" />}>
					Financeiro
					<ArrowRight data-icon="inline-end" aria-hidden />
				</Button>
			</CardHeader>
			<CardContent>
				{categories.length === 0 ? (
					<div className="flex flex-col items-center gap-3 py-4 text-center">
						<p className="text-sm text-muted-foreground">
							Cadastre seu primeiro fornecedor para acompanhar o orçamento por
							categoria.
						</p>
						<Button size="sm" render={<Link href="/fornecedores" />}>
							Cadastrar fornecedor
						</Button>
					</div>
				) : (
					<ul className="grid gap-3 md:grid-cols-2">
						{categories.map((row) => {
							const progress =
								row.contractedCents > 0
									? Math.min(
											Math.round((row.paidCents / row.contractedCents) * 100),
											100,
										)
									: 0;
							return (
								<li
									key={row.category}
									className="rounded-2xl bg-card/45 p-3 ring-1 ring-border/60"
								>
									<div className="flex items-baseline justify-between gap-2">
										<span className="text-sm font-medium">
											{CATEGORY_LABELS[row.category]}
											<span className="ml-1.5 text-xs text-muted-foreground">
												{row.vendorCount}
											</span>
										</span>
										<span className="text-sm font-semibold tabular-nums">
											{formatBRL(row.plannedCents)}
										</span>
									</div>
									<div className="mt-2 flex items-center gap-2">
										<Progress
											value={progress}
											className="h-1"
											aria-label={`${CATEGORY_LABELS[row.category]}: ${progress}% pago`}
										/>
										<span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
											{formatBRL(row.paidCents)} pago
										</span>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

function DashboardSkeleton() {
	return (
		<div
			className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]"
			aria-busy
		>
			<Skeleton className="h-76 rounded-[2rem]" />
			<Skeleton className="h-76 rounded-[2rem]" />
			<Skeleton className="h-40 rounded-[2rem] lg:col-span-2" />
		</div>
	);
}
