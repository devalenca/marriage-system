// Month-by-month checklist template for a Brazilian wedding, inspired by
// The Knot's planning flow adapted to the local market (assessoria,
// celebrante, doces/bolo, open bar). Generated tasks are editable —
// the template is only the starting point.

import type { TaskPriority, TaskStatus, VendorCategory } from "./categories";
import { addMonthsISO } from "./dates";

/** Minimal task shape needed to decide overdue-ness (backend-agnostic). */
export interface OverdueTaskInput {
	dueDate?: string;
	status: TaskStatus;
}

/**
 * A task is overdue when it has a due date strictly before today and is not
 * yet completed. ISO `yyyy-MM-dd` strings compare lexicographically, matching
 * calendar order.
 */
export function isTaskOverdue(
	task: OverdueTaskInput,
	todayISO: string,
): boolean {
	return (
		task.dueDate !== undefined &&
		task.dueDate < todayISO &&
		task.status !== "concluida"
	);
}

export interface ChecklistTemplateTask {
	title: string;
	monthsBefore: number;
	priority: TaskPriority;
	category?: VendorCategory;
}

export const CHECKLIST_TEMPLATE: readonly ChecklistTemplateTask[] = [
	// 12 meses antes
	{ title: "Definir orçamento total", monthsBefore: 12, priority: "alta" },
	{
		title: "Montar lista preliminar de convidados",
		monthsBefore: 12,
		priority: "alta",
	},
	{
		title: "Fechar espaço",
		monthsBefore: 12,
		priority: "alta",
		category: "espaco",
	},
	{
		title: "Contratar assessoria",
		monthsBefore: 12,
		priority: "media",
		category: "assessoria",
	},
	// 10 meses antes
	{
		title: "Fechar buffet",
		monthsBefore: 10,
		priority: "alta",
		category: "buffet",
	},
	{
		title: "Fechar fotógrafo",
		monthsBefore: 10,
		priority: "alta",
		category: "fotografia",
	},
	{
		title: "Fechar filmagem",
		monthsBefore: 10,
		priority: "media",
		category: "filmagem",
	},
	{
		title: "Fechar DJ ou banda",
		monthsBefore: 10,
		priority: "media",
		category: "dj_banda",
	},
	// 8 meses antes
	{
		title: "Definir decoração",
		monthsBefore: 8,
		priority: "alta",
		category: "decoracao",
	},
	{
		title: "Escolher vestido / traje",
		monthsBefore: 8,
		priority: "alta",
		category: "vestido_traje",
	},
	{
		title: "Reservar celebrante",
		monthsBefore: 8,
		priority: "media",
		category: "celebrante",
	},
	// 6 meses antes
	{
		title: "Encomendar convites",
		monthsBefore: 6,
		priority: "media",
		category: "convites",
	},
	{
		title: "Fechar doces e bolo",
		monthsBefore: 6,
		priority: "media",
		category: "doces_bolo",
	},
	{
		title: "Contratar open bar",
		monthsBefore: 6,
		priority: "media",
		category: "open_bar",
	},
	{
		title: "Definir iluminação",
		monthsBefore: 6,
		priority: "baixa",
		category: "iluminacao",
	},
	// 4 meses antes
	{
		title: "Agendar teste de beleza",
		monthsBefore: 4,
		priority: "media",
		category: "beleza",
	},
	{
		title: "Contratar mobiliário",
		monthsBefore: 4,
		priority: "baixa",
		category: "mobiliario",
	},
	{
		title: "Organizar transporte",
		monthsBefore: 4,
		priority: "baixa",
		category: "transporte",
	},
	// 3 meses antes
	{ title: "Enviar convites", monthsBefore: 3, priority: "alta" },
	{
		title: "Revisar contratos e pagamentos",
		monthsBefore: 3,
		priority: "alta",
	},
	{ title: "Revisar decoração", monthsBefore: 3, priority: "media" },
	// 2 meses antes
	{
		title: "Prova final do vestido / traje",
		monthsBefore: 2,
		priority: "alta",
		category: "vestido_traje",
	},
	{ title: "Degustação final do buffet", monthsBefore: 2, priority: "media" },
	{ title: "Montar cronograma do dia", monthsBefore: 2, priority: "alta" },
	// 1 mês antes
	{
		title: "Confirmar todos os fornecedores",
		monthsBefore: 1,
		priority: "alta",
	},
	{
		title: "Confirmar presença dos convidados",
		monthsBefore: 1,
		priority: "media",
	},
	{ title: "Quitar pagamentos finais", monthsBefore: 1, priority: "alta" },
	// Mês do casamento
	{
		title: "Separar pagamentos e gorjetas do dia",
		monthsBefore: 0,
		priority: "alta",
	},
	{
		title: "Revisar checklist final com a assessoria",
		monthsBefore: 0,
		priority: "alta",
	},
	{ title: "Aproveitar o grande dia", monthsBefore: 0, priority: "alta" },
];

export function monthsBeforeLabel(monthsBefore: number): string {
	if (monthsBefore === 0) return "Mês do casamento";
	if (monthsBefore === 1) return "1 mês antes";
	return `${monthsBefore} meses antes`;
}

export interface GeneratedTask extends ChecklistTemplateTask {
	dueDate: string;
}

/** Instantiates the template against a wedding date, sorted by due date. */
export function generateChecklist(weddingDateISO: string): GeneratedTask[] {
	return CHECKLIST_TEMPLATE.map((task) => ({
		...task,
		dueDate: addMonthsISO(weddingDateISO, -task.monthsBefore),
	})).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
