import type { Metadata } from "next";
import {
	LegalList,
	LegalListItem,
	LegalPage,
	LegalParagraph,
	LegalSection,
} from "@/components/legal/legal-page";

export const metadata: Metadata = {
	title: "Termos de Uso — Nosso Casamento",
	description:
		"Termos de Uso do Nosso Casamento: o serviço, contas, assinatura e período de teste, cancelamento e exclusão de dados.",
};

const CONTACT_EMAIL = "contato@[dominio]";

export default function TermosPage() {
	return (
		<LegalPage
			title="Termos de Uso"
			subtitle="Estes Termos regulam o uso do Nosso Casamento, um serviço online que ajuda casais a organizar o planejamento do casamento — fornecedores, orçamento, pagamentos, convidados e checklist. Ao criar uma conta e usar o serviço, você concorda com o que está descrito aqui."
			updatedAt="14 de julho de 2026"
		>
			<LegalSection index={1} title="O serviço">
				<LegalParagraph>
					O Nosso Casamento é uma ferramenta de planejamento que reúne, em um só
					lugar, os dados do seu casamento: fornecedores contratados, meta de
					orçamento, valores fechados, entradas e parcelas, datas de vencimento,
					lista de convidados e uma linha do tempo de tarefas com contagem
					regressiva até o grande dia.
				</LegalParagraph>
				<LegalParagraph>
					O serviço é uma ferramenta de organização. Ele não realiza pagamentos
					aos seus fornecedores, não intermedia contratos e não substitui o
					acompanhamento financeiro do casal. Os valores, prazos e informações
					que aparecem são exatamente aqueles que você cadastra — a
					responsabilidade por mantê-los corretos e atualizados é sua.
				</LegalParagraph>
			</LegalSection>

			<LegalSection index={2} title="Contas e acesso">
				<LegalParagraph>
					Para usar o serviço é necessário criar uma conta com e-mail e senha. O
					casamento é compartilhado pelo casal, então você é responsável por
					quem convida ou a quem dá acesso às informações.
				</LegalParagraph>
				<LegalList>
					<LegalListItem>
						Mantenha sua senha em segredo e não a compartilhe fora do casal.
					</LegalListItem>
					<LegalListItem>
						Você é responsável pelas atividades realizadas na sua conta.
					</LegalListItem>
					<LegalListItem>
						Forneça informações verdadeiras no cadastro e mantenha seu e-mail
						atualizado, pois ele é usado para acessar a conta.
					</LegalListItem>
					<LegalListItem>
						Você precisa ter pelo menos 18 anos para criar uma conta.
					</LegalListItem>
				</LegalList>
			</LegalSection>

			<LegalSection index={3} title="Assinatura e período de teste">
				<LegalParagraph>
					Ao criar o seu casamento no serviço, você começa com um período de
					teste gratuito de 14 dias, com acesso às funcionalidades de
					planejamento. Não é necessário informar dados de pagamento para
					iniciar o teste.
				</LegalParagraph>
				<LegalParagraph>
					Encerrado o período de teste, o uso contínuo do serviço depende de uma
					assinatura. As condições comerciais vigentes — valor, forma de
					cobrança e periodicidade — são apresentadas no momento da contratação.
					Enquanto não houver uma assinatura ativa, o acesso às funcionalidades
					pode ser limitado, mas seus dados permanecem guardados e disponíveis
					para exportação ou exclusão conforme descrito abaixo.
				</LegalParagraph>
			</LegalSection>

			<LegalSection index={4} title="Uso aceitável">
				<LegalParagraph>
					Pedimos que você use o serviço apenas para o planejamento do seu
					próprio casamento e de forma respeitosa. Ao usar o Nosso Casamento,
					você concorda em não:
				</LegalParagraph>
				<LegalList>
					<LegalListItem>
						Usar o serviço para fins ilegais ou para armazenar conteúdo ilícito.
					</LegalListItem>
					<LegalListItem>
						Tentar acessar contas, casamentos ou dados de outros usuários.
					</LegalListItem>
					<LegalListItem>
						Sobrecarregar, testar vulnerabilidades ou interferir no
						funcionamento do serviço.
					</LegalListItem>
					<LegalListItem>
						Cadastrar dados pessoais de terceiros (como convidados) sem uma base
						legítima para isso.
					</LegalListItem>
				</LegalList>
			</LegalSection>

			<LegalSection index={5} title="Seus dados e conteúdo">
				<LegalParagraph>
					Os dados que você cadastra são seus. Nós os armazenamos e processamos
					apenas para fazer o serviço funcionar — mostrar seu painel, calcular
					totais, lembrar prazos e guardar o histórico do planejamento. Não
					vendemos seus dados nem os usamos para publicidade de terceiros. O
					tratamento de dados pessoais está detalhado na nossa{" "}
					<a
						href="/privacidade"
						className="font-medium text-primary underline underline-offset-2"
					>
						Política de Privacidade
					</a>
					.
				</LegalParagraph>
			</LegalSection>

			<LegalSection index={6} title="Cancelamento e exclusão de dados">
				<LegalParagraph>
					Você pode parar de usar o serviço quando quiser. A qualquer momento, o
					casal pode excluir permanentemente o casamento e todos os dados
					associados — fornecedores, valores, pagamentos, convidados e checklist
					— diretamente em <span className="font-medium">Ajustes</span>, na
					opção de exclusão da conta.
				</LegalParagraph>
				<LegalParagraph>
					A exclusão é definitiva e não pode ser desfeita. Depois dela, não
					conseguimos recuperar as informações. Se preferir, você também pode
					solicitar a exclusão pelo e-mail {CONTACT_EMAIL}. Podemos manter
					registros mínimos quando a lei exigir (por exemplo, obrigações fiscais
					de cobrança), pelo prazo estritamente necessário.
				</LegalParagraph>
			</LegalSection>

			<LegalSection index={7} title="Disponibilidade e alterações">
				<LegalParagraph>
					Trabalhamos para manter o serviço disponível e estável, mas ele é
					oferecido "no estado em que se encontra". Podemos evoluir
					funcionalidades, realizar manutenções e, eventualmente, descontinuar
					recursos. Mudanças relevantes nestes Termos serão comunicadas com
					antecedência razoável, e o uso contínuo após a atualização representa
					concordância com a nova versão.
				</LegalParagraph>
			</LegalSection>

			<LegalSection index={8} title="Limitação de responsabilidade">
				<LegalParagraph>
					O Nosso Casamento é uma ferramenta de apoio à organização. As decisões
					de contratação, os pagamentos aos fornecedores e o cumprimento de
					prazos são de responsabilidade do casal. Na máxima medida permitida
					pela lei, não nos responsabilizamos por prejuízos decorrentes de dados
					cadastrados incorretamente, de decisões tomadas com base nas
					informações do serviço, de pagamentos não realizados ou de
					indisponibilidades temporárias.
				</LegalParagraph>
				<LegalParagraph>
					Nada nestes Termos afasta direitos que a legislação de proteção ao
					consumidor garanta a você de forma inafastável.
				</LegalParagraph>
			</LegalSection>

			<LegalSection index={9} title="Foro e lei aplicável">
				<LegalParagraph>
					Estes Termos são regidos pelas leis da República Federativa do Brasil.
					Eventuais controvérsias serão resolvidas no foro do domicílio do
					consumidor, conforme prevê a legislação aplicável.
				</LegalParagraph>
			</LegalSection>

			<LegalSection index={10} title="Contato">
				<LegalParagraph>
					Dúvidas sobre estes Termos? Fale com a gente pelo e-mail{" "}
					<span className="font-medium text-foreground">{CONTACT_EMAIL}</span>.
				</LegalParagraph>
			</LegalSection>
		</LegalPage>
	);
}
