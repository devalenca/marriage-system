import { INVITE_SIDE_LABELS, RSVP_STATUS_LABELS } from "@/lib/domain/guests";
import type { GuestExportInvite } from "@/lib/domain/guests-export";

/**
 * Print-only guest list. Hidden on screen (`hidden print:block`); the global
 * `@media print` rule (see globals.css) keyed on `data-print-area` hides the
 * rest of the app so window.print() yields just this clean sheet.
 */
export function GuestPrintSheet({
	invites,
}: {
	invites: readonly GuestExportInvite[];
}) {
	const rows = invites.flatMap((invite) =>
		invite.guests.map((guest) => ({ invite, guest })),
	);

	return (
		<div data-print-area className="hidden bg-white p-6 text-black print:block">
			<h1 className="mb-1 text-xl font-semibold">Lista de convidados</h1>
			<p className="mb-4 text-sm">
				{rows.length} convidado{rows.length === 1 ? "" : "s"}
			</p>
			<table className="w-full border-collapse text-sm">
				<thead>
					<tr>
						{["", "Convite", "Convidado", "Status", "Faixa", "Restrição"].map(
							(header) => (
								<th
									key={header || "check"}
									className="border-b border-black/50 py-1 pr-3 text-left font-semibold"
								>
									{header}
								</th>
							),
						)}
					</tr>
				</thead>
				<tbody>
					{rows.map(({ invite, guest }, index) => (
						<tr
							// biome-ignore lint/suspicious/noArrayIndexKey: static print snapshot
							key={index}
							className="border-b border-black/15"
						>
							<td className="py-1 pr-3">
								<span className="inline-block size-3 border border-black/60" />
							</td>
							<td className="py-1 pr-3">
								{invite.title}
								{invite.side ? ` (${INVITE_SIDE_LABELS[invite.side]})` : ""}
							</td>
							<td className="py-1 pr-3">{guest.name}</td>
							<td className="py-1 pr-3">
								{RSVP_STATUS_LABELS[guest.rsvpStatus]}
							</td>
							<td className="py-1 pr-3">
								{guest.isChild ? "Criança" : "Adulto"}
							</td>
							<td className="py-1 pr-3">{guest.mealNotes?.trim() ?? ""}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
