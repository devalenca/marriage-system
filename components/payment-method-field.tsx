import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHOD_SUGGESTIONS } from "@/lib/domain/categories";

/**
 * Free-text payment method with a dropdown of common suggestions: the user can
 * type anything ("PIX parcelado", "cartão 3x") or pick a suggestion.
 */
export function PaymentMethodField({
	id = "payment-method",
	value,
	onChange,
}: {
	id?: string;
	value: string;
	onChange: (value: string) => void;
}) {
	const listId = `${id}-options`;
	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={id}>Forma de pagamento</Label>
			<Input
				id={id}
				list={listId}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder="PIX, cartão, boleto, transferência..."
				autoComplete="off"
			/>
			<datalist id={listId}>
				{PAYMENT_METHOD_SUGGESTIONS.map((option) => (
					<option key={option} value={option} />
				))}
			</datalist>
		</div>
	);
}
