// Subscription state for a wedding. Billing is handled off-platform (manual
// card links); the superadmin records how long a wedding stays active by
// setting `subscriptionActiveUntil` (ISO yyyy-MM-dd, America/Sao_Paulo).
// A missing date means "unlimited" — the grandfathered/comped case.

import { addDaysISO, daysBetween } from "./dates";

/** Free-trial length granted to a freshly provisioned wedding. */
export const TRIAL_DAYS = 14;

/** True while the wedding may still edit its data; undefined = unlimited. */
export function isSubscriptionActive(
	activeUntil: string | undefined,
	today: string,
): boolean {
	if (activeUntil === undefined) return true;
	return activeUntil >= today;
}

/** Expiry date for a trial that starts today. */
export function trialUntil(today: string): string {
	return addDaysISO(today, TRIAL_DAYS);
}

export type SubscriptionStatus = {
	active: boolean;
	activeUntil: string | null;
	/** Calendar days until expiry (negative when expired); null if unlimited. */
	daysLeft: number | null;
};

export function subscriptionStatus(
	activeUntil: string | undefined,
	today: string,
): SubscriptionStatus {
	if (activeUntil === undefined) {
		return { active: true, activeUntil: null, daysLeft: null };
	}
	return {
		active: activeUntil >= today,
		activeUntil,
		daysLeft: daysBetween(today, activeUntil),
	};
}
