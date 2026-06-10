// Vendor categories and statuses. Identifiers in English-friendly slugs,
// labels in pt-BR (UI copy).

export const VENDOR_CATEGORIES = [
	"espaco",
	"buffet",
	"decoracao",
	"dj_banda",
	"fotografia",
	"filmagem",
	"assessoria",
	"celebrante",
	"vestido_traje",
	"beleza",
	"doces_bolo",
	"iluminacao",
	"open_bar",
	"mobiliario",
	"convites",
	"transporte",
	"outros",
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<VendorCategory, string> = {
	espaco: "Espaço",
	buffet: "Buffet",
	decoracao: "Decoração",
	dj_banda: "DJ / Banda",
	fotografia: "Fotografia",
	filmagem: "Filmagem",
	assessoria: "Assessoria do dia",
	celebrante: "Celebrante",
	vestido_traje: "Vestido / Traje",
	beleza: "Beleza",
	doces_bolo: "Doces / Bolo",
	iluminacao: "Iluminação",
	open_bar: "Open bar",
	mobiliario: "Mobiliário",
	convites: "Convites",
	transporte: "Transporte",
	outros: "Outros",
};

export const VENDOR_STATUSES = [
	"pesquisando",
	"cotado",
	"negociando",
	"fechado",
	"parcialmente_pago",
	"pago",
	"cancelado",
] as const;

export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export const STATUS_LABELS: Record<VendorStatus, string> = {
	pesquisando: "Pesquisando",
	cotado: "Cotado",
	negociando: "Negociando",
	fechado: "Fechado",
	parcialmente_pago: "Parcialmente pago",
	pago: "Pago",
	cancelado: "Cancelado",
};

/** Statuses where a contract exists and the contracted value counts as committed. */
export const CONTRACTED_STATUSES: readonly VendorStatus[] = [
	"fechado",
	"parcialmente_pago",
	"pago",
];

export const PAYMENT_STATUSES = ["pendente", "pago"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// Payment method is free text (the user can type anything, e.g.
// "PIX parcelado", "cartão 3x sem juros"); these are just dropdown suggestions.
export const PAYMENT_METHOD_SUGGESTIONS = [
	"PIX",
	"Cartão de crédito",
	"Cartão de débito",
	"Boleto",
	"Transferência",
	"Dinheiro",
] as const;

/** Fallback bucket label for payments with no method set. */
export const PAYMENT_METHOD_FALLBACK = "Outro";

export const ATTACHMENT_KINDS = ["contrato", "comprovante", "outro"] as const;

export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const ATTACHMENT_KIND_LABELS: Record<AttachmentKind, string> = {
	contrato: "Contrato",
	comprovante: "Comprovante",
	outro: "Arquivo",
};

export const TASK_PRIORITIES = ["alta", "media", "baixa"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
	alta: "Alta",
	media: "Média",
	baixa: "Baixa",
};

export const TASK_STATUSES = ["pendente", "em_andamento", "concluida"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
	pendente: "Pendente",
	em_andamento: "Em andamento",
	concluida: "Concluída",
};
