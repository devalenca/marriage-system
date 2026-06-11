/**
 * Account-creation policy: the authenticated admin can always create
 * accounts; otherwise only the very first account (bootstrap) may be
 * created, and only with the admin e-mail. Fails closed when the admin
 * e-mail is not configured.
 */
export function canCreateUser(args: {
	callerIsAdmin: boolean;
	anyUserExists: boolean;
	email: string;
	adminEmail: string;
}): boolean {
	const email = args.email.trim().toLowerCase();
	const adminEmail = args.adminEmail.trim().toLowerCase();
	if (email.length === 0) return false;
	if (args.callerIsAdmin) return true;
	return !args.anyUserExists && adminEmail.length > 0 && email === adminEmail;
}
