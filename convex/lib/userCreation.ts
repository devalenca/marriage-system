/**
 * Account-creation policy. Accounts may be created by the platform superadmin
 * (provisioning tenants) or by a wedding admin (adding members to their own
 * wedding). Otherwise only the very first account (bootstrap) may be created,
 * and only with the superadmin e-mail. Fails closed when it is not configured.
 */
export function canCreateUser(args: {
	callerIsSuperadmin: boolean;
	callerIsWeddingAdmin: boolean;
	anyUserExists: boolean;
	email: string;
	adminEmail: string;
}): boolean {
	const email = args.email.trim().toLowerCase();
	const adminEmail = args.adminEmail.trim().toLowerCase();
	if (email.length === 0) return false;
	if (args.callerIsSuperadmin || args.callerIsWeddingAdmin) return true;
	return !args.anyUserExists && adminEmail.length > 0 && email === adminEmail;
}
