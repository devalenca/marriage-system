import type { Metadata } from "next";
import {
	LegalList,
	LegalListItem,
	LegalPage,
	LegalParagraph,
	LegalSection,
} from "@/components/legal/legal-page";

export const metadata: Metadata = {
	title: "Política de Privacidade — Nosso Casamento",
	description:
		"Como o Nosso Casamento coleta, usa, armazena e protege seus dados, e quais são os seus direitos como titular sob a LGPD.",
};

const CONTACT_EMAIL = "contato@[dominio]";

export default function PrivacidadePage() {
	return (
		<LegalPage
			title="Política de Privacidade"
			subtitle="Esta Política explica, em linguagem simples, quais dados o Nosso Casamento coleta, para que os usamos, com quem os compartilhamos e quais são os seus direitos. Levamos a sério a privacidade do casal e seguimos a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018)."
			updatedAt="14 de julho de 2026"
		>
			<LegalSection index={1} title="Quais dados coletamos">
				<LegalParagraph>
					Coletamos apenas o necessário para o serviço funcionar. Em resumo:
				</LegalParagraph>
				<LegalList>
					<LegalListItem>
						<span className="font-medium">Dados de conta:</span> e-mail e senha
						(a senha é armazenada de forma cifrada, nunca em texto puro).
					</LegalListItem>
					<LegalListItem>
						<span className="font-medium">
							Dados do casamento, inseridos por você:
						</span>{" "}
						nomes do casal, data do casamento, locais de cerimônia e recepção,
						meta de orçamento, fornecedores, valores contratados, entradas,
						parcelas e datas de vencimento, tarefas do checklist e itens de
						inspiração.
					</LegalListItem>
					<LegalListItem>
						<span className="font-medium">
							Dados de convidados que você cadastrar:
						</span>{" "}
						por exemplo, nome e status de presença. Esses dados são de
						terceiros, então você deve cadastrá-los apenas quando tiver uma base
						legítima para isso.
					</LegalListItem>
					<LegalListItem>
						<span className="font-medium">Arquivos que você anexar:</span>{" "}
						contratos e comprovantes que você opte por enviar ao serviço.
					</LegalListItem>
					<LegalListItem>
						<span className="font-medium">Dados técnicos mínimos:</span>{" "}
						informações necessárias para manter sua sessão ativa e o serviço
						seguro e funcional.
					</LegalListItem>
				</LegalList>
				<LegalParagraph>
					Não pedimos dados sensíveis e recomendamos que você não cadastre
					informações desnecessárias no serviço.
				</LegalParagraph>
			</LegalSection>

			<LegalSection index={2} title="Para que usamos os dados">
				<LegalParagraph>
					Usamos seus dados exclusivamente para operar e melhorar o serviço:
				</LegalParagraph>
				<LegalList>
					<LegalListItem>
						Autenticar o acesso e manter a sua conta segura.
					</LegalListItem>
					<LegalListItem>
						Exibir seu painel, calcular totais (meta, previsto, fechado, pago,
						pendente) e lembrar prazos de pagamento e tarefas.
					</LegalListItem>
					<LegalListItem>
						Guardar o histórico do planejamento para que você acompanhe a
						evolução até o dia do casamento.
					</LegalListItem>
					<LegalListItem>
						Gerenciar o período de teste e, quando aplicável, a assinatura.
					</LegalListItem>
					<LegalListItem>Prestar suporte quando você solicitar.</LegalListItem>
				</LegalList>
			</LegalSection>

			<LegalSection index={3} title="Base legal">
				<LegalParagraph>
					Tratamos seus dados com fundamento na LGPD, principalmente para:
				</LegalParagraph>
				<LegalList>
					<LegalListItem>
						<span className="font-medium">Execução do contrato</span> — tratar
						os dados indispensáveis para entregar o serviço que você contratou
						(art. 7º, V).
					</LegalListItem>
					<LegalListItem>
						<span className="font-medium">Cumprimento de obrigação legal</span>{" "}
						— quando a lei nos exigir guardar certos registros (art. 7º, II).
					</LegalListItem>
					<LegalListItem>
						<span className="font-medium">Legítimo interesse</span> — para
						manter o serviço seguro e funcional, sempre respeitando seus
						direitos e expectativas (art. 7º, IX).
					</LegalListItem>
					<LegalListItem>
						<span className="font-medium">Consentimento</span> — quando
						eventualmente pedirmos, de forma clara e específica, para um uso que
						vá além do necessário para o serviço.
					</LegalListItem>
				</LegalList>
			</LegalSection>

			<LegalSection index={4} title="Compartilhamento">
				<LegalParagraph>
					Nós não vendemos seus dados e não os compartilhamos para fins de
					publicidade de terceiros. Compartilhamos informações apenas nas
					seguintes situações:
				</LegalParagraph>
				<LegalList>
					<LegalListItem>
						Com prestadores de infraestrutura que operam o serviço em nosso nome
						(por exemplo, o provedor de hospedagem e banco de dados), sob
						obrigação de confidencialidade e apenas na medida necessária.
					</LegalListItem>
					<LegalListItem>
						Quando exigido por lei, ordem judicial ou autoridade competente.
					</LegalListItem>
					<LegalListItem>
						Com o outro membro do casal, já que o casamento é compartilhado.
					</LegalListItem>
				</LegalList>
			</LegalSection>

			<LegalSection index={5} title="Armazenamento e segurança">
				<LegalParagraph>
					Os dados são armazenados na infraestrutura do Convex, nosso provedor
					de backend e banco de dados, que hospeda as informações e os arquivos
					enviados. Adotamos medidas técnicas e organizacionais razoáveis para
					proteger seus dados, como cifragem de senhas, controle de acesso por
					autenticação e transmissão por conexão segura.
				</LegalParagraph>
				<LegalParagraph>
					Guardamos seus dados enquanto sua conta existir. Se os servidores do
					provedor estiverem localizados fora do Brasil, a transferência
					internacional é feita com salvaguardas adequadas, conforme a LGPD.
				</LegalParagraph>
			</LegalSection>

			<LegalSection index={6} title="Seus direitos como titular">
				<LegalParagraph>
					A LGPD garante a você, entre outros, o direito de confirmar a
					existência do tratamento, acessar seus dados, corrigir informações
					incompletas ou desatualizadas, solicitar a exclusão e obter
					informações sobre o compartilhamento. Você pode exercer esses direitos
					assim:
				</LegalParagraph>
				<LegalList>
					<LegalListItem>
						<span className="font-medium">Acesso e correção:</span> a maior
						parte dos dados pode ser visualizada e editada diretamente no
						serviço, em <span className="font-medium">Ajustes</span> e nas telas
						de fornecedores, financeiro, convidados e checklist.
					</LegalListItem>
					<LegalListItem>
						<span className="font-medium">Exclusão:</span> o casal pode excluir
						permanentemente o casamento e todos os dados associados em{" "}
						<span className="font-medium">Ajustes</span>. A exclusão é
						definitiva.
					</LegalListItem>
					<LegalListItem>
						<span className="font-medium">Demais solicitações:</span> para
						qualquer outro pedido relativo aos seus dados, fale conosco pelo
						e-mail {CONTACT_EMAIL}.
					</LegalListItem>
				</LegalList>
			</LegalSection>

			<LegalSection index={7} title="Retenção e exclusão">
				<LegalParagraph>
					Mantemos seus dados apenas pelo tempo necessário para as finalidades
					descritas nesta Política. Quando você exclui o casamento, os dados
					associados são removidos de forma permanente do serviço. Podemos reter
					registros mínimos quando houver obrigação legal (por exemplo, fiscal),
					pelo prazo estritamente exigido, e depois eliminá-los.
				</LegalParagraph>
			</LegalSection>

			<LegalSection index={8} title="Crianças e adolescentes">
				<LegalParagraph>
					O serviço é destinado a maiores de 18 anos. Não coletamos
					intencionalmente dados de crianças e adolescentes.
				</LegalParagraph>
			</LegalSection>

			<LegalSection index={9} title="Alterações nesta Política">
				<LegalParagraph>
					Podemos atualizar esta Política para refletir melhorias no serviço ou
					mudanças legais. Quando a alteração for relevante, avisaremos por
					meios razoáveis. A data de "última atualização" no topo indica a
					versão vigente.
				</LegalParagraph>
			</LegalSection>

			<LegalSection index={10} title="Contato e encarregado (DPO)">
				<LegalParagraph>
					Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre
					em contato pelo e-mail{" "}
					<span className="font-medium text-foreground">{CONTACT_EMAIL}</span>.
					Responderemos no prazo previsto na legislação. Você também tem o
					direito de apresentar reclamação à Autoridade Nacional de Proteção de
					Dados (ANPD).
				</LegalParagraph>
			</LegalSection>
		</LegalPage>
	);
}
