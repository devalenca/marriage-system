"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ArrowLeft, Baby, Check, Search } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "@/components/button-link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { checkInCounts, matchesGuestSearch } from "@/lib/domain/guests";
import { notifyError } from "@/lib/notify";

type InviteWithGuests = FunctionReturnType<
	typeof api.guests.listInvites
>[number];
type Guest = InviteWithGuests["guests"][number];

export function CheckInContent() {
	const invites = useQuery(api.guests.listInvites, {});
	const setCheckIn = useMutation(api.guests.setCheckIn);
	const [search, setSearch] = useState("");

	if (invites === undefined) return <CheckInSkeleton />;

	const allGuests = invites.flatMap((i) => i.guests);
	const { present, expected } = checkInCounts(allGuests);

	async function handleToggle(guest: Guest) {
		try {
			await setCheckIn({ id: guest._id, checkedIn: !guest.checkedIn });
		} catch (error) {
			notifyError(error, "Não foi possível atualizar o check-in");
		}
	}

	return (
		<div className="animate-screen-enter">
			<PageHeader
				title="Check-in do dia"
				subtitle={`${present} de ${expected} presentes`}
				action={
					<ButtonLink variant="outline" href="/convidados">
						<ArrowLeft data-icon="inline-start" aria-hidden />
						Convidados
					</ButtonLink>
				}
			/>

			{expected > 0 ? (
				<div className="relative mb-4">
					<Search
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						aria-label="Buscar convidado"
						placeholder="Buscar pelo nome..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="h-11 pl-9"
					/>
				</div>
			) : null}

			{expected === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
						<span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
							<Check className="size-6" aria-hidden />
						</span>
						<p className="text-sm text-muted-foreground text-balance">
							Nenhum convidado confirmado ainda. As confirmações aparecem aqui
							no dia.
						</p>
					</CardContent>
				</Card>
			) : (
				<ul className="flex flex-col gap-3">
					{invites.map((invite, index) => {
						const confirmed = invite.guests.filter(
							(g) =>
								g.rsvpStatus === "confirmado" &&
								matchesGuestSearch(g.name, search),
						);
						if (confirmed.length === 0) return null;
						return (
							<li
								key={invite._id}
								className="animate-card-enter"
								style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
							>
								<Card>
									<CardContent className="flex flex-col gap-3 py-4">
										<p className="truncate font-medium">{invite.title}</p>
										<ul className="flex flex-col divide-y rounded-2xl bg-card/40 ring-1 ring-border/50">
											{confirmed.map((guest) => (
												<li
													key={guest._id}
													className="flex items-center gap-2 px-3 py-2"
												>
													<p className="flex min-w-0 flex-1 items-center gap-1 truncate text-sm font-medium">
														{guest.name}
														{guest.isChild ? (
															<Baby
																className="size-3.5 text-muted-foreground"
																aria-label="Criança"
															/>
														) : null}
													</p>
													<Button
														variant={guest.checkedIn ? "default" : "outline"}
														size="sm"
														className="h-11 shrink-0 sm:h-7"
														aria-label={
															guest.checkedIn
																? `Desfazer check-in de ${guest.name}`
																: `Check-in de ${guest.name}`
														}
														onClick={() => handleToggle(guest)}
													>
														<Check data-icon="inline-start" aria-hidden />
														{guest.checkedIn ? "Presente" : "Marcar presença"}
													</Button>
												</li>
											))}
										</ul>
									</CardContent>
								</Card>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

function CheckInSkeleton() {
	return (
		<div className="flex flex-col gap-3" aria-busy>
			<Skeleton className="h-24 rounded-2xl" />
			<Skeleton className="h-32 rounded-2xl" />
			<Skeleton className="h-32 rounded-2xl" />
		</div>
	);
}
