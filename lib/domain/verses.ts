// Motivational verses for the daily home card — marriage, love and
// perseverance. The texts are a free rendering of the public-domain biblical
// source (NOT the copyrighted ARA), so they are safe to ship; the schema lets
// you swap `text` for a licensed translation later.

import { daysBetween } from "./dates";

export type Verse = { reference: string; text: string; theme: string };

export const SEED_VERSES: readonly Verse[] = [
	{
		reference: "Eclesiastes 4:9-10",
		theme: "uniao",
		text: "Melhor é serem dois do que um, porque têm melhor recompensa no seu trabalho. Se um cair, o outro o levanta.",
	},
	{
		reference: "Eclesiastes 4:12",
		theme: "uniao",
		text: "O cordão de três dobras não se rompe com facilidade.",
	},
	{
		reference: "1 Coríntios 13:4-5",
		theme: "amor",
		text: "O amor é paciente, é bondoso. Não inveja, não se orgulha, não busca os seus próprios interesses e não guarda mágoa.",
	},
	{
		reference: "1 Coríntios 13:7",
		theme: "amor",
		text: "O amor tudo sofre, tudo crê, tudo espera, tudo suporta.",
	},
	{
		reference: "Colossenses 3:14",
		theme: "amor",
		text: "Acima de tudo, revistam-se do amor, que é o vínculo perfeito da união.",
	},
	{
		reference: "1 Coríntios 16:14",
		theme: "amor",
		text: "Tudo o que fizerem, façam com amor.",
	},
	{
		reference: "Gênesis 2:24",
		theme: "uniao",
		text: "Por isso o homem deixa pai e mãe e se une à sua mulher, e os dois se tornam uma só carne.",
	},
	{
		reference: "Cânticos 8:7",
		theme: "amor",
		text: "As muitas águas não conseguem apagar o amor, nem os rios afogá-lo.",
	},
	{
		reference: "Romanos 12:12",
		theme: "perseveranca",
		text: "Alegrem-se na esperança, sejam pacientes na dificuldade e perseverem na oração.",
	},
	{
		reference: "Gálatas 6:9",
		theme: "perseveranca",
		text: "Não nos cansemos de fazer o bem, pois no tempo certo colheremos, se não desistirmos.",
	},
	{
		reference: "Filipenses 4:13",
		theme: "perseveranca",
		text: "Tudo posso naquele que me fortalece.",
	},
	{
		reference: "Efésios 4:2-3",
		theme: "perseveranca",
		text: "Sejam humildes e pacientes, suportando uns aos outros com amor, e esforcem-se por manter a união.",
	},
	{
		reference: "Provérbios 3:3-4",
		theme: "uniao",
		text: "Que a bondade e a fidelidade nunca os deixem; traga-as sempre com você, e encontrará favor e bom nome.",
	},
	{
		reference: "Provérbios 18:22",
		theme: "uniao",
		text: "Quem encontra um bom cônjuge encontra algo excelente e recebe uma bênção.",
	},
];

/**
 * Deterministic verse of the day: everyone sees the same one on a given date,
 * rotating through the list day by day. `today` is ISO yyyy-MM-dd (SP).
 */
export function dailyVerseIndex(today: string, count: number): number {
	if (count <= 0) return 0;
	const days = daysBetween("1970-01-01", today);
	return ((days % count) + count) % count;
}
