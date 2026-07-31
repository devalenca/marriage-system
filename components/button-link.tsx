import Link from "next/link";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

/**
 * A link that looks like a button. Base UI needs `nativeButton={false}` when
 * the rendered element is an anchor — otherwise it assumes button semantics
 * it isn't getting, and warns. Keeping that detail here means call sites just
 * write `<ButtonLink href="/algo">`.
 */
export function ButtonLink({
	href,
	...props
}: ComponentProps<typeof Button> & { href: string }) {
	return (
		<Button {...props} nativeButton={false} render={<Link href={href} />} />
	);
}
