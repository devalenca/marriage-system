/**
 * Account-creation policy. Accounts may be created by:
 * - the platform superadmin (provisioning tenants);
 * - a wedding admin (adding members to their own wedding);
 * - anyone, when public self-signup is enabled (the product's front door);
 * - otherwise only the very first account (bootstrap), for a configured
 *   superadmin e-mail. Fails closed when none of these hold.
 */
export function canCreateUser(args: {
	callerIsSuperadmin: boolean;
	callerIsWeddingAdmin: boolean;
	selfSignupEnabled: boolean;
	anyUserExists: boolean;
	email: string;
	superadminEmails: string[];
}): boolean {
	const email = args.email.trim().toLowerCase();
	if (email.length === 0) return false;
	if (args.callerIsSuperadmin || args.callerIsWeddingAdmin) return true;
	if (args.selfSignupEnabled) return true;
	return !args.anyUserExists && args.superadminEmails.includes(email);
}
