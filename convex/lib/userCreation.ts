/**
 * Account-creation policy. Accounts may be created by the platform superadmin
 * (provisioning tenants) or by a wedding admin (adding members to their own
 * wedding). Otherwise only the very first account (bootstrap) may be created,
 * and only for a configured superadmin e-mail. Fails closed when none is set.
 */
export function canCreateUser(args: {
	callerIsSuperadmin: boolean;
	callerIsWeddingAdmin: boolean;
	anyUserExists: boolean;
	email: string;
	superadminEmails: string[];
}): boolean {
	const email = args.email.trim().toLowerCase();
	if (email.length === 0) return false;
	if (args.callerIsSuperadmin || args.callerIsWeddingAdmin) return true;
	return !args.anyUserExists && args.superadminEmails.includes(email);
}
