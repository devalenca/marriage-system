import type { Metadata } from "next";
import { CheckInContent } from "@/components/guests/check-in-content";

export const metadata: Metadata = {
	title: "Check-in do dia — Nosso Casamento",
};

export default function CheckInPage() {
	return <CheckInContent />;
}
