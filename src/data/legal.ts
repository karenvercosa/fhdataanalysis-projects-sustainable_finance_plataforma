// =====================================================================
//  DOCUMENTOS LEGAIS — Sustainable Finance Summit 2026
//  ATENÇÃO: textos-base de PROTÓTIPO. Precisam de revisão jurídica antes
//  de qualquer publicação — nomes, prazos e bases legais são exemplos.
// =====================================================================

export type LegalDocId = "termos" | "privacidade" | "cookies";

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  id: LegalDocId;
  title: string;
  updatedAt: string;
  summary: string;
  sections: LegalSection[];
}

/** Controlador dos dados e canal do encarregado (DPO), exigido pela LGPD. */
export const CONTROLADOR = {
  nome: "Sustainable Finance Summit 2026",
  cnpj: "00.000.000/0001-00",
  encarregado: "Encarregado de Dados (DPO)",
  email: "privacidade@sustainablefinance2026.com.br"
};

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  termos: {
    id: "termos",
    title: "Termos de Uso",
    updatedAt: "20/07/2026",
    summary: "Regras de acesso e uso da plataforma do evento.",
    sections: [
      {
        heading: "1. Aceitação",
        body: [
          "Ao criar uma conta ou utilizar a plataforma do Sustainable Finance Summit 2026, você declara ter lido e concordado com estes Termos de Uso e com a Política de Privacidade.",
          "Se você não concorda com qualquer condição, não utilize a plataforma."
        ]
      },
      {
        heading: "2. Conta e acesso",
        body: [
          "A conta é pessoal e intransferível. Você é responsável por manter suas credenciais em sigilo e por toda atividade realizada com elas.",
          "Os planos de acesso (Gratuito, Premium e ingressos Presenciais por voucher) definem quais recursos ficam disponíveis. Recursos exclusivos de membros podem ser alterados a critério da organização."
        ]
      },
      {
        heading: "3. Conteúdos e propriedade intelectual",
        body: [
          "Materiais, transmissões, relatórios e apresentações são protegidos por direitos autorais de seus respectivos autores, incluindo patrocinadores e palestrantes.",
          "O download é permitido para uso próprio. É vedada a redistribuição, revenda ou reprodução pública sem autorização expressa do titular."
        ]
      },
      {
        heading: "4. Conduta",
        body: [
          "É proibido usar a plataforma para assédio, discurso de ódio, spam, coleta automatizada de dados de outros participantes ou qualquer prática ilícita.",
          "A organização pode suspender ou encerrar contas que violem estas regras."
        ]
      },
      {
        heading: "5. Encerramento da conta",
        body: [
          "Você pode excluir sua conta a qualquer momento em Meu Perfil. A exclusão remove seus dados pessoais da plataforma, ressalvadas as informações que a organização deva reter por obrigação legal ou regulatória."
        ]
      },
      {
        heading: "6. Alterações e foro",
        body: [
          "Estes Termos podem ser atualizados; mudanças relevantes serão comunicadas na plataforma.",
          "Fica eleito o foro da comarca de Goiânia/GO para dirimir controvérsias."
        ]
      }
    ]
  },

  privacidade: {
    id: "privacidade",
    title: "Política de Privacidade",
    updatedAt: "20/07/2026",
    summary: "Como tratamos seus dados pessoais, conforme a LGPD (Lei 13.709/2018).",
    sections: [
      {
        heading: "1. Quem trata seus dados",
        body: [
          `Controlador: ${CONTROLADOR.nome}, CNPJ ${CONTROLADOR.cnpj}.`,
          `Contato do ${CONTROLADOR.encarregado}: ${CONTROLADOR.email}.`
        ]
      },
      {
        heading: "2. Dados que coletamos",
        body: [
          "Cadastro: nome, e-mail, telefone, empresa e cargo.",
          "Uso da plataforma: palestras assistidas, downloads realizados, pautas favoritadas e interesses selecionados.",
          "Credenciamento: código de credencial e registro de check-in no evento presencial.",
          "Cookies e identificadores do navegador, conforme a Política de Cookies."
        ]
      },
      {
        heading: "3. Para que usamos e com qual base legal",
        body: [
          "Execução do contrato: dar acesso à plataforma, emitir ingresso e credencial, viabilizar sua participação.",
          "Legítimo interesse: segurança, prevenção a fraudes e melhoria dos nossos serviços, sempre com avaliação de impacto e possibilidade de oposição.",
          "Consentimento: envio de comunicações de marketing e compartilhamento do seu perfil corporativo com patrocinadores. Você pode revogar a qualquer momento.",
          "Obrigação legal: guarda de registros exigida pela legislação aplicável."
        ]
      },
      {
        heading: "4. Compartilhamento com patrocinadores",
        body: [
          "Seus dados só são compartilhados com patrocinadores mediante consentimento específico ou quando você realiza uma ação que o pressupõe — como baixar um material de autoria de um patrocinador ou resgatar um voucher.",
          "Nesses casos, compartilhamos apenas dados corporativos: nome, cargo e empresa. Não compartilhamos seu histórico de navegação.",
          "Você é avisado no momento da ação e pode desistir antes de concluí-la."
        ]
      },
      {
        heading: "5. Retenção e segurança",
        body: [
          "Mantemos seus dados enquanto sua conta existir e por até 5 anos após o evento, para fins fiscais e de prestação de contas.",
          "Adotamos medidas técnicas e administrativas de proteção contra acesso não autorizado, perda ou alteração indevida."
        ]
      },
      {
        heading: "6. Seus direitos (art. 18 da LGPD)",
        body: [
          "Confirmar a existência de tratamento e acessar seus dados.",
          "Corrigir dados incompletos, inexatos ou desatualizados.",
          "Solicitar anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.",
          "Solicitar portabilidade e informação sobre com quem compartilhamos seus dados.",
          "Revogar consentimento e se opor a tratamentos baseados em legítimo interesse.",
          `Para exercer qualquer direito, escreva para ${CONTROLADOR.email}. Respondemos em até 15 dias.`
        ]
      }
    ]
  },

  cookies: {
    id: "cookies",
    title: "Política de Cookies",
    updatedAt: "20/07/2026",
    summary: "O que armazenamos no seu navegador e como você controla isso.",
    sections: [
      {
        heading: "1. O que são cookies",
        body: [
          "Cookies e tecnologias similares são pequenos arquivos gravados no seu navegador para lembrar preferências, manter sua sessão e medir o uso da plataforma."
        ]
      },
      {
        heading: "2. Categorias que utilizamos",
        body: [
          "Necessários: mantêm você autenticado, guardam sua agenda e suas preferências de acesso. Sem eles a plataforma não funciona, por isso não podem ser desativados.",
          "Analytics: medem páginas visitadas, palestras assistidas e downloads, de forma agregada, para melhorarmos o evento.",
          "Marketing: permitem medir campanhas e exibir comunicações mais relevantes sobre o Summit e seus patrocinadores."
        ]
      },
      {
        heading: "3. Como controlar",
        body: [
          "Você define suas preferências no banner de cookies ou a qualquer momento em Legal & Privacidade → Preferências de cookies.",
          "Também é possível bloquear ou apagar cookies nas configurações do seu navegador — nesse caso, partes da plataforma podem deixar de funcionar."
        ]
      }
    ]
  }
};

export const LEGAL_ORDER: LegalDocId[] = ["termos", "privacidade", "cookies"];

/** Registro do aceite feito no cadastro — evidência de consentimento. */
export const CONSENTIMENTO_KEY = "sf_consentimento";

/** Aviso padrão dos formulários de captação B2B. */
export const AVISO_FORMULARIO_B2B =
  "Ao enviar este formulário, você concorda que a equipe do Sustainable Finance Summit 2026 utilize seus dados corporativos para entrar em contato referente a esta solicitação.";
